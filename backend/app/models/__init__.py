"""
Every SQLAlchemy model is imported here so that Base.metadata (used by Alembic and the
tests) always knows about all tables. When you add a model, import it here too.
"""
# Users & organizations
from app.models.user import User
from app.models.organization import Organization
from app.models.organization_member import OrganizationMember

# Catalog & course content
from app.models.category import Category
from app.models.course import Course
from app.models.course_approval_log import CourseApprovalLog
from app.models.section import Section
from app.models.lecture import Lecture, LectureResource

# Learning
from app.models.enrollment import Enrollment
from app.models.progress import Progress
from app.models.learning import LectureNote, LectureBookmark, LectureSubtitle, WishlistItem

# Assessments
from app.models.quiz import Quiz
from app.models.question import Question
from app.models.quiz_attempt import QuizAttempt, QuizAttemptAnswer
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionFile
from app.models.coding import (
    CodingExercise, CodingTestCase, CodingSubmission, CodingSubmissionResult, CodingDraft,
)

# Completion & feedback
from app.models.certificate import Certificate
from app.models.review import Review

# Community & moderation
from app.models.qa import QAQuestion, QAAnswer, QAAnswerVote, QAQuestionFollow
from app.models.content_report import ContentReport

# Notifications
from app.models.notification import Notification, NotificationPreference, Announcement

# Security & platform
from app.models.security import AuthToken, LoginHistory, AuditLog
from app.models.platform_setting import PlatformSetting

# Personalization, gamification, AI
from app.models.personalization import (
    Topic, course_topics, question_topics, coding_exercise_topics, UserTopicMastery,
    LearningGoal, LearningPath, LearningPathCourse, LearningPathEnrollment,
    Recommendation, LearningActivityDaily,
)
from app.models.gamification import Badge, UserBadge, PointTransaction, UserStreak
from app.models.ai import AIConversation, AIMessage

__all__ = [
    "User", "Organization", "OrganizationMember",
    "Category", "Course", "CourseApprovalLog", "Section", "Lecture", "LectureResource",
    "Enrollment", "Progress", "LectureNote", "LectureBookmark", "LectureSubtitle", "WishlistItem",
    "Quiz", "Question", "QuizAttempt", "QuizAttemptAnswer", "Assignment", "Submission", "SubmissionFile",
    "CodingExercise", "CodingTestCase", "CodingSubmission", "CodingSubmissionResult", "CodingDraft",
    "Certificate", "Review",
    "QAQuestion", "QAAnswer", "QAAnswerVote", "QAQuestionFollow", "ContentReport",
    "Notification", "NotificationPreference", "Announcement",
    "AuthToken", "LoginHistory", "AuditLog", "PlatformSetting",
    "Topic", "course_topics", "question_topics", "coding_exercise_topics", "UserTopicMastery",
    "LearningGoal", "LearningPath", "LearningPathCourse", "LearningPathEnrollment",
    "Recommendation", "LearningActivityDaily",
    "Badge", "UserBadge", "PointTransaction", "UserStreak",
    "AIConversation", "AIMessage",
]
