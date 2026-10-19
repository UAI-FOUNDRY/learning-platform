from app.models import Notification
from tests.factories import auth, enroll, make_course, make_user

API = "/api/v1/qa"


def setup(db):
    inst = make_user(db, "instructor")
    a, b, outsider = make_user(db), make_user(db), make_user(db)
    course, lectures = make_course(db, inst)
    enroll(db, a, course)
    enroll(db, b, course, status="COMPLETED")
    return inst, a, b, outsider, course, lectures


def ask(client, user, course, title="How do loops work?", **extra):
    r = client.post(f"{API}/courses/{course.id}/questions", headers=auth(user),
                    json={"title": title, "body": "I am stuck on the second example.", **extra})
    assert r.status_code == 201, r.text
    return r.json()


def answer(client, user, qid, body="Try printing i.", parent=None):
    payload = {"body": body}
    if parent:
        payload["parent_answer_id"] = parent
    return client.post(f"{API}/questions/{qid}/answers", headers=auth(user), json=payload)


def notif_types(db, user):
    db.expire_all()
    return [n.type for n in db.query(Notification).filter_by(user_id=user.id).all()]


# ---------------------------------------------------------------- access
def test_only_participants_can_read_or_post(client, db_session):
    inst, a, b, outsider, course, _ = setup(db_session)
    q = ask(client, a, course)
    assert client.get(f"{API}/courses/{course.id}/questions", headers=auth(outsider)).status_code == 403
    assert client.get(f"{API}/courses/{course.id}/questions").status_code == 401
    assert client.post(f"{API}/courses/{course.id}/questions", headers=auth(outsider),
                       json={"title": "Hi", "body": "x"}).status_code == 403
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(outsider)).status_code == 403
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(make_user(db_session, "instructor"))).status_code == 403
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(make_user(db_session, "super_admin"))).status_code == 200
    # a completed learner can still take part
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(b)).status_code == 200


def test_ask_validates_and_links_lecture(client, db_session):
    inst, a, b, _, course, lectures = setup(db_session)
    q = ask(client, a, course, lecture_id=lectures[0].id)
    assert q["lecture_id"] == lectures[0].id and q["is_following"] is True and q["author_name"] == a.full_name
    other_course, other_lectures = make_course(db_session, inst)
    r = client.post(f"{API}/courses/{course.id}/questions", headers=auth(a),
                    json={"title": "t", "body": "b", "lecture_id": other_lectures[0].id})
    assert r.status_code == 400
    assert client.post(f"{API}/courses/{course.id}/questions", headers=auth(a), json={"title": " ", "body": "b"}).status_code == 422
    assert client.post(f"{API}/courses/nope/questions", headers=auth(a), json={"title": "t", "body": "b"}).status_code == 404


def test_instructor_is_notified_of_new_question(client, db_session):
    inst, a, _, _, course, _ = setup(db_session)
    ask(client, a, course)
    assert notif_types(db_session, inst) == ["qa_reply"]
    ask(client, inst, course, title="Instructor's own post")
    assert notif_types(db_session, inst) == ["qa_reply"]  # no self-notification


# ---------------------------------------------------------------- listing
def test_list_filters_and_sort(client, db_session):
    inst, a, b, _, course, lectures = setup(db_session)
    q1 = ask(client, a, course, title="Loops question", lecture_id=lectures[0].id)
    q2 = ask(client, b, course, title="Functions question")
    answer(client, inst, q1["id"])
    client.post(f"{API}/questions/{q1['id']}/resolve", headers=auth(a))

    get = lambda **p: [x["title"] for x in client.get(f"{API}/courses/{course.id}/questions", headers=auth(a), params=p).json()]
    assert get() == ["Functions question", "Loops question"]
    assert get(search="functions") == ["Functions question"]
    assert get(lecture_id=lectures[0].id) == ["Loops question"]
    assert get(resolved="true") == ["Loops question"] and get(resolved="false") == ["Functions question"]
    assert get(sort="unanswered") == ["Functions question"]
    assert get(sort="popular")[0] == "Loops question"
    assert get(mine="true") == ["Loops question"]
    assert client.get(f"{API}/courses/{course.id}/questions", headers=auth(a), params={"sort": "weird"}).status_code == 422
    row = next(x for x in client.get(f"{API}/courses/{course.id}/questions", headers=auth(a)).json() if x["id"] == q1["id"])
    assert row["answer_count"] == 1 and row["has_instructor_answer"] is True and row["is_resolved"] is True
    assert [x["id"] for x in client.get(f"{API}/my/questions", headers=auth(b)).json()] == [q2["id"]]


# ---------------------------------------------------------------- answers & threads
def test_answers_threads_and_ordering(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    peer = answer(client, b, q["id"], "Maybe use range().").json()["answers"][0]
    teacher = answer(client, inst, q["id"], "Here is the official explanation.").json()
    assert teacher["answer_count"] == 2
    top = teacher["answers"]
    assert [x["body"][:8] for x in top] == ["Here is ", "Maybe us"]          # instructor first
    assert top[0]["is_instructor_answer"] and top[0]["author_role"] == "instructor"

    reply = answer(client, a, q["id"], "Thanks, that worked!", parent=peer["id"]).json()
    peer_node = next(x for x in reply["answers"] if x["id"] == peer["id"])
    assert [r["body"] for r in peer_node["replies"]] == ["Thanks, that worked!"]
    assert reply["answer_count"] == 3
    # replies nest only one level
    nested = reply["answers"][0]["replies"][0] if reply["answers"][0]["replies"] else peer_node["replies"][0]
    assert answer(client, b, q["id"], "deeper", parent=nested["id"]).status_code == 400
    assert answer(client, b, q["id"], "ghost parent", parent="nope").status_code == 404
    assert answer(client, b, q["id"], "   ").status_code == 422


def test_highlight_moves_answer_to_top_and_is_staff_only(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    first = answer(client, b, q["id"], "peer answer").json()["answers"][0]
    answer(client, inst, q["id"], "teacher answer")
    assert client.post(f"{API}/answers/{first['id']}/highlight", headers=auth(a)).status_code == 403
    r = client.post(f"{API}/answers/{first['id']}/highlight", headers=auth(inst))
    assert r.status_code == 200 and r.json()["answers"][0]["id"] == first["id"] and r.json()["answers"][0]["is_highlighted"]


def test_upvotes_toggle_and_block_self_vote(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    ans = answer(client, b, q["id"]).json()["answers"][0]
    up = client.post(f"{API}/answers/{ans['id']}/upvote", headers=auth(a))
    assert up.json() == {"upvoted": True, "upvote_count": 1}
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).json()["answers"][0]["has_upvoted"] is True
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(inst)).json()["answers"][0]["has_upvoted"] is False
    assert client.post(f"{API}/answers/{ans['id']}/upvote", headers=auth(a)).json() == {"upvoted": False, "upvote_count": 0}
    assert client.post(f"{API}/answers/{ans['id']}/upvote", headers=auth(b)).status_code == 400


def test_edit_and_delete_rules(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    ans = answer(client, b, q["id"], "mine").json()["answers"][0]

    assert client.put(f"{API}/questions/{q['id']}", headers=auth(b), json={"title": "hijack"}).status_code == 403
    assert client.put(f"{API}/questions/{q['id']}", headers=auth(a), json={"title": "Edited"}).json()["title"] == "Edited"
    assert client.put(f"{API}/answers/{ans['id']}", headers=auth(a), json={"body": "x"}).status_code == 403
    assert client.put(f"{API}/answers/{ans['id']}", headers=auth(b), json={"body": "fixed"}).status_code == 200

    assert client.delete(f"{API}/answers/{ans['id']}", headers=auth(a)).status_code == 403
    assert client.delete(f"{API}/answers/{ans['id']}", headers=auth(inst)).status_code == 200   # instructor may
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).json()["answer_count"] == 0
    assert client.delete(f"{API}/questions/{q['id']}", headers=auth(b)).status_code == 403
    assert client.delete(f"{API}/questions/{q['id']}", headers=auth(a)).status_code == 200
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).status_code == 404


def test_resolve_follow_rules(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    assert client.post(f"{API}/questions/{q['id']}/resolve", headers=auth(b)).status_code == 403
    assert client.post(f"{API}/questions/{q['id']}/resolve", headers=auth(inst)).json()["is_resolved"] is True
    assert client.post(f"{API}/questions/{q['id']}/resolve", headers=auth(a), json={"is_resolved": False}).json()["is_resolved"] is False
    assert client.post(f"{API}/questions/{q['id']}/follow", headers=auth(b)).json()["is_following"] is True
    assert client.delete(f"{API}/questions/{q['id']}/follow", headers=auth(b)).json()["is_following"] is False


# ---------------------------------------------------------------- notifications
def test_reply_notifies_followers_and_parent_author_but_not_the_writer(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    client.post(f"{API}/questions/{q['id']}/follow", headers=auth(b))
    answer(client, inst, q["id"], "Official answer")
    assert notif_types(db_session, a).count("qa_reply") == 1       # question author
    assert notif_types(db_session, b).count("qa_reply") == 1       # follower
    assert notif_types(db_session, inst).count("qa_reply") == 1    # only the "new question" one, not self


# ---------------------------------------------------------------- moderation
def test_instructor_hides_and_restores_content(client, db_session):
    inst, a, b, _, course, _ = setup(db_session)
    q = ask(client, a, course)
    ans = answer(client, b, q["id"], "rude answer").json()["answers"][0]

    assert client.patch(f"{API}/answers/{ans['id']}/moderate", headers=auth(a), json={"status": "hidden"}).status_code == 403
    r = client.patch(f"{API}/answers/{ans['id']}/moderate", headers=auth(inst), json={"status": "hidden"})
    assert r.status_code == 200 and r.json()["answer_count"] == 0
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).json()["answers"] == []          # learner doesn't see it
    assert len(client.get(f"{API}/questions/{q['id']}", headers=auth(inst)).json()["answers"]) == 1  # staff does
    client.patch(f"{API}/answers/{ans['id']}/moderate", headers=auth(inst), json={"status": "visible"})
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).json()["answer_count"] == 1

    client.patch(f"{API}/questions/{q['id']}/moderate", headers=auth(inst), json={"status": "hidden"})
    assert client.get(f"{API}/questions/{q['id']}", headers=auth(a)).status_code == 404
    assert client.get(f"{API}/courses/{course.id}/questions", headers=auth(a)).json() == []
    staff_view = client.get(f"{API}/courses/{course.id}/questions", headers=auth(inst), params={"status": "hidden"}).json()
    assert [x["id"] for x in staff_view] == [q["id"]]
    assert client.patch(f"{API}/questions/{q['id']}/moderate", headers=auth(a), json={"status": "visible"}).status_code == 404
    assert client.patch(f"{API}/questions/{q['id']}/moderate", headers=auth(inst), json={"status": "banana"}).status_code == 422
