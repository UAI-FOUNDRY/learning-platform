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
5. Configure database and environment variables in `.env`:
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string.
     - Direct / Session Pooler (port 5432):
       `postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:5432/postgres`
     - Transaction Pooler (port 6543):
       `postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres`
     - Local PostgreSQL:
       `postgresql://postgres:postgres@localhost:5432/learning_platform`
   - `SECRET_KEY`: Random secret string for JWT signature generation.
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token lifetime in minutes (default: 60).
   - Connection pool settings: `DB_POOL_SIZE` (default: 5), `DB_MAX_OVERFLOW` (default: 10), `DB_POOL_RECYCLE` (default: 1800).
6. Run database migrations or initial schema (if connecting to a fresh database):
   ```bash
   # Schema script located at database/schema/database-schema.sql
   ```
7. Run tests:
   ```bash
   pytest
   ```
8. Run the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
9. Access the API & Docs:
   - Health check: `http://localhost:8000/api/health`
   - Swagger OpenAPI docs: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

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
