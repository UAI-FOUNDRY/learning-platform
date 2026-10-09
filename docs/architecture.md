# System Architecture

## Overview
The Learning Platform uses a decoupled client-server architecture:
- **Frontend**: React Single-Page Application (SPA) powered by Vite and Tailwind CSS.
- **Backend**: RESTful API built with Python and FastAPI.
- **Database**: PostgreSQL relational database designed for high scalability and modularity.

## Architecture Layers
1. **Client Layer (Frontend)**:
   - Role-oriented page routing (`public`, `auth`, `learner`, `instructor`, `admin`).
   - Shared component hierarchy (`common`, `layout`, `course`, `video`, `navigation`).
   - Centralized API service layer decoupling UI from network requests.
2. **API & Service Layer (Backend)**:
   - `api/`: REST routing grouped by functional domain.
   - `services/`: Encapsulated domain business logic.
   - `models/`: SQLAlchemy ORM representations of database entities.
   - `schemas/`: Pydantic request/response validation schemas.
   - `middleware/`: Authentication, authorization, and error handling wrappers.
3. **Data Layer (PostgreSQL)**:
   - Normalized relational schema supporting core learning entities.
   - Separation of concerns across users, courses, assessments, and certifications.
