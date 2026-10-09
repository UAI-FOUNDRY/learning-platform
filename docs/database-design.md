# Database Design

## Supported Entities
The relational schema models 16 core entities:
1. `users`: System users and profile information.
2. `organizations`: Educational or corporate institutions.
3. `organization_members`: Association mapping between users and organizations.
4. `categories`: Hierarchical classification of courses.
5. `courses`: Course definitions, metadata, and publication status.
6. `sections`: Curriculum sections within courses.
7. `lectures`: Educational lectures and media units within sections.
8. `enrollments`: User enrollment tracking.
9. `progress`: Granular lecture completion and progress tracking.
10. `quizzes`: Section assessments.
11. `questions`: Questions associated with quizzes.
12. `quiz_attempts`: Learner submissions and test evaluation records.
13. `assignments`: Project or exercise assignments.
14. `submissions`: Learner submissions for assignments.
15. `certificates`: Completion certificates with verification IDs.
16. `reviews`: Learner feedback, ratings, and course reviews.

*Note: Payment, wallet, credit, and transaction entities are intentionally excluded at this foundation stage.*
