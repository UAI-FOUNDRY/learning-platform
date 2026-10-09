# Team Contribution Guidelines

## Module Allocation
- **Person 1 — Authentication, Users & Organizations**:
  - Backend: `api/auth.py`, `api/users.py`, `api/organizations.py`, models, schemas, services.
  - Frontend: `pages/auth/`, `services/authService.js`, `services/userService.js`, `context/AuthContext.jsx`.
- **Person 2 — Courses & Learning**:
  - Backend: `api/courses.py`, `api/enrollments.py`, `api/progress.py`, `api/certificates.py`.
  - Frontend: `pages/public/`, `pages/learner/`, `components/course/`, `components/video/`, course/progress services.
- **Person 3 — Instructor & Assessment**:
  - Backend: `api/quizzes.py`, `api/assignments.py`, curriculum & assessment services/models.
  - Frontend: `pages/instructor/`, `pages/learner/Quiz.jsx`, `pages/learner/Assignment.jsx`, quiz/assignment services.
- **Person 4 — Admin & Platform Management**:
  - Backend: `api/admin.py`, `api/categories.py`, `api/reviews.py`, admin/review services.
  - Frontend: `pages/admin/`, `services/adminService.js`, review & category components.

## Shared Files Protocol
Coordinate before modifying shared files:
- `frontend/src/App.jsx`, `frontend/src/routes/AppRoutes.jsx`
- `frontend/src/components/common/`, `frontend/src/components/layout/`
- `backend/app/main.py`, `backend/app/database/`, `backend/app/config/`
- `database/schema/database-schema.sql`
