import base64
import json
from datetime import datetime, timedelta

import httpx
import pytest

from app.models.coding import CodingSubmission
from app.services.code_runner import (
    COMPILE_ERROR, DisabledRunner, Judge0Runner, LocalRunner, RunResult, RunnerUnavailable, code_runner,
)
from app.config.settings import settings
from app.services.coding_service import coding_service
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1"
C = f"{API}/coding"

ADD = "a, b = map(int, input().split())\nprint(a + b)\n"
WRONG = "print(0)\n"


@pytest.fixture(autouse=True)
def local_runner():
    code_runner.backend = LocalRunner()
    yield
    code_runner.backend = None


@pytest.fixture
def world(db_session):
    teacher, other, admin = make_user(db_session, "instructor"), make_user(db_session, "instructor"), make_user(db_session, "super_admin")
    learner, learner2, stranger = make_user(db_session), make_user(db_session), make_user(db_session)
    course, lectures = make_course(db_session, teacher)
    enroll(db_session, learner, course)
    enroll(db_session, learner2, course)
    return dict(teacher=teacher, other=other, admin=admin, learner=learner, learner2=learner2, stranger=stranger,
                course=course, lectures=lectures)


def _exercise(client, w, publish=True, **extra):
    body = {"title": "Add two numbers", "problem_statement": "Read a and b, print a+b.", "language": "python",
            "starter_code": "# write code", "solution_code": ADD, "sample_input": "1 2", "sample_output": "3",
            "difficulty": "easy", "hints": ["Use map", "Use int()"], "explanation": "Just add them.", **extra}
    r = client.post(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["teacher"]), json=body)
    assert r.status_code == 201, r.text
    ex = r.json()
    for inp, out, hidden, weight in (("1 2", "3", False, 1), ("10 20", "30", True, 1), ("-5 5", "0", True, 2)):
        c = client.post(f"{C}/exercises/{ex['id']}/test-cases", headers=auth(w["teacher"]),
                        json={"input": inp, "expected_output": out, "is_hidden": hidden, "weight": weight})
        assert c.status_code == 201
    if publish:
        r = client.put(f"{C}/exercises/{ex['id']}", headers=auth(w["teacher"]), json={"status": "published"})
        assert r.status_code == 200 and r.json()["status"] == "published"
    return ex["id"]


def _solve(client, user, ex_id, code, kind="submit", **extra):
    r = client.post(f"{C}/exercises/{ex_id}/{kind}", headers=auth(user), json={"source_code": code, **extra})
    assert r.status_code == 202, r.text
    sub = client.get(f"{C}/submissions/{r.json()['id']}", headers=auth(user))
    assert sub.status_code == 200
    return sub.json()


def test_authoring_permissions(client, world):
    w = world
    body = {"title": "T", "problem_statement": "P"}
    url = f"{C}/courses/{w['course'].id}/exercises"
    for who in ("learner", "stranger", "other"):
        assert client.post(url, headers=auth(w[who]), json=body).status_code == 403
    assert client.post(url, json=body).status_code == 401
    assert client.post(url, headers=auth(w["admin"]), json=body).status_code == 201
    assert client.post(url, headers=auth(w["teacher"]), json={**body, "language": "cobol"}).status_code == 422
    assert client.post(url, headers=auth(w["teacher"]), json={**body, "time_limit_ms": 5}).status_code == 422
    assert client.post(url, headers=auth(w["teacher"]), json={**body, "lecture_id": "nope"}).status_code == 400
    ok = client.post(url, headers=auth(w["teacher"]), json={**body, "lecture_id": w["lectures"][0].id})
    assert ok.status_code == 201 and ok.json()["status"] == "draft"


def test_publish_needs_a_test_case_and_learners_see_only_published(client, world):
    w = world
    ex = client.post(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["teacher"]),
                     json={"title": "T", "problem_statement": "P"}).json()
    assert client.put(f"{C}/exercises/{ex['id']}", headers=auth(w["teacher"]), json={"status": "published"}).status_code == 409
    assert client.get(f"{C}/exercises/{ex['id']}", headers=auth(w["learner"])).status_code == 404       # draft is invisible
    assert client.get(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["learner"])).json() == []
    assert len(client.get(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["teacher"])).json()) == 1


def test_learner_view_hides_solution_and_hidden_cases(client, world):
    w = world
    ex_id = _exercise(client, w)
    view = client.get(f"{C}/exercises/{ex_id}", headers=auth(w["learner"])).json()
    assert "solution_code" not in view and view["hints_count"] == 2 and view["explanation"] is None
    assert [c["input"] for c in view["sample_test_cases"]] == ["1 2"]
    assert [c["input"] for c in client.get(f"{C}/exercises/{ex_id}/test-cases", headers=auth(w["learner"])).json()] == ["1 2"]
    staff = client.get(f"{C}/exercises/{ex_id}", headers=auth(w["teacher"])).json()
    assert staff["solution_code"] == ADD and len(staff["test_cases"]) == 3
    assert len(client.get(f"{C}/exercises/{ex_id}/test-cases", headers=auth(w["teacher"])).json()) == 3
    assert client.get(f"{C}/exercises/{ex_id}", headers=auth(w["stranger"])).status_code == 403
    assert client.get(f"{C}/exercises/{ex_id}", headers=auth(w["other"])).status_code == 403
    assert client.get(f"{C}/exercises/{ex_id}/hints/2", headers=auth(w["learner"])).json()["hint"] == "Use int()"
    assert client.get(f"{C}/exercises/{ex_id}/hints/3", headers=auth(w["learner"])).status_code == 404
    assert client.put(f"{C}/exercises/{ex_id}/test-cases/x", headers=auth(w["learner"]), json={}).status_code == 403


def test_run_with_custom_input(client, world):
    w = world
    ex_id = _exercise(client, w)
    sub = _solve(client, w["learner"], ex_id, ADD, kind="run", custom_input="7 8")
    assert sub["status"] == "accepted" and sub["stdout"].strip() == "15" and sub["kind"] == "run"
    default = _solve(client, w["learner"], ex_id, ADD, kind="run")           # falls back to the sample input
    assert default["stdout"].strip() == "3"
    err = _solve(client, w["learner"], ex_id, "print(1/0)", kind="run")
    assert err["status"] == "runtime_error" and "ZeroDivisionError" in err["stderr"]


def test_correct_submission_scores_full_marks_and_unlocks_explanation(client, world):
    w = world
    ex_id = _exercise(client, w)
    sub = _solve(client, w["learner"], ex_id, ADD)
    assert sub["status"] == "accepted" and sub["score"] == 100 and sub["passed_count"] == 3 and sub["total_count"] == 3
    assert [r["status"] for r in sub["results"]] == ["accepted"] * 3
    view = client.get(f"{C}/exercises/{ex_id}", headers=auth(w["learner"])).json()
    assert view["solved"] is True and view["best_score"] == 100 and view["explanation"] == "Just add them."
    listing = client.get(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["learner"])).json()
    assert listing[0]["solved"] is True and listing[0]["best_score"] == 100
    assert client.get(f"{API}/gamification/me", headers=auth(w["learner"])).json()["total_points"] == 25
    _solve(client, w["learner"], ex_id, ADD)       # solving again earns nothing more
    assert client.get(f"{API}/gamification/me", headers=auth(w["learner"])).json()["total_points"] == 25
    me = client.get(f"{API}/gamification/me", headers=auth(w["learner"])).json()
    assert me["coding_streak"]["current"] == 1


def test_wrong_answer_partial_score_and_hidden_case_masking(client, world):
    w = world
    ex_id = _exercise(client, w)
    # prints a+b except when the sum is 0 (the heavy hidden case, weight 2)
    code = "a, b = map(int, input().split())\nprint(a + b if a + b else 99)\n"
    sub = _solve(client, w["learner"], ex_id, code)
    assert sub["status"] == "wrong_answer" and sub["passed_count"] == 2 and sub["failed_count"] == 1
    assert sub["score"] == 50                       # weights 1+1 of 4
    visible, hidden_ok, hidden_bad = sub["results"]
    assert visible["input"] == "1 2" and visible["expected_output"] == "3"
    assert hidden_bad["is_hidden"] and hidden_bad["status"] == "wrong_answer"
    assert hidden_bad["input"] is None and hidden_bad["expected_output"] is None and hidden_bad["actual_output"] is None
    staff = client.get(f"{C}/submissions/{sub['id']}", headers=auth(w["teacher"])).json()
    assert staff["results"][2]["expected_output"] == "0" and staff["results"][2]["actual_output"].strip() == "99"
    assert client.get(f"{C}/exercises/{ex_id}", headers=auth(w["learner"])).json()["explanation"] is None


def test_trailing_whitespace_does_not_matter(client, world):
    w = world
    ex_id = _exercise(client, w)
    sub = _solve(client, w["learner"], ex_id, "a,b=map(int,input().split())\nprint(str(a+b)+'   ')\nprint()\n")
    assert sub["status"] == "accepted"


def test_runtime_error_time_limit_and_compile_style_failures(client, world):
    w = world
    ex_id = _exercise(client, w, time_limit_ms=300)
    crash = _solve(client, w["learner"], ex_id, "import sys\nsys.exit(3)\n")
    assert crash["status"] == "runtime_error" and crash["score"] == 0
    slow = _solve(client, w["learner"], ex_id, "while True:\n    pass\n")
    assert slow["status"] == "time_limit_exceeded"
    syntax = _solve(client, w["learner"], ex_id, "def (:\n")
    assert syntax["status"] == "runtime_error" and "SyntaxError" in (syntax["results"][0]["error_message"] or "")


def test_access_rules_for_running_code(client, world):
    w = world
    ex_id = _exercise(client, w)
    body = {"source_code": ADD}
    assert client.post(f"{C}/exercises/{ex_id}/submit", headers=auth(w["stranger"]), json=body).status_code == 403
    assert client.post(f"{C}/exercises/{ex_id}/submit", json=body).status_code == 401
    assert client.post(f"{C}/exercises/{ex_id}/submit", headers=auth(w["learner"]), json={"source_code": "  "}).status_code == 400
    assert client.post(f"{C}/exercises/{ex_id}/submit", headers=auth(w["learner"]), json={**body, "language": "java"}).status_code == 400
    big = {"source_code": "x=1\n" * 40000}
    assert client.post(f"{C}/exercises/{ex_id}/submit", headers=auth(w["learner"]), json=big).status_code == 413
    sub = _solve(client, w["learner"], ex_id, ADD)
    assert client.get(f"{C}/submissions/{sub['id']}", headers=auth(w["learner2"])).status_code == 404     # not yours
    assert client.get(f"{C}/submissions/{sub['id']}", headers=auth(w["other"])).status_code == 404
    assert client.get(f"{C}/submissions/{sub['id']}", headers=auth(w["admin"])).status_code == 200
    mine = client.get(f"{C}/exercises/{ex_id}/submissions", headers=auth(w["learner2"])).json()
    assert mine == []
    allsubs = client.get(f"{C}/exercises/{ex_id}/submissions", headers=auth(w["teacher"])).json()
    assert len(allsubs) == 1
    assert client.get(f"{C}/exercises/{ex_id}/submissions?user_id={w['learner'].id}&kind=run", headers=auth(w["teacher"])).json() == []


def test_runner_disabled_language_switch_and_rate_limit(client, world, db_session):
    w = world
    ex_id = _exercise(client, w)
    code_runner.backend = DisabledRunner()
    r = client.post(f"{C}/exercises/{ex_id}/submit", headers=auth(w["learner"]), json={"source_code": ADD})
    assert r.status_code == 503
    status = client.get(f"{C}/runner", headers=auth(w["learner"])).json()
    assert status["available"] is False and status["runner"] == "disabled"
    code_runner.backend = LocalRunner()
    assert "python" in client.get(f"{C}/runner", headers=auth(w["learner"])).json()["languages"]

    from app.models.platform_setting import PlatformSetting
    db_session.add(PlatformSetting(key="courses.coding_languages_enabled", value=["java"], category="courses"))
    db_session.commit()
    assert client.post(f"{C}/exercises/{ex_id}/run", headers=auth(w["learner"]), json={"source_code": ADD}).status_code == 400
    db_session.query(PlatformSetting).filter_by(key="courses.coding_languages_enabled").update({"value": ["python"]})
    db_session.add(PlatformSetting(key="coding.submissions_per_minute", value=2, category="coding"))
    db_session.commit()
    for _ in range(2):
        assert client.post(f"{C}/exercises/{ex_id}/run", headers=auth(w["learner"]), json={"source_code": "print(1)"}).status_code == 202
    assert client.post(f"{C}/exercises/{ex_id}/run", headers=auth(w["learner"]), json={"source_code": "print(1)"}).status_code == 429
    assert client.post(f"{C}/exercises/{ex_id}/run", headers=auth(w["learner2"]), json={"source_code": "print(1)"}).status_code == 202


def test_drafts(client, world):
    w = world
    ex_id = _exercise(client, w)
    assert client.get(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner"])).json()["source_code"] == "# write code"
    r = client.put(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner"]), json={"source_code": "print('wip')"})
    assert r.status_code == 200
    client.put(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner"]), json={"source_code": "print('v2')"})
    assert client.get(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner"])).json()["source_code"] == "print('v2')"
    assert client.get(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner2"])).json()["source_code"] == "# write code"
    assert client.put(f"{C}/exercises/{ex_id}/draft", headers=auth(w["learner"]),
                      json={"source_code": "x", "language": "java"}).status_code == 400


def test_delete_archives_when_there_is_history(client, world):
    w = world
    fresh = _exercise(client, w, publish=False)
    assert client.delete(f"{C}/exercises/{fresh}", headers=auth(w["teacher"])).json()["message"] == "Exercise deleted"
    used = _exercise(client, w)
    _solve(client, w["learner"], used, ADD)
    assert client.delete(f"{C}/exercises/{used}", headers=auth(w["other"])).status_code == 403
    assert client.delete(f"{C}/exercises/{used}", headers=auth(w["teacher"])).json()["message"] == "Exercise archived"
    assert client.get(f"{C}/exercises/{used}", headers=auth(w["learner"])).status_code == 404
    assert client.get(f"{C}/exercises/{used}", headers=auth(w["teacher"])).json()["status"] == "archived"


def test_stats(client, world):
    w = world
    ex_id = _exercise(client, w)
    _solve(client, w["learner"], ex_id, WRONG)
    _solve(client, w["learner"], ex_id, ADD)
    _solve(client, w["learner2"], ex_id, WRONG)
    st = client.get(f"{C}/exercises/{ex_id}/stats", headers=auth(w["teacher"])).json()
    assert st["submissions"] == 3 and st["learners_attempted"] == 2 and st["learners_solved"] == 1
    assert st["acceptance_rate_percent"] == 50.0 and st["status_breakdown"] == {"wrong_answer": 2, "accepted": 1}
    assert client.get(f"{C}/exercises/{ex_id}/stats", headers=auth(w["learner"])).status_code == 403


def test_published_course_edits_follow_the_reopen_rule(client, world, db_session):
    from app.models.platform_setting import PlatformSetting
    w = world
    db_session.query(PlatformSetting).filter_by(key="courses.reapproval_on_published_edit").update({"value": True})
    db_session.commit()
    r = client.post(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["teacher"]),
                    json={"title": "T", "problem_statement": "P"})
    assert r.status_code == 409
    assert client.post(f"{C}/courses/{w['course'].id}/exercises", headers=auth(w["admin"]),
                       json={"title": "T", "problem_statement": "P"}).status_code == 201


def test_runner_crash_is_reported_not_raised(client, world):
    w = world

    class Broken:
        name = "broken"
        def supports(self, language): return True
        def execute(self, *a): raise RunnerUnavailable("Judge0 is down")

    ex_id = _exercise(client, w)
    code_runner.backend = Broken()
    sub = _solve(client, w["learner"], ex_id, ADD)
    assert sub["status"] == "internal_error" and "down" in sub["stderr"]


def test_requeue_stuck_submissions(client, world, db_session):
    w = world
    ex_id = _exercise(client, w)
    old = CodingSubmission(exercise_id=ex_id, user_id=w["learner"].id, kind="submit", language="python",
                           source_code=ADD, status="running", created_at=datetime.utcnow() - timedelta(minutes=10))
    fresh = CodingSubmission(exercise_id=ex_id, user_id=w["learner"].id, kind="submit", language="python",
                             source_code=ADD, status="queued")
    db_session.add_all([old, fresh])
    db_session.commit()
    ids = coding_service.requeue_stuck(db_session, older_than_seconds=120)
    assert ids == [old.id]
    coding_service.evaluate(old.id)
    db_session.refresh(old)
    assert old.status == "accepted" and old.score == 100


# ------------------------------------------------------------------ Judge0 adapter
def _b64(text):
    return base64.b64encode(text.encode()).decode()


def test_judge0_adapter_maps_results(monkeypatch):
    monkeypatch.setattr(settings, "JUDGE0_URL", "https://judge.example")
    monkeypatch.setattr(settings, "JUDGE0_AUTH_TOKEN", "tok")
    seen = {}

    def handler(request):
        seen["payload"] = json.loads(request.content)
        seen["headers"] = dict(request.headers)
        seen["url"] = str(request.url)
        return httpx.Response(200, json=response["body"])

    runner = Judge0Runner(transport=httpx.MockTransport(handler))

    response = {"body": {"status": {"id": 3}, "stdout": _b64("42\n"), "time": "0.012", "memory": 3000}}
    out = runner.execute("python", "print(42)", "in", 2000, 256)
    assert (out.status, out.stdout, out.time_ms, out.memory_kb) == ("accepted", "42\n", 12, 3000)
    assert seen["payload"]["language_id"] == 71 and base64.b64decode(seen["payload"]["source_code"]) == b"print(42)"
    assert seen["payload"]["cpu_time_limit"] == 2.0 and seen["payload"]["memory_limit"] == 256 * 1024
    assert seen["headers"]["x-auth-token"] == "tok" and "wait=true" in seen["url"] and "base64_encoded=true" in seen["url"]

    response["body"] = {"status": {"id": 6}, "compile_output": _b64("error: expected ;")}
    out = runner.execute("c", "int main(", "", 2000, 256)
    assert out.status == COMPILE_ERROR and "expected" in out.stderr
    response["body"] = {"status": {"id": 5}, "time": "2.0"}
    assert runner.execute("python", "x", "", 2000, 256).status == "time_limit_exceeded"
    response["body"] = {"status": {"id": 11}, "stderr": _b64("Traceback...")}
    out = runner.execute("python", "x", "", 2000, 256)
    assert out.status == "runtime_error" and "Traceback" in out.stderr
    response["body"] = {"status": {"id": 13}, "message": _b64("boom")}
    assert runner.execute("python", "x", "", 2000, 256).status == "internal_error"


def test_judge0_unreachable_and_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "JUDGE0_URL", "https://judge.example")

    def boom(request):
        raise httpx.ConnectError("down")

    out = Judge0Runner(transport=httpx.MockTransport(boom)).execute("python", "x", "", 1000, 128)
    assert out.status == "internal_error" and "not available" in out.stderr
    monkeypatch.setattr(settings, "JUDGE0_URL", "")
    with pytest.raises(RunnerUnavailable):
        Judge0Runner().execute("python", "x", "", 1000, 128)


def test_runner_selection_from_settings(monkeypatch):
    code_runner.backend = None
    for mode, name in (("disabled", "disabled"), ("judge0", "judge0"), ("local", "local"), ("whatever", "disabled")):
        monkeypatch.setattr(settings, "CODE_RUNNER", mode)
        assert code_runner.name == name
    monkeypatch.setattr(settings, "CODE_RUNNER", "disabled")
    assert code_runner.available() is False
