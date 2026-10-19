import json

import httpx
import pytest

from app.config.settings import settings
from app.models.coding import CodingExercise, CodingSubmission, CodingTestCase
from app.models.platform_setting import PlatformSetting
from app.services.ai_provider import AIUnavailable, AnthropicProvider, FakeProvider, ai_provider
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"
A = f"{API}/ai"


@pytest.fixture(autouse=True)
def fake_ai(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "fake")
    FakeProvider.calls = []
    ai_provider.backend = None
    yield


def _enable(db, limit=30, enabled=True):
    for key, value, cat in (("ai.enabled", enabled, "ai"), ("ai.daily_message_limit", limit, "ai")):
        row = db.get(PlatformSetting, key)
        if row:
            row.value = value
        else:
            db.add(PlatformSetting(key=key, value=value, category=cat))
    db.commit()


@pytest.fixture
def world(db_session):
    _enable(db_session)
    teacher, admin = make_user(db_session, "instructor"), make_user(db_session, "super_admin")
    learner, stranger = make_user(db_session), make_user(db_session)
    course, lectures = make_course(db_session, teacher)
    enroll(db_session, learner, course)
    return dict(teacher=teacher, admin=admin, learner=learner, stranger=stranger, course=course, lectures=lectures)


def _conv(client, user, **body):
    return client.post(f"{A}/conversations", headers=auth(user), json=body)


def test_status_reflects_switches(client, db_session, world):
    w = world
    st = client.get(f"{A}/status", headers=auth(w["learner"])).json()
    assert st["enabled"] is True and st["provider"] == "fake" and st["used_today"] == 0 and st["daily_limit"] == 30
    _enable(db_session, enabled=False)
    st = client.get(f"{A}/status", headers=auth(w["learner"])).json()
    assert st["enabled"] is False and "turned off" in st["reason"]
    assert _conv(client, w["learner"]).status_code == 503
    _enable(db_session, enabled=True)
    ai_provider.backend = None
    settings.AI_PROVIDER = "disabled"
    assert "not set up" in client.get(f"{A}/status", headers=auth(w["learner"])).json()["reason"]
    assert client.get(f"{A}/status").status_code == 401


def test_chat_roundtrip_and_history(client, world):
    w = world
    conv = _conv(client, w["learner"], assistant_type="learning").json()
    r = client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "What is a loop?"})
    assert r.status_code == 200
    body = r.json()
    assert body["assistant_message"]["content"] == "echo: What is a loop?" and body["messages_left_today"] == 29
    client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "And a function?"})
    sent = FakeProvider.calls[-1]["messages"]
    assert [m["role"] for m in sent] == ["user", "assistant", "user"] and sent[-1]["content"] == "And a function?"
    detail = client.get(f"{A}/conversations/{conv['id']}", headers=auth(w["learner"])).json()
    assert detail["title"] == "What is a loop?" and len(detail["messages"]) == 4
    assert client.get(f"{A}/conversations/{conv['id']}", headers=auth(w["stranger"])).status_code == 404
    assert client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["stranger"]), json={"content": "hi"}).status_code == 404
    assert len(client.get(f"{A}/conversations", headers=auth(w["learner"])).json()) == 1
    assert client.get(f"{A}/conversations", headers=auth(w["stranger"])).json() == []
    assert client.delete(f"{A}/conversations/{conv['id']}", headers=auth(w["stranger"])).status_code == 404
    assert client.delete(f"{A}/conversations/{conv['id']}", headers=auth(w["learner"])).status_code == 200
    assert client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "x"}).status_code == 404


def test_message_validation_and_daily_limit(client, db_session, world):
    w = world
    _enable(db_session, limit=2)
    conv = _conv(client, w["learner"]).json()
    url = f"{A}/conversations/{conv['id']}/messages"
    assert client.post(url, headers=auth(w["learner"]), json={"content": "  "}).status_code == 422
    assert client.post(url, headers=auth(w["learner"]), json={"content": "x" * 4001}).status_code == 422
    assert client.post(url, headers=auth(w["learner"]), json={"content": "one"}).json()["messages_left_today"] == 1
    assert client.post(url, headers=auth(w["learner"]), json={"content": "two"}).json()["messages_left_today"] == 0
    assert client.post(url, headers=auth(w["learner"]), json={"content": "three"}).status_code == 429
    assert client.get(f"{A}/status", headers=auth(w["learner"])).json()["used_today"] == 2
    _enable(db_session, limit=0)       # 0 = unlimited
    assert client.post(url, headers=auth(w["learner"]), json={"content": "four"}).status_code == 200


def test_context_requires_access_and_is_in_the_prompt(client, world):
    w = world
    lecture = w["lectures"][0]
    assert _conv(client, w["stranger"], context_type="lecture", context_id=lecture.id).status_code == 403
    assert _conv(client, w["learner"], context_type="lecture", context_id="nope").status_code == 404
    assert _conv(client, w["learner"], context_type="lecture").status_code == 400
    conv = _conv(client, w["learner"], context_type="lecture", context_id=lecture.id).json()
    client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "Explain this"})
    system = FakeProvider.calls[-1]["system"]
    assert lecture.title in system and w["course"].title in system and "<context>" in system
    assert _conv(client, w["stranger"], context_type="course", context_id=w["course"].id).status_code == 201   # published: public info


def test_access_is_rechecked_on_every_message(client, world, db_session):
    w = world
    conv = _conv(client, w["learner"], context_type="lecture", context_id=w["lectures"][0].id).json()
    from app.models import Enrollment
    db_session.query(Enrollment).filter_by(user_id=w["learner"].id).delete()
    db_session.commit()
    assert client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "hi"}).status_code == 403


def test_instructor_assistant_is_for_staff(client, world):
    w = world
    assert _conv(client, w["learner"], assistant_type="instructor").status_code == 403
    assert _conv(client, w["teacher"], assistant_type="instructor", context_type="course", context_id=w["course"].id).status_code == 201
    assert _conv(client, w["learner"], assistant_type="wizard").status_code == 422


def test_coding_context_never_leaks_solution_or_hidden_cases(client, world, db_session):
    w = world
    ex = CodingExercise(course_id=w["course"].id, title="Sum", problem_statement="Add numbers", language="python",
                        solution_code="SECRET_SOLUTION = 42", status="published", sample_input="1 2", sample_output="3")
    db_session.add(ex)
    db_session.flush()
    db_session.add_all([
        CodingTestCase(exercise_id=ex.id, input="1 2", expected_output="3", is_hidden=False),
        CodingTestCase(exercise_id=ex.id, input="HIDDEN_INPUT", expected_output="HIDDEN_OUTPUT", is_hidden=True)])
    db_session.add(CodingSubmission(exercise_id=ex.id, user_id=w["learner"].id, kind="submit", language="python",
                                    source_code="print('mine')", status="wrong_answer", stderr="boom"))
    db_session.commit()
    conv = _conv(client, w["learner"], assistant_type="coding", context_type="coding_exercise", context_id=ex.id).json()
    client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "Help"})
    system = FakeProvider.calls[-1]["system"]
    assert "print('mine')" in system and "boom" in system and "NOT solved" in system
    assert "SECRET_SOLUTION" not in system and "HIDDEN_INPUT" not in system and "HIDDEN_OUTPUT" not in system
    assert _conv(client, w["stranger"], assistant_type="coding", context_type="coding_exercise", context_id=ex.id).status_code == 403
    sub_id = db_session.query(CodingSubmission).first().id
    assert _conv(client, w["stranger"], assistant_type="coding", context_type="coding_submission", context_id=sub_id).status_code == 403
    ex.status = "draft"
    db_session.commit()
    assert _conv(client, w["learner"], assistant_type="coding", context_type="coding_exercise", context_id=ex.id).status_code == 404


def test_provider_outage_is_a_503_and_does_not_count(client, world):
    w = world

    class Down:
        name = "down"
        def complete(self, system, messages): raise AIUnavailable("The AI assistant is busy. Try again in a moment.")

    conv = _conv(client, w["learner"]).json()
    ai_provider.backend = Down()
    r = client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "hi"})
    assert r.status_code == 503 and "busy" in r.json()["detail"]
    assert client.get(f"{A}/conversations/{conv['id']}", headers=auth(w["learner"])).json()["messages"] == []
    assert client.get(f"{A}/status", headers=auth(w["learner"])).json()["used_today"] == 0
    ai_provider.backend = None


def test_usage_report_is_admin_only(client, world):
    w = world
    conv = _conv(client, w["learner"]).json()
    client.post(f"{A}/conversations/{conv['id']}/messages", headers=auth(w["learner"]), json={"content": "hi"})
    assert client.get(f"{A}/usage", headers=auth(w["learner"])).status_code == 403
    usage = client.get(f"{A}/usage", headers=auth(w["admin"])).json()
    assert usage["answers"] == 1 and usage["input_tokens"] == 10 and usage["output_tokens"] == 5 and usage["active_users"] == 1


def test_anthropic_adapter(monkeypatch):
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "sk-test")
    monkeypatch.setattr(settings, "AI_MODEL", "claude-haiku-5-5")
    seen = {}

    def handler(request):
        seen["headers"], seen["body"], seen["url"] = dict(request.headers), json.loads(request.content), str(request.url)
        return httpx.Response(200, json={"model": "claude-haiku-5-5", "content": [{"type": "text", "text": "Hello "}, {"type": "text", "text": "there"}],
                                         "usage": {"input_tokens": 12, "output_tokens": 3}})

    reply = AnthropicProvider(transport=httpx.MockTransport(handler)).complete("be nice", [{"role": "user", "content": "hi"}])
    assert reply.text == "Hello there" and (reply.input_tokens, reply.output_tokens) == (12, 3)
    assert seen["url"] == "https://api.anthropic.com/v1/messages" and seen["headers"]["x-api-key"] == "sk-test"
    assert seen["headers"]["anthropic-version"] == "2023-06-01"
    assert seen["body"]["system"] == "be nice" and seen["body"]["model"] == "claude-haiku-5-5" and seen["body"]["max_tokens"] == settings.AI_MAX_OUTPUT_TOKENS

    for code, expected in ((429, "busy"), (500, "problem")):
        provider = AnthropicProvider(transport=httpx.MockTransport(lambda r, c=code: httpx.Response(c, text="x")))
        with pytest.raises(AIUnavailable, match=expected):
            provider.complete("s", [{"role": "user", "content": "hi"}])
    def refuse(request): raise httpx.ConnectError("down")
    with pytest.raises(AIUnavailable):
        AnthropicProvider(transport=httpx.MockTransport(refuse)).complete("s", [{"role": "user", "content": "hi"}])
    monkeypatch.setattr(settings, "ANTHROPIC_API_KEY", "")
    with pytest.raises(AIUnavailable):
        AnthropicProvider().complete("s", [{"role": "user", "content": "hi"}])
