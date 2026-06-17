# WorkHive 🐝

WorkHive is a production-grade multi-tenant collaborative workspace and task management SaaS application, built with **Django REST Framework**, **React**, **TypeScript**, **PostgreSQL**, and **Docker**.

This repository is designed to showcase **Spec-First Engineering** and deep **Specmatic** integration — verifying API contracts, running automated contract testing, stub mocking, checking schema resiliency, and enforcing AI coding agent guardrails.

---

## 🏗️ Architectural Overview

WorkHive follows Clean Architecture principles to isolate concern layers and ensure logical multi-tenancy:

```
                  ┌────────────────────────┐
                  │ Frontend: React & TS   │
                  │ (Tailwind, Axios, SPA) │
                  └───────────┬────────────┘
                              │
                    REST APIs │ (Port 8000 / 9000)
                              ▼
                  ┌────────────────────────┐
                  │   Backend Django API   │
                  │ (Clean Architecture)   │
                  └───────────┬────────────┘
                              │
                     Database │ (ORM Queries)
                              ▼
                  ┌────────────────────────┐
                  │   PostgreSQL Service   │
                  │   (Logical Isolation)  │
                  └────────────────────────┘
```

- **Frontend**: A single-page application built on React, TypeScript, and TailwindCSS. Includes an API selector to switch between the Live Django Backend, Specmatic Mock Stubs, and an Offline Failsafe Local Database.
- **Backend**: Python/Django REST Framework codebase structured into **Views** (serializers/routing), **Services** (business logic/auth), and **Repositories** (isolated tenant database queries).
- **Database**: PostgreSQL database employing a shared-database, shared-schema pattern. Tenant isolation is enforced logically at the repository layer.

---

## 📂 Project Structure

```
workhive/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI pipeline
├── api-specs/
│   ├── auth.yaml              # User registration/login specs
│   ├── tenants.yaml           # Tenant lifecycle specs
│   ├── workspaces.yaml        # Workspace organization specs
│   └── tasks.yaml             # Task CRUD specs
├── specmatic.yaml             # Specmatic core configuration file
├── examples/                  # Executable request/response mocks
│   ├── LOGIN.json
│   ├── REGISTER.json
│   ├── CREATE_TENANT.json
│   ├── GET_TENANT.json
│   ├── CREATE_WORKSPACE.json
│   ├── CREATE_TASK.json
│   ├── GET_TASK.json
│   ├── UPDATE_TASK.json
│   └── DELETE_TASK.json
├── backend/                   # Django REST Framework application
│   ├── core/                  # Core App (Views, Services, Repositories)
│   ├── workhive/              # Core Django Settings & Configuration
│   ├── tests/                 # Pytest Django DB suites
│   ├── Dockerfile
│   ├── requirements.txt
│   └── pytest.ini
├── frontend/                  # React + TypeScript SPA application
│   ├── src/                   # Components, Dashboard, styles
│   ├── package.json
│   └── Dockerfile
├── docs/                      # Technical walkthroughs
│   ├── architecture.md        # Clean architecture layers & Mermaid sequences
│   ├── api-design.md          # OpenAPI 3.1 endpoint details
│   ├── specmatic-guide.md     # Command line specmatic test guides
│   ├── ai-guardrails.md       # Regulating AI agent generation with contracts
│   └── specmatic-resiliency-report.md # Report on schema resiliency tests and mock auth
├── docker-compose.yml         # Container orchestrator
└── README.md                  # Main project guide
```

---

## 🚀 Setup & Launch Instructions

You can run WorkHive locally either using Docker Compose or manually on your host machine.

### Method 1: Docker Compose (Recommended)
This spins up PostgreSQL, the Django Backend (exposing Port 8000), and the React Frontend (exposing Port 3000):
```bash
docker-compose up --build
```
Access the application at `http://localhost:3000`.

### Method 2: Manual Local Launch

#### 1. Start Django Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
The Django server runs at `http://localhost:8000`.

#### 2. Start React Frontend
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🐝 Specmatic Contract Engineering

Specmatic is integrated into the heart of WorkHive's dev cycle. To use Specmatic locally, ensure Java 17+ and Node.js are installed, and install the Specmatic CLI:
```bash
npm install -g specmatic
```

### 1. Run Mock Server (Specmatic Stub)
To develop the frontend independently without a running backend:
```bash
specmatic stub --port=9000
```
This launches a stub server at `http://localhost:9000` loading responses from the `examples/` directory. You can toggle the target in the frontend dashboard to point to Port 9000 to interact with Specmatic mocks directly!

### 2. Run Contract Tests
Verify that the Django backend conforms exactly to the OpenAPI 3.1 contracts.
With Django running on Port 8000, execute:
```bash
specmatic test --host=localhost --port=8000
```
Specmatic will run positive, negative, and schema resiliency tests to ensure the Django view outputs match the OpenAPI yaml templates.

### 3. Schema Resiliency (Generative Testing)
We have enabled strict schema resiliency boundary testing using:
```yaml
specmatic:
  settings:
    test:
      schemaResiliencyTests: all
```
For a detailed analysis of findings, resolved type-coercion issues, custom JSON exception handlers, and the mock authentication token fallback mechanism, see the [Specmatic Resiliency Testing Report](file:///Users/pranaykumarakuthota/Downloads/specmatic/docs/specmatic-resiliency-report.md).

---

## 🤖 AI Coding Agent Guardrails

When using AI assistants (Cursor, Claude, ChatGPT) to write code, Specmatic acts as an executable guardrail:
1. Lock OpenAPI specifications in `api-specs/`.
2. Feed the contract to the AI coding agent to generate the views/serializers.
3. Run `specmatic test` against the generated implementation.
4. If the AI introduces format variations (e.g. `snake_case` instead of `camelCase`, or incorrect HTTP statuses), Specmatic immediately prints schema failures.
5. Provide the error back to the AI for self-correction.
See [ai-guardrails.md](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/docs/ai-guardrails.md) for details.

---

## 🔄 CI/CD Pipeline

The WorkHive CI pipeline is defined at [.github/workflows/ci.yml](file:///Users/pranaykumarakuthota/.gemini/antigravity/scratch/workhive/.github/workflows/ci.yml).
On every push:
1. Runs Django migrations and executes Python unit tests (`pytest`).
2. Starts the Django backend.
3. Launches Specmatic to validate all contract example configurations.
4. Runs contract tests against the running Django backend.

---
