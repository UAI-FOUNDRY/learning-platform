# Learning Platform

A modern, scalable online learning platform built for individual learners, independent instructors, university/college faculty, training institutes, and organizations.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, React Router (JavaScript/JSX)
- **Backend**: Python, FastAPI
- **Database**: PostgreSQL (Supabase compatible)

## Team Modules & Ownership
- **Person 1**: Authentication, Users & Organizations
- **Person 2**: Courses & Learning (Catalog, Player, Progress, Certificates)
- **Person 3**: Instructor & Assessment (Curriculum, Quizzes, Assignments)
- **Person 4**: Admin & Platform Management (Approvals, Categories, Reviews, Reports)

## Project Structure
```text
foundryT-2/
├── docs/             # Architecture, workflow, team, and API documentation
├── frontend/         # React SPA frontend (Vite + Tailwind CSS)
├── backend/          # FastAPI backend application
├── database/         # Schema, migrations, and seed scripts
└── .github/          # CI workflows and issue templates
```

## Getting Started

### Backend Setup
1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Development & Git Workflow
- Development occurs on feature branches branched from `development`.
- Refer to `docs/team-contribution.md` and `docs/development-guidelines.md` for team coordination details.
