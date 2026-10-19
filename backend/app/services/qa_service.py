"""Course Q&A: questions, threaded answers, votes, follows, moderation.

Who may take part in a course discussion: learners enrolled in it (active or completed),
the course's instructor, and Super Admins. Everyone else gets 403/404.
"""
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, Lecture, Section, User
from app.models.qa import QAAnswer, QAAnswerVote, QAQuestion, QAQuestionFollow
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service


def _is_staff_of(user: User, course: Course) -> bool:
    return user.role == "super_admin" or (user.role == "instructor" and course.instructor_id == user.id)


class QAService:
    # ------------------------------------------------------------------ access
    def _course(self, db: Session, course_id: str) -> Course:
        course = db.query(Course).filter(Course.id == course_id).first()
        if course is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Course not found")
        return course

    def _assert_participant(self, db: Session, course: Course, user: User) -> None:
        if _is_staff_of(user, course):
            return
        if user.role == "learner":
            enrolled = db.query(Enrollment.id).filter(
                Enrollment.user_id == user.id, Enrollment.course_id == course.id,
                Enrollment.status.in_(["ACTIVE", "COMPLETED"]),
            ).first()
            if enrolled:
                return
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only enrolled learners and the course instructor can use this discussion")

    def _question(self, db: Session, question_id: str, user: User, allow_hidden_for_staff: bool = True) -> QAQuestion:
        q = db.query(QAQuestion).filter(QAQuestion.id == question_id).first()
        if q is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
        course = self._course(db, q.course_id)
        self._assert_participant(db, course, user)
        if q.status != "visible" and not (allow_hidden_for_staff and _is_staff_of(user, course)):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
        return q

    def _answer(self, db: Session, answer_id: str, user: User) -> tuple:
        a = db.query(QAAnswer).filter(QAAnswer.id == answer_id).first()
        if a is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Answer not found")
        q = self._question(db, a.question_id, user)
        course = self._course(db, q.course_id)
        if a.status != "visible" and not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Answer not found")
        return a, q, course

    # ------------------------------------------------------------------ serialising
    def _following(self, db: Session, user: User, ids: List[str]) -> set:
        if not ids:
            return set()
        return {r[0] for r in db.query(QAQuestionFollow.question_id).filter(
            QAQuestionFollow.user_id == user.id, QAQuestionFollow.question_id.in_(ids)).all()}

    def _instructor_answered(self, db: Session, ids: List[str]) -> set:
        if not ids:
            return set()
        return {r[0] for r in db.query(QAAnswer.question_id).filter(
            QAAnswer.question_id.in_(ids), QAAnswer.is_instructor_answer.is_(True), QAAnswer.status == "visible").all()}

    def question_dict(self, q: QAQuestion, following: bool, instructor_answered: bool) -> dict:
        return {
            "id": q.id, "course_id": q.course_id, "lecture_id": q.lecture_id, "user_id": q.user_id,
            "author_name": q.author.full_name if q.author else None, "title": q.title, "body": q.body,
            "is_resolved": bool(q.is_resolved), "status": q.status, "answer_count": q.answer_count or 0,
            "has_instructor_answer": instructor_answered, "is_following": following,
            "created_at": q.created_at, "updated_at": q.updated_at,
        }

    def questions_out(self, db: Session, user: User, rows: List[QAQuestion]) -> List[dict]:
        ids = [q.id for q in rows]
        fol, ia = self._following(db, user, ids), self._instructor_answered(db, ids)
        return [self.question_dict(q, q.id in fol, q.id in ia) for q in rows]

    def _recount(self, db: Session, question: QAQuestion) -> None:
        question.answer_count = db.query(func.count(QAAnswer.id)).filter(
            QAAnswer.question_id == question.id, QAAnswer.status == "visible").scalar() or 0

    # ------------------------------------------------------------------ questions
    def create_question(self, db: Session, course_id: str, data, user: User) -> dict:
        course = self._course(db, course_id)
        self._assert_participant(db, course, user)
        if data.lecture_id:
            ok = db.query(Lecture.id).join(Section, Lecture.section_id == Section.id).filter(
                Lecture.id == data.lecture_id, Section.course_id == course.id).first()
            if not ok:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "That lecture does not belong to this course")
        q = QAQuestion(course_id=course.id, lecture_id=data.lecture_id, user_id=user.id,
                       title=data.title, body=data.body)
        db.add(q)
        db.flush()
        db.add(QAQuestionFollow(question_id=q.id, user_id=user.id))
        db.commit()
        db.refresh(q)
        if user.id != course.instructor_id:
            notification_service.notify(
                db, course.instructor_id, "qa_reply", f"New question in {course.title}", q.title[:200],
                f"/courses/{course.id}/qa/{q.id}", {"course_id": course.id, "question_id": q.id})
        return self.questions_out(db, user, [q])[0]

    def list_questions(self, db: Session, course_id: str, user: User, lecture_id=None, resolved=None,
                       search=None, mine=False, sort="recent", status_filter=None, skip=0, limit=50) -> List[dict]:
        course = self._course(db, course_id)
        self._assert_participant(db, course, user)
        query = db.query(QAQuestion).filter(QAQuestion.course_id == course.id)
        if status_filter and _is_staff_of(user, course):
            query = query.filter(QAQuestion.status == status_filter)
        else:
            query = query.filter(QAQuestion.status == "visible")
        if lecture_id:
            query = query.filter(QAQuestion.lecture_id == lecture_id)
        if resolved is not None:
            query = query.filter(QAQuestion.is_resolved.is_(resolved))
        if mine:
            query = query.filter(QAQuestion.user_id == user.id)
        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(or_(func.lower(QAQuestion.title).like(term), func.lower(QAQuestion.body).like(term)))
        if sort == "unanswered":
            query = query.filter(QAQuestion.answer_count == 0)
        order = (QAQuestion.answer_count.desc(), QAQuestion.created_at.desc()) if sort == "popular" else (QAQuestion.created_at.desc(),)
        return self.questions_out(db, user, query.order_by(*order).offset(skip).limit(limit).all())

    def my_questions(self, db: Session, user: User, skip=0, limit=50) -> List[dict]:
        rows = db.query(QAQuestion).filter(QAQuestion.user_id == user.id, QAQuestion.status == "visible") \
            .order_by(QAQuestion.created_at.desc()).offset(skip).limit(limit).all()
        return self.questions_out(db, user, rows)

    def get_question(self, db: Session, question_id: str, user: User) -> dict:
        q = self._question(db, question_id, user)
        course = self._course(db, q.course_id)
        staff = _is_staff_of(user, course)
        answers = db.query(QAAnswer).filter(QAAnswer.question_id == q.id).all()
        if not staff:
            answers = [a for a in answers if a.status == "visible"]
        voted = {r[0] for r in db.query(QAAnswerVote.answer_id).filter(
            QAAnswerVote.user_id == user.id, QAAnswerVote.answer_id.in_([a.id for a in answers] or [""])).all()}

        def node(a: QAAnswer) -> dict:
            return {
                "id": a.id, "question_id": a.question_id, "parent_answer_id": a.parent_answer_id, "user_id": a.user_id,
                "author_name": a.author.full_name if a.author else None, "author_role": a.author.role if a.author else None,
                "body": a.body, "is_instructor_answer": bool(a.is_instructor_answer),
                "is_highlighted": bool(a.is_highlighted), "status": a.status, "upvote_count": a.upvote_count or 0,
                "has_upvoted": a.id in voted, "created_at": a.created_at, "updated_at": a.updated_at, "replies": [],
            }

        nodes: Dict[str, dict] = {a.id: node(a) for a in answers}
        top: List[dict] = []
        for a in sorted(answers, key=lambda x: x.created_at or datetime.min):
            n = nodes[a.id]
            if a.parent_answer_id and a.parent_answer_id in nodes:
                nodes[a.parent_answer_id]["replies"].append(n)
            elif not a.parent_answer_id:
                top.append(n)
        # best first: highlighted, instructor, most upvoted, oldest
        top.sort(key=lambda n: (not n["is_highlighted"], not n["is_instructor_answer"], -n["upvote_count"],
                                n["created_at"] or datetime.min))
        out = self.questions_out(db, user, [q])[0]
        out["answers"] = top
        return out

    def update_question(self, db: Session, question_id: str, data, user: User) -> dict:
        q = self._question(db, question_id, user, allow_hidden_for_staff=False)
        if q.user_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own question")
        if data.title is not None:
            q.title = data.title
        if data.body is not None:
            q.body = data.body
        db.commit()
        db.refresh(q)
        return self.questions_out(db, user, [q])[0]

    def delete_question(self, db: Session, question_id: str, user: User) -> None:
        q = self._question(db, question_id, user)
        course = self._course(db, q.course_id)
        if q.user_id != user.id and not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete your own question")
        db.delete(q)
        db.commit()

    def set_resolved(self, db: Session, question_id: str, resolved: bool, user: User) -> dict:
        q = self._question(db, question_id, user, allow_hidden_for_staff=False)
        course = self._course(db, q.course_id)
        if q.user_id != user.id and not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author or the instructor can mark a question resolved")
        q.is_resolved = resolved
        db.commit()
        db.refresh(q)
        return self.questions_out(db, user, [q])[0]

    def follow(self, db: Session, question_id: str, follow: bool, user: User) -> dict:
        q = self._question(db, question_id, user, allow_hidden_for_staff=False)
        existing = db.query(QAQuestionFollow).filter_by(question_id=q.id, user_id=user.id).first()
        if follow and existing is None:
            db.add(QAQuestionFollow(question_id=q.id, user_id=user.id))
        elif not follow and existing is not None:
            db.delete(existing)
        db.commit()
        return self.questions_out(db, user, [q])[0]

    def moderate_question(self, db: Session, question_id: str, new_status: str, user: User) -> dict:
        q = self._question(db, question_id, user)
        course = self._course(db, q.course_id)
        if not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can moderate")
        audit_service.log(db, user, "qa_question.moderated", "qa_question", q.id, {"status": [q.status, new_status]})
        q.status = new_status
        db.commit()
        db.refresh(q)
        return self.questions_out(db, user, [q])[0]

    # ------------------------------------------------------------------ answers
    def create_answer(self, db: Session, question_id: str, data, user: User) -> dict:
        q = self._question(db, question_id, user, allow_hidden_for_staff=False)
        course = self._course(db, q.course_id)
        parent = None
        if data.parent_answer_id:
            parent = db.query(QAAnswer).filter(QAAnswer.id == data.parent_answer_id, QAAnswer.question_id == q.id,
                                               QAAnswer.status == "visible").first()
            if parent is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "The answer you are replying to was not found")
            if parent.parent_answer_id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Replies can only go one level deep. Reply to the main answer.")
        ans = QAAnswer(question_id=q.id, parent_answer_id=parent.id if parent else None, user_id=user.id, body=data.body,
                       is_instructor_answer=_is_staff_of(user, course))
        db.add(ans)
        db.flush()
        self._recount(db, q)
        if not db.query(QAQuestionFollow).filter_by(question_id=q.id, user_id=user.id).first():
            db.add(QAQuestionFollow(question_id=q.id, user_id=user.id))
        db.commit()
        db.refresh(ans)

        recipients = {r[0] for r in db.query(QAQuestionFollow.user_id).filter(QAQuestionFollow.question_id == q.id).all()}
        if parent and parent.user_id:
            recipients.add(parent.user_id)
        recipients.discard(user.id)
        notification_service.notify_many(
            db, sorted(recipients), "qa_reply", f"New reply: {q.title[:150]}", f"{user.full_name}: {data.body[:300]}",
            f"/courses/{course.id}/qa/{q.id}", {"course_id": course.id, "question_id": q.id, "answer_id": ans.id})
        return self.get_question(db, q.id, user)

    def update_answer(self, db: Session, answer_id: str, body: str, user: User) -> dict:
        a, q, _ = self._answer(db, answer_id, user)
        if a.user_id != user.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only edit your own answer")
        a.body = body
        db.commit()
        return self.get_question(db, q.id, user)

    def delete_answer(self, db: Session, answer_id: str, user: User) -> None:
        a, q, course = self._answer(db, answer_id, user)
        if a.user_id != user.id and not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete your own answer")
        db.delete(a)
        db.flush()
        self._recount(db, q)
        db.commit()

    def toggle_upvote(self, db: Session, answer_id: str, user: User) -> dict:
        a, _, _ = self._answer(db, answer_id, user)
        if a.status != "visible":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Answer not found")
        if a.user_id == user.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot upvote your own answer")
        vote = db.query(QAAnswerVote).filter_by(answer_id=a.id, user_id=user.id).first()
        if vote:
            db.delete(vote)
        else:
            db.add(QAAnswerVote(answer_id=a.id, user_id=user.id))
        db.flush()
        a.upvote_count = db.query(func.count(QAAnswerVote.id)).filter(QAAnswerVote.answer_id == a.id).scalar() or 0
        db.commit()
        return {"upvoted": vote is None, "upvote_count": a.upvote_count}

    def set_highlight(self, db: Session, answer_id: str, highlighted: bool, user: User) -> dict:
        a, q, course = self._answer(db, answer_id, user)
        if not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can highlight answers")
        a.is_highlighted = highlighted
        db.commit()
        return self.get_question(db, q.id, user)

    def moderate_answer(self, db: Session, answer_id: str, new_status: str, user: User) -> dict:
        a, q, course = self._answer(db, answer_id, user)
        if not _is_staff_of(user, course):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the course instructor or a Super Admin can moderate")
        audit_service.log(db, user, "qa_answer.moderated", "qa_answer", a.id, {"status": [a.status, new_status]})
        a.status = new_status
        db.flush()
        self._recount(db, q)
        db.commit()
        return self.get_question(db, q.id, user)


qa_service = QAService()
