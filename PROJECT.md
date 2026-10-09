# Learning Platform — Project Specification

## 1. Project Overview

This project is a modern, scalable online learning platform inspired by the core learning and course-marketplace concepts of platforms such as Udemy.

The platform will provide one common learning environment for:

- Individual learners
- Independent instructors
- University/college faculty
- Training institutes
- Companies and organizations

The platform must not be restricted to a single university or organization.

Organizations are optional. A user can use the platform as an individual learner/instructor or can optionally associate their account with a university, company, institute, or other organization.

---

## 2. Project Objective

The main objective is to build a platform where instructors can create and publish educational courses and learners can discover, purchase/enroll in, learn from, and complete those courses.

The platform must support:

- Course creation
- Course approval
- Course discovery
- Enrollment
- Video-based learning
- Quizzes
- Assignments
- Progress tracking
- Certificates
- Ratings and reviews
- Payments
- Learning credits
- Organization-based access
- Admin management
- Analytics
- Notifications

The architecture should be modular so that AI-powered features and additional monetization models can be added later.

---

# 3. Core User Roles

The platform has three primary application roles.

## 3.1 Learner

A learner can:

- Register and log in
- Create and manage a profile
- Optionally associate with an organization
- Browse courses
- Search and filter courses
- View course details
- Preview course content
- Enroll in free courses
- Purchase paid courses
- Use learning credits
- Access enrolled courses
- Watch lectures
- Download permitted resources
- Complete quizzes
- Submit assignments
- Track learning progress
- Complete courses
- Receive certificates
- Rate courses
- Review courses
- View learning history

## 3.2 Instructor / Faculty

An instructor can:

- Register and log in
- Create and manage an instructor profile
- Optionally associate with an organization
- Create courses
- Add course information
- Add sections
- Add lectures
- Upload videos
- Upload learning resources
- Create quizzes
- Create assignments
- Preview courses
- Submit courses for admin approval
- Receive admin feedback
- Edit courses after requested changes
- Resubmit courses
- View published courses
- View learner enrollment information
- View course analytics
- Improve courses based on learner feedback

## 3.3 Administrator

An administrator can:

- Log in to the admin dashboard
- Manage users
- Manage instructors
- Manage organizations
- Manage categories
- Review submitted courses
- Approve courses
- Request changes
- Reject courses
- Publish approved courses
- Manage platform content
- Monitor enrollments
- Monitor payments
- Monitor learning credits
- View reports
- Manage platform settings
- Handle administrative issues

---

# 4. Organization System

Organizations are optional.

The platform will remain one common platform rather than creating separate portals for every university/company/institute.

An organization may be:

- University
- College
- School
- Company
- Training institute
- Government organization
- Private organization
- Other educational/professional institution

A user may optionally provide:

- Organization name
- Organization ID
- Organization email
- Department
- Program/designation
- Organization domain

Organization association may be verified through:

- Organization email/domain
- Organization ID
- Admin approval
- Future organization-specific authentication

The organization system should support future private courses and organization-specific learning access.

---

# 5. Authentication and Onboarding

## Basic Flow

Register
→ Select account role
→ Enter personal information
→ Optional organization information
→ Verify email
→ Login
→ Redirect to role-specific dashboard

Supported roles:

- Learner
- Instructor
- Admin

Authentication should use secure authentication mechanisms.

The application must never store plain-text passwords.

---

# 6. Learner Workflow

```text
Register / Login
      ↓
Learner Dashboard
      ↓
Browse / Search Courses
      ↓
Course Details
      ↓
Free Enrollment / Purchase / Learning Credits
      ↓
My Learning
      ↓
Course Player
      ↓
Sections and Lectures
      ↓
Videos / Resources
      ↓
Quiz / Assignment
      ↓
Progress Tracking
      ↓
Course Completion
      ↓
Certificate
      ↓
Rating and Review
```

---

# 7. Instructor Workflow

```text
Register / Login
      ↓
Instructor Dashboard
      ↓
Create Course
      ↓
Add Course Details
      ↓
Create Sections
      ↓
Add Lectures
      ↓
Upload Videos / Resources
      ↓
Add Quiz / Assignment
      ↓
Preview Course
      ↓
Submit for Approval
      ↓
Admin Review
```

Admin review can result in:

```text
APPROVE
    ↓
PUBLISH
```

or:

```text
REQUEST CHANGES
    ↓
Instructor Edits
    ↓
Resubmit
    ↓
Admin Review
```

or:

```text
REJECT
```

---

# 8. Course Approval Workflow

Every instructor-created course should have a clear lifecycle.

Recommended statuses:

- DRAFT
- SUBMITTED
- UNDER_REVIEW
- CHANGES_REQUIRED
- APPROVED
- PUBLISHED
- REJECTED
- ARCHIVED

Flow:

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
 ┌───────────────┬─────────────────┬──────────────┐
 ↓               ↓                 ↓
APPROVED     CHANGES_REQUIRED    REJECTED
 ↓               ↓
PUBLISHED     INSTRUCTOR EDITS
                 ↓
              RESUBMIT
                 ↓
             UNDER_REVIEW
```

Admin feedback should be stored so instructors can understand what changes are required.

---

# 9. Course Structure

A course should support the following hierarchy:

```text
Course
  ├── Course Information
  ├── Sections
  │     ├── Lecture
  │     ├── Lecture
  │     ├── Quiz
  │     └── Assignment
  │
  ├── Resources
  ├── Pricing
  ├── Instructor
  ├── Reviews
  └── Certificate Rules
```

Course information should include:

- Title
- Subtitle
- Description
- Category
- Subcategory
- Difficulty level
- Language
- Thumbnail
- Instructor
- Learning objectives
- Requirements
- Target audience
- Duration
- Pricing
- Publication status

---

# 10. Course Discovery

Learners should be able to discover courses through:

- Homepage
- Search
- Categories
- Subcategories
- Filters
- Sorting
- Featured courses
- Popular courses
- New courses
- Organization-specific courses
- Recommended courses

Search should initially be implemented using PostgreSQL-compatible search capabilities.

The architecture should allow future integration with:

- Elasticsearch
- OpenSearch
- Algolia
- Meilisearch
- AI-powered semantic search

---

# 11. Enrollment and Access

A learner can access a course through one of the supported access methods.

Initial access types:

- FREE
- DIRECT_PURCHASE
- LEARNING_CREDITS
- ORGANIZATION_ACCESS

Future access types:

- SUBSCRIPTION
- PROMOTIONAL_ACCESS
- SCHOLARSHIP_ACCESS

Enrollment records should track:

- User
- Course
- Enrollment date
- Access type
- Payment reference if applicable
- Completion status
- Completion date

---

# 12. Monetization

The platform should support multiple monetization models.

## 12.1 Free Courses

Learners can enroll without payment.

## 12.2 Direct Purchase

Learners can directly purchase a course.

Example:

```text
Course Price
    ↓
Payment Gateway
    ↓
Payment Verification
    ↓
Enrollment
    ↓
Course Access
```

## 12.3 Learning Credits

The platform should support a credit-based learning system.

Example:

```text
User Wallet
     ↓
Learning Credits
     ↓
Use Credits
     ↓
Course Enrollment
     ↓
Credits Transaction Recorded
```

Important entities:

- Credit Wallet
- Credit Balance
- Credit Transaction
- Course Credit Price

All credit transactions must be auditable.

## 12.4 Organization Access

Organizations may provide course access to users without requiring individual payment.

---

# 13. Payment System

The architecture should separate payment processing from enrollment logic.

Initial payment gateway:

- Razorpay

Future:

- Stripe
- Other payment providers

Payment lifecycle:

```text
Course Purchase
      ↓
Create Payment Order
      ↓
Payment Gateway
      ↓
Payment Success / Failure
      ↓
Verify Payment
      ↓
Create Enrollment
      ↓
Grant Course Access
```

Never grant paid course access solely based on a client-side success message.

Payment verification must happen securely on the backend.

---

# 14. Learning Experience

The course player should provide:

- Video player
- Course sections
- Lecture navigation
- Lecture completion
- Progress percentage
- Course duration
- Resources
- Quiz access
- Assignment access
- Next/previous lecture navigation

Progress should be saved so that learners can continue where they stopped.

Example:

```text
Lecture 1 → Completed
Lecture 2 → Completed
Lecture 3 → 60%
Lecture 4 → Not Started
```

---

# 15. Quiz System

The platform should support:

- Multiple-choice questions
- Multiple-answer questions where required
- Question marks
- Correct answers
- Explanations
- Passing score
- Attempt tracking
- Quiz completion

Quiz entities should include:

- Quiz
- Questions
- Options
- Correct answer
- Attempt
- Result

The system should calculate scores on the backend where appropriate.

---

# 16. Assignment System

Instructors can create assignments.

Assignments may include:

- Title
- Description
- Instructions
- Deadline
- Maximum marks
- Allowed file types
- Submission requirements

Learners can:

- View assignment
- Upload submission
- Submit before deadline
- View submission status
- Receive marks/feedback where grading is enabled

Future support:

- Manual grading
- AI-assisted feedback
- Rubrics

---

# 17. Progress Tracking

The system should track:

- Course progress
- Section progress
- Lecture completion
- Video progress
- Quiz completion
- Assignment submission
- Overall completion percentage

Example:

```text
Total Lectures: 20
Completed: 15

Progress = 75%
```

Progress must be associated with the learner's enrollment.

---

# 18. Course Completion

A course may be considered complete when its configured completion requirements are satisfied.

Possible requirements:

- Required lectures completed
- Required quizzes completed
- Required assignments submitted
- Minimum quiz score achieved

The completion rules should be configurable per course.

---

# 19. Certificates

After successful course completion, the platform should generate a certificate.

Certificate should contain:

- Learner name
- Course name
- Instructor
- Completion date
- Certificate ID
- Platform name
- Verification information

Certificates should have unique IDs.

Future:

- QR verification
- Public certificate verification page

Certificate generation can use Python and ReportLab.

---

# 20. Ratings and Reviews

Learners who meet the platform's review eligibility rules can:

- Rate courses
- Write reviews
- Edit their review where permitted

The system should prevent duplicate reviews for the same enrollment unless explicitly supported.

Review data should include:

- User
- Course
- Rating
- Review text
- Created date
- Updated date

Future:

- Review moderation
- Report review
- Instructor response

---

# 21. Notifications

The platform should support notifications for important events.

Examples:

- Course approval
- Course changes requested
- Course rejection
- Course publication
- Enrollment confirmation
- Payment confirmation
- Assignment deadline
- Certificate availability
- New course announcements

Initial implementation can use in-app notifications.

Future:

- Email notifications
- Push notifications

---

# 22. Analytics

## Learner Analytics

- Courses enrolled
- Courses completed
- Learning progress
- Quiz performance
- Certificates earned
- Learning activity

## Instructor Analytics

- Course views
- Enrollments
- Completion rate
- Ratings
- Reviews
- Revenue
- Learner activity

## Admin Analytics

- Total users
- Total instructors
- Total courses
- Published courses
- Pending approvals
- Enrollments
- Revenue
- Credit transactions
- Organization activity

---

# 23. Technology Stack

## Frontend

- React
- Vite
- Tailwind CSS
- JavaScript/JSX

## Backend

- Python
- FastAPI

## Database

- PostgreSQL
- Supabase

## Authentication

- Supabase Auth

## File / Video Storage

- Supabase Storage

The architecture should allow migration to dedicated video storage/CDN solutions in the future.

## Payments

Initial:

- Razorpay

Future:

- Stripe

## Certificate Generation

- Python
- ReportLab

## AI — Future

Potential:

- Google Gemini
- OpenAI APIs
- Embeddings
- RAG
- AI tutor
- AI recommendations
- AI quiz generation

## Development

- Git
- GitHub
- VS Code
- Antigravity / AI coding tools

## Deployment

Potential architecture:

```text
React Frontend
      ↓
Vercel / Similar Frontend Hosting
      ↓
FastAPI Backend
      ↓
Render / Railway / Similar Backend Hosting
      ↓
Supabase PostgreSQL
      ↓
Supabase Storage
```

Deployment provider can be changed later without changing the core architecture.

---

# 24. Recommended Project Architecture

```text
learning-platform/
│
├── PROJECT.md
├── README.md
├── .gitignore
├── docker-compose.yml
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── learner/
│   │   │   ├── instructor/
│   │   │   └── admin/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── .env
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── .env
│
├── database/
│   ├── migrations/
│   └── seed/
│
└── docs/
    ├── project-workflow.md
    ├── database-design.md
    ├── api-documentation.md
    └── deployment.md
```

---

# 25. Frontend Responsibilities

The frontend is responsible for:

- User interface
- Navigation
- Forms
- Course browsing
- Course player
- Dashboards
- Client-side state
- API communication
- Basic client-side validation
- Displaying backend responses

The frontend must not contain secrets.

API keys and private credentials must never be placed in frontend source code.

---

# 26. Backend Responsibilities

The backend is responsible for:

- Authentication verification
- Authorization
- Business logic
- Course management
- Approval workflow
- Enrollment
- Payment verification
- Credit transactions
- Progress tracking
- Quiz evaluation
- Assignment management
- Certificate generation
- Analytics
- Notifications
- Database operations

All sensitive business operations must be validated on the backend.

---

# 27. Suggested Backend Modules

```text
backend/app/
│
├── api/
│   ├── auth.py
│   ├── users.py
│   ├── organizations.py
│   ├── courses.py
│   ├── enrollments.py
│   ├── progress.py
│   ├── quizzes.py
│   ├── assignments.py
│   ├── reviews.py
│   ├── certificates.py
│   ├── payments.py
│   ├── credits.py
│   ├── notifications.py
│   ├── analytics.py
│   └── admin.py
│
├── models/
├── schemas/
├── services/
├── database/
├── middleware/
└── utils/
```

Backend APIs should be grouped by functionality rather than creating separate backend applications for each role.

---

# 28. Suggested Frontend Pages

## Authentication

```text
Login
Register
Forgot Password
Reset Password
Email Verification
```

## Learner

```text
Dashboard
Course Catalog
Course Details
My Learning
Course Player
Quiz
Assignment
Certificates
Profile
```

## Instructor

```text
Dashboard
Create Course
Course Editor
Curriculum
Content Upload
Quiz Builder
Assignment Builder
Course Preview
Submissions
Analytics
Profile
```

## Admin

```text
Dashboard
Course Approvals
Course Review
Users
Instructors
Organizations
Categories
Payments
Credits
Reports
Platform Settings
```

---

# 29. Database Entities

Initial database design should consider the following entities:

```text
users
organizations
organization_members
categories
courses
course_instructors
sections
lectures
lecture_resources
enrollments
progress
quizzes
quiz_questions
quiz_options
quiz_attempts
assignments
assignment_submissions
certificates
reviews
payments
credit_wallets
credit_transactions
notifications
```

The exact relational design should be finalized before production implementation.

---

# 30. Security Requirements

The application must:

- Use secure authentication
- Enforce role-based authorization
- Protect private API routes
- Validate user input
- Validate uploaded files
- Protect payment operations
- Verify payment status on the backend
- Prevent unauthorized course access
- Prevent unauthorized admin access
- Prevent unauthorized instructor modifications
- Never store plain-text passwords
- Never expose secret API keys
- Keep `.env` files out of Git
- Use appropriate database permissions
- Handle errors without exposing sensitive information

---

# 31. Environment Variables

Sensitive configuration must be stored in environment variables.

Possible variables:

```text
SUPABASE_URL=
SUPABASE_KEY=
DATABASE_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
GEMINI_API_KEY=
OPENAI_API_KEY=
```

Only the variables actually required by the implemented feature should be added.

Never commit real credentials to GitHub.

Provide `.env.example` files containing variable names but not real secrets.

---

# 32. API Design Principles

The backend should expose clean REST APIs.

Example:

```text
/api/auth
/api/users
/api/organizations
/api/courses
/api/enrollments
/api/progress
/api/quizzes
/api/assignments
/api/certificates
/api/reviews
/api/payments
/api/credits
/api/notifications
/api/analytics
/api/admin
```

API design should use:

- Clear HTTP methods
- Validation schemas
- Meaningful response codes
- Consistent error responses
- Authentication dependencies
- Authorization checks

---

# 33. Git and GitHub Rules

Repository rules:

- `main` should represent the stable version.
- Use feature branches for major development work.
- Pull the latest changes before starting work.
- Pull/rebase or merge carefully before pushing shared changes.
- Use meaningful commit messages.
- Do not commit `.env`.
- Do not commit secrets.
- Do not overwrite teammates' work without checking changes.
- Review significant changes before merging.

Suggested branches:

```text
main
feature/authentication
feature/course-management
feature/admin-approval
feature/learning
feature/payments
feature/credits
feature/certificates
```

---

# 34. Development Phases

## Phase 1 — Foundation

- Project structure
- Frontend setup
- Backend setup
- Database connection
- Environment configuration
- Basic API health check

## Phase 2 — Authentication

- Registration
- Login
- Logout
- Email verification
- Password reset
- Role management
- Protected routes

## Phase 3 — User Profiles

- Learner profile
- Instructor profile
- Organization association

## Phase 4 — Course Creation

- Create course
- Course editor
- Sections
- Lectures
- Resources
- Video upload
- Course preview

## Phase 5 — Course Approval

- Submit course
- Admin review
- Approve
- Request changes
- Reject
- Resubmission

## Phase 6 — Course Discovery

- Homepage
- Course catalog
- Search
- Categories
- Filters
- Course details

## Phase 7 — Enrollment and Learning

- Free enrollment
- Course access
- Course player
- Progress tracking
- Resume learning

## Phase 8 — Assessment

- Quizzes
- Quiz attempts
- Assignment creation
- Assignment submission
- Results

## Phase 9 — Completion

- Completion rules
- Certificates
- Certificate verification

## Phase 10 — Reviews and Analytics

- Ratings
- Reviews
- Learner analytics
- Instructor analytics
- Admin analytics

## Phase 11 — Monetization

- Payments
- Payment verification
- Direct purchases
- Learning credits
- Credit wallet
- Credit transactions

## Phase 12 — Notifications

- In-app notifications
- Email notifications where required

## Phase 13 — Testing

- Unit tests
- API tests
- Authentication tests
- Authorization tests
- Payment tests
- Course workflow tests
- Frontend tests
- End-to-end tests

## Phase 14 — Deployment

- Production environment
- Database configuration
- Storage configuration
- Frontend deployment
- Backend deployment
- Environment variables
- Domain configuration
- Monitoring

---

# 35. Future AI Features

AI should be added after the core platform is stable.

Potential features:

## AI Course Recommendation

Recommend courses based on:

- Learner interests
- Learning history
- Course activity
- Skills

## AI Tutor

A conversational assistant that can answer questions about course content.

## AI Quiz Generation

Generate draft quiz questions from course material for instructor review.

## AI Assignment Assistance

Provide learning-oriented hints and feedback without replacing instructor evaluation.

## AI Semantic Search

Allow learners to search by meaning rather than only exact keywords.

## AI Learning Path

Generate personalized learning paths based on learner goals and existing skills.

---

# 36. Important Product Principles

1. The platform must remain a single common platform.
2. Organization association is optional.
3. Learner, Instructor, and Admin are the primary application roles.
4. Course approval is required before public publication.
5. Paid access must be verified securely.
6. Credit transactions must be auditable.
7. Course progress must persist.
8. Certificates must be uniquely identifiable.
9. Security must be considered from the beginning.
10. AI features should not be allowed to complicate the core MVP.
11. The architecture should support future scaling.
12. Business logic belongs primarily in the backend.
13. The frontend must not contain secrets.
14. Reusable components and services should be preferred over duplicated code.

---

# 37. MVP Scope

The first working version should focus on the essential learning flow.

### MVP must include:

- Registration/login
- Role-based access
- Learner dashboard
- Instructor dashboard
- Admin dashboard
- Course creation
- Course editing
- Video/resource upload
- Course submission
- Admin approval
- Course publication
- Course discovery
- Course details
- Free enrollment
- Course player
- Progress tracking
- Basic quizzes
- Course completion
- Basic certificates
- Ratings/reviews

### After MVP:

- Payments
- Learning credits
- Organization access
- Advanced analytics
- Notifications
- AI features
- Advanced search
- Subscription system

---

# 38. Antigravity Implementation Instructions

Antigravity must read this entire `PROJECT.md` before making architectural or implementation changes.

## Rules

1. Treat this document as the project's primary specification.
2. Do not immediately generate the entire application in one uncontrolled step.
3. First inspect the existing repository.
4. If an existing project already contains code, preserve working functionality unless a change is explicitly required.
5. Before major architectural changes, explain the proposed changes.
6. Build the project in phases.
7. Keep frontend and backend responsibilities separated.
8. Do not hard-code secrets.
9. Do not create unnecessary duplicate files.
10. Reuse existing components/services when appropriate.
11. Follow the defined role and permission model.
12. Do not bypass backend authorization.
13. Do not grant paid course access based only on frontend state.
14. Keep database changes organized and reversible.
15. Add appropriate error handling.
16. Test each major feature before moving to the next phase.
17. Do not modify unrelated functionality while implementing a feature.
18. Keep documentation updated when architecture changes.
19. Use meaningful names for files, functions, components, routes, and database entities.
20. Do not add AI functionality until the core workflow is stable unless explicitly requested.

## Recommended Antigravity Workflow

```text
Read PROJECT.md
      ↓
Inspect Repository
      ↓
Analyze Existing Code
      ↓
Identify Missing Components
      ↓
Propose Architecture
      ↓
Create/Update Structure
      ↓
Implement One Phase
      ↓
Run Tests
      ↓
Fix Errors
      ↓
Verify Feature
      ↓
Move to Next Phase
```

---

# 39. Definition of Done

A feature is considered complete only when:

- Required frontend UI exists
- Required backend API exists
- Required database changes exist
- Authentication/authorization is correct
- Validation is implemented
- Error handling is implemented
- The feature works with real application data
- Relevant tests are completed
- No secrets are exposed
- Existing functionality is not unnecessarily broken
- Documentation is updated where required

---

# 40. Final Product Flow

The overall platform should follow this high-level flow:

```text
                    LEARNING PLATFORM
                           |
          ┌────────────────┼────────────────┐
          |                |                |
       LEARNER         INSTRUCTOR          ADMIN
          |                |                |
       Login            Login             Login
          |                |                |
   Browse/Search      Create Course    Manage Platform
          |                |                |
   Course Details     Add Content      Review Course
          |                |                |
   Enroll/Purchase    Submit Course    Approve / Changes / Reject
          |                |                |
     My Learning       Get Approval          |
          |                |                |
     Watch Course       Published             |
          |                |                  |
    Quiz/Assignment         └──────────┐      |
          |                            |      |
       Progress                        ↓      |
          |                         Course ←─┘
       Complete
          |
      Certificate
          |
       Review
```

---

# 41. Implementation Priority

The implementation priority should be:

```text
1. Foundation
2. Authentication
3. Roles & Permissions
4. Course Management
5. Course Approval
6. Course Discovery
7. Enrollment
8. Learning Experience
9. Progress Tracking
10. Quiz
11. Assignment
12. Completion
13. Certificates
14. Reviews
15. Payments
16. Learning Credits
17. Organizations
18. Notifications
19. Analytics
20. AI Features
```

The goal is to build a reliable core learning platform first and then progressively add advanced functionality.
