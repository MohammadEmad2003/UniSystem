# Capital University Management System

A modern, production-ready university management system frontend built with React, TypeScript, and TailwindCSS. Features a class-centric architecture with role-based access control for Students, Doctors, and Administrators.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?logo=tailwindcss) ![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)

---

## 🚀 Features

### Authentication & Account Lifecycle
- Email/password login with JWT token management
- Student self-registration with document upload
- Admin approval workflow (pending → approved/rejected)
- Role-based route protection

### 🏫 Class-Centric Architecture
Every feature is scoped inside a class workspace:
- **Stream** — Google Classroom-style discussion (Q&A with threaded replies)
- **Materials** — Organized file/link repository (doctor upload only)
- **Lectures** — Schedule with meeting links, room info, type badges
- **Students** — Enrolled student roster (doctor view only)
- **Grades** — Per-student grade management with progress bars

### 👤 Role-Based Access

| Feature | Student | Doctor | Admin |
|---------|---------|--------|-------|
| Dashboard with stats | ✅ | ✅ | ✅ |
| Enter class workspace | ✅ | ✅ | ❌ |
| Upload materials | ❌ | ✅ | ❌ |
| Post/answer questions | ✅ | ✅ | ❌ |
| Manage grades | View | Full CRUD | ❌ |
| Track attendance | View | Manage | ❌ |
| Approve students | ❌ | ❌ | ✅ |
| Manage departments/courses/classes | ❌ | ❌ | ✅ |
| Create doctors/admins | ❌ | ❌ | ✅ |

### 📊 Dashboard Features
- **Student**: GPA trend chart, credit hours, enrolled classes, upcoming lectures
- **Doctor**: Teaching stats, class cards with student counts
- **Admin**: System stats, department chart, pending approvals alert, quick actions

### 🔔 Notifications
- Real-time notification bell with unread count
- Class-scoped notifications (new materials, replies, grades, announcements)
- Click-to-navigate to specific class content
- Mark individual or all as read

### 🧪 Mock Data System
- Complete seed data simulating a real university environment
- 5 students, 2 doctors, 1 admin with realistic Egyptian names
- 3 departments, 8 courses, 6 classes, 16 lectures
- 13 materials, 8 discussion threads with replies
- Grade records, attendance records, notifications
- Toggle via `VITE_USE_MOCK=true` environment variable
- Simulated API delays for realistic loading states

---

## 🛠 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite 6** | Build tool & dev server |
| **TailwindCSS 3** | Styling (blue university theme) |
| **React Router 6** | Client-side routing |
| **TanStack React Query** | Server state management |
| **Zustand** | Client state management (auth) |
| **Axios** | HTTP client |
| **Recharts** | Charts & data visualization |
| **Lucide React** | Icon library |

---

## 📁 Project Structure

```
src/
├── App.tsx                    # Main app with routing
├── main.tsx                   # Entry point
├── index.css                  # Global styles + Tailwind
├── types/
│   └── index.ts               # All TypeScript interfaces
├── mock/
│   ├── data.ts                # Seed data for all entities
│   └── mockServices.ts        # Fake API service layer
├── services/
│   └── index.ts               # Service barrel (mock/real toggle)
├── hooks/
│   └── useAuthStore.ts        # Zustand auth store
├── layouts/
│   ├── AuthLayout.tsx          # Login/register layout
│   ├── DashboardLayout.tsx     # Sidebar + TopNav + content
│   ├── Sidebar.tsx             # Role-aware navigation
│   └── TopNav.tsx              # Search + notifications + avatar
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx       # Login with role presets
│   │   ├── RegisterPage.tsx    # Student registration
│   │   └── PendingApprovalPage.tsx
│   ├── dashboard/
│   │   ├── StudentDashboard.tsx  # GPA chart, stats
│   │   ├── DoctorDashboard.tsx   # Teaching overview
│   │   └── AdminDashboard.tsx    # System stats, charts
│   ├── classes/
│   │   ├── MyClassesPage.tsx     # Class grid
│   │   ├── ClassWorkspacePage.tsx # Tabbed workspace
│   │   ├── ClassStreamTab.tsx    # Discussion Q&A
│   │   ├── ClassMaterialsTab.tsx # Materials with upload
│   │   ├── ClassLecturesTab.tsx  # Lecture schedule
│   │   ├── ClassStudentsTab.tsx  # Student roster
│   │   └── ClassGradesTab.tsx    # Grade management
│   ├── admin/
│   │   ├── ApprovalQueuePage.tsx   # Approve/reject students
│   │   ├── ManageUsersPage.tsx     # Create doctors/admins
│   │   ├── ManageDepartmentsPage.tsx
│   │   ├── ManageCoursesPage.tsx
│   │   └── ManageClassesPage.tsx
│   └── ProfilePage.tsx          # User profile
└── docs/                        # ERD and DB documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm 9+

### Installation

```bash
# Clone the repository
cd "University Management System"

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000/api` | Backend API base URL |
| `VITE_USE_MOCK` | `true` | Use mock data (`true`) or real API (`false`) |

### Build for Production

```bash
npm run build
npm run preview   # Preview production build
```

---

## 🔐 Demo Login Credentials

The login page includes quick-select buttons for each role:

| Role | Email | Password |
|------|-------|----------|
| **Student** | ahmed.hassan@capital.edu | any |
| **Doctor** | mohamed.elsayed@capital.edu | any |
| **Admin** | admin@capital.edu | any |

> When using mock data, any password works.

---

## 📡 API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for the complete REST API specification including:
- All 49+ endpoints grouped by feature
- Request/response JSON schemas
- Authentication headers
- Access control matrix
- Entity definitions with field types

---

## 🗺 Routing

| Path | Page | Access |
|------|------|--------|
| `/login` | Login | Public |
| `/register` | Student Registration | Public |
| `/pending-approval` | Approval Waiting Screen | Public |
| `/dashboard` | Role-based Dashboard | All roles |
| `/classes` | My Classes Grid | Student, Doctor |
| `/classes/:id/stream` | Class Discussion | Student, Doctor |
| `/classes/:id/materials` | Class Materials | Student, Doctor |
| `/classes/:id/lectures` | Class Lectures | Student, Doctor |
| `/classes/:id/students` | Class Roster | Doctor only |
| `/classes/:id/grades` | Class Grades | Student, Doctor |
| `/profile` | User Profile | Student, Doctor |
| `/admin/approvals` | Approval Queue | Admin only |
| `/admin/users` | User Management | Admin only |
| `/admin/departments` | Department CRUD | Admin only |
| `/admin/courses` | Course CRUD | Admin only |
| `/admin/classes` | Class Management | Admin only |

---

## 🎨 Design System

- **Primary Color**: Blue (#3b82f6 family)
- **Font**: Inter (Google Fonts)
- **Border Radius**: Rounded-xl/2xl for modern feel
- **Animations**: Fade-in, slide-up, scale-in transitions
- **Components**: Cards with subtle shadows, glassmorphism auth layout
- **Responsive**: Mobile-first with collapsible sidebar

---

## 📄 Database Reference

The frontend is based on the ERD documented in `docs/ERD_final (6).drawio`. Key entities:

- **Users** → Students, Doctors, Admins (ISA hierarchy)
- **Departments** → Courses → Classes (academic hierarchy)
- **Classes** → Lectures → Materials (content hierarchy)
- **Classes** → Questions → Answers (discussion)
- **Grades**, **Attendance**, **Enrollment** (student-class junction)
- **Notifications** (cross-cutting)

---

UniSystem is a multi-service university management project with:

- A Node.js backend API
- A FastAPI AI service for RAG and material workflows
- Qdrant vector storage with in-memory support
- Ollama local model integration
- PDF processing through PyMuPDF
- OCR support through Tesseract
- An optional standalone PDF file server
- A separate frontend app in `frontend/`

## Repository Safety

- Do not commit `.env` files.
- Do not commit local SQLite databases.
- Do not commit uploaded PDFs or generated Office files.
- Do not commit Ollama models.
- Each developer must run `ollama pull qwen2.5:1.5b-instruct` locally.

The root `.gitignore` is configured to ignore local environment files, databases, uploads, generated documents, logs, caches, and dependency folders.

## Setup

### 1. Clone repository

```bash
git clone <repo-url>
cd UniSystem
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend example environment:

```env
PORT=3000
JWT_SECRET=change_me
INTERNAL_API_KEY=change_me
AI_SERVICE_URL=http://localhost:9000
DATABASE_PATH=./database.sqlite
```

Optional note: email verification and password reset flows also need mail-related environment variables such as `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM_NAME`, and `BASE_URL`.

### 3. AI service setup

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 9000
```

AI service example environment:

```env
PORT=9000

BACKEND_API_URL=http://localhost:3000
INTERNAL_API_KEY=change_me

QDRANT_IN_MEMORY=true
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

OLLAMA_URL=http://localhost:11434
QWEN_MODEL=qwen2.5:1.5b-instruct

PDF_BASE_URL=http://localhost:3001
ENABLE_OCR=true
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe

ENABLE_MATERIAL_SUMMARY=false
PDF_CHUNK_SIZE=900
PDF_CHUNK_OVERLAP=150
```

### 4. Ollama setup

Install Ollama from `https://ollama.com`.

Pull the model:

```bash
ollama pull qwen2.5:1.5b-instruct
```

Make sure Ollama runs on:

```text
http://localhost:11434
```

### 5. Tesseract OCR setup

Install Tesseract OCR.

Default Windows path:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Set in `.env`:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
ENABLE_OCR=true
```

### 6. PDF file server setup

```bash
cd pdf-file-server
npm install
cp .env.example .env
npm start
```

Files are served from `DOWNLOADS_DIR` and accessed like:

```text
http://localhost:3001/files/example.pdf
```

PDF file server example environment:

```env
PORT=3001
DOWNLOADS_DIR=C:\Users\ASUS\Downloads
```

### 7. RAG usage

Index a class:

```bash
curl -X POST http://127.0.0.1:9000/rag/index/class/1
```

Ask a question:

```bash
curl -X POST http://127.0.0.1:9000/rag/ask ^
-H "Content-Type: application/json" ^
-d "{\"class_id\":1,\"user_id\":1,\"question\":\"What is Fourier Transform?\"}"
```

Generate a summary:

```bash
curl -X POST http://127.0.0.1:9000/rag/material/summary ^
-H "Content-Type: application/json" ^
-d "{\"class_id\":1,\"material_id\":4,\"mode\":\"simple\"}"
```

## Optional Frontend

The frontend app lives in `frontend/` and can be started separately if you want the full UI:

```bash
cd frontend
npm install
npm run dev
```

## Git Status Safety Check

Run:

```bash
git status
```

Before pushing, confirm that `.env`, databases, PDFs, `node_modules`, `.venv`, and upload folders are not staged.

## Local Run Order

Start the services in this order for a typical local setup:

1. Start Ollama and pull `qwen2.5:1.5b-instruct`.
2. Start the backend on port `3000`.
3. Start the optional PDF file server on port `3001`.
4. Start the AI service on port `9000`.
5. Start the frontend if you want the web UI.

---

## 🆕 Recent Changes

This section documents the changes added on top of the original frontend-only mock and the multi-service split.

### 1. Real backend wiring (no more mock-only)

The frontend now talks to the real Express backend through axios. Toggle with `VITE_USE_MOCK`.

- New: [`frontend/src/services/apiClient.ts`](frontend/src/services/apiClient.ts) — axios instance, JWT injection from the persisted Zustand store, error normalization.
- New: [`frontend/src/services/realServices.ts`](frontend/src/services/realServices.ts) — full implementations for all 13 services.
- Rewritten: [`frontend/src/services/index.ts`](frontend/src/services/index.ts) — picks mock or real based on `VITE_USE_MOCK`.

### 2. API → frontend mapping

Every endpoint in [`api_doc.md`](api_doc.md) is wired to a frontend service / page:

| Endpoint group | Backend route | Frontend caller |
|---|---|---|
| `POST /api/auth/{login,register,profile,forgot-password,reset-password}` | [`backend/routes/auth.js`](backend/routes/auth.js) | `realAuthService` → [`LoginPage`](frontend/src/pages/auth/LoginPage.tsx), [`RegisterPage`](frontend/src/pages/auth/RegisterPage.tsx) |
| `GET/PATCH/POST /api/admin/*` | [`backend/routes/admin.js`](backend/routes/admin.js) | `realAdminService` → [`AdminDashboard`](frontend/src/pages/dashboard/AdminDashboard.tsx), [`ApprovalQueuePage`](frontend/src/pages/admin/ApprovalQueuePage.tsx), [`ManageUsersPage`](frontend/src/pages/admin/ManageUsersPage.tsx) |
| `/api/classes/*` (list, detail, by-doctor, by-student, students, **enroll**, **drop**) | [`backend/routes/classes.js`](backend/routes/classes.js) | `realClassService` → [`MyClassesPage`](frontend/src/pages/classes/MyClassesPage.tsx), [`BrowseClassesPage`](frontend/src/pages/classes/BrowseClassesPage.tsx), [`ClassWorkspacePage`](frontend/src/pages/classes/ClassWorkspacePage.tsx), [`ClassStudentsTab`](frontend/src/pages/classes/ClassStudentsTab.tsx), [`ManageClassesPage`](frontend/src/pages/admin/ManageClassesPage.tsx) |
| `/api/courses/*` | [`backend/routes/courses.js`](backend/routes/courses.js) | `realCourseService` → [`ManageCoursesPage`](frontend/src/pages/admin/ManageCoursesPage.tsx) |
| `/api/departments/*` | [`backend/routes/department.js`](backend/routes/department.js) | `realDepartmentService` → [`ManageDepartmentsPage`](frontend/src/pages/admin/ManageDepartmentsPage.tsx) |
| `/api/doctors/:id/stats` | [`backend/routes/doctor.js`](backend/routes/doctor.js) | `realDoctorService` → [`DoctorDashboard`](frontend/src/pages/dashboard/DoctorDashboard.tsx) |
| `/api/students/*` | [`backend/routes/student.js`](backend/routes/student.js) | `realStudentService` → [`StudentDashboard`](frontend/src/pages/dashboard/StudentDashboard.tsx) |
| `/api/grades/*`, `/api/classes/:id/grades*` | [`backend/routes/grade.js`](backend/routes/grade.js), `routes/classes.js` | `realGradeService` → [`ClassGradesTab`](frontend/src/pages/classes/ClassGradesTab.tsx) |
| `/api/classes/:id/lectures`, `/api/classes/lectures/:id` | [`backend/routes/lecture.js`](backend/routes/lecture.js) | `realLectureService` → [`ClassLecturesTab`](frontend/src/pages/classes/ClassLecturesTab.tsx) |
| `/api/classes/:id/materials`, `/api/materials/:id` | [`backend/routes/material.js`](backend/routes/material.js) | `realMaterialService` → [`ClassMaterialsTab`](frontend/src/pages/classes/ClassMaterialsTab.tsx) |
| `/api/classes/:id/questions`, `/api/questions/:id/answers` | [`backend/routes/classes.js`](backend/routes/classes.js), `routes/questions.js` | `realDiscussionService` → [`ClassStreamTab`](frontend/src/pages/classes/ClassStreamTab.tsx) |
| `/api/attendance/*`, `/api/classes/:id/attendance` | [`backend/routes/attendance.js`](backend/routes/attendance.js), `routes/lecture.js` | `realAttendanceService` |
| `/api/notifications/*` | [`backend/routes/notifications.js`](backend/routes/notifications.js) | `realNotificationService` → [`TopNav`](frontend/src/layouts/TopNav.tsx) |
| `POST /api/classes/:id/ai/ask` | [`backend/routes/aiRoutes.js`](backend/routes/aiRoutes.js) | `aiService.ask` → [`AIChatPanel`](frontend/src/layouts/AIChatPanel.tsx) |
| `GET /api/internal/ai/*` | [`backend/routes/internalAiRoutes.js`](backend/routes/internalAiRoutes.js) | Server-to-server only — called by [`ai-service/backend_client.py`](ai-service/backend_client.py) |
| `POST /rag/{ask,index/*,material/*}` | [`ai-service/main.py`](ai-service/main.py) | Backend `aiController` proxies into it; the frontend never calls the AI service directly. |

### 3. Self-enrollment / drop (any role)

Per request, anyone (student, doctor, admin) can enroll into any open class.

- **Backend:** new `DELETE /api/classes/:classId/enroll/:studentId` in [`classController.js`](backend/controllers/classController.js) and [`routes/classes.js`](backend/routes/classes.js).
- **Frontend:** new [`BrowseClassesPage`](frontend/src/pages/classes/BrowseClassesPage.tsx) — search + Enroll button, capacity-aware, "Enrolled" badge for students. Drop button (X) on each card in [`MyClassesPage`](frontend/src/pages/classes/MyClassesPage.tsx).
- **Routing:** `/classes/browse` added in [`App.tsx`](frontend/src/App.tsx); link added to [`Sidebar`](frontend/src/layouts/Sidebar.tsx) for **all roles**.
- **Mock parity:** `mockClassService.dropStudent` added in [`mockServices.ts`](frontend/src/mock/mockServices.ts) so the UI works in both modes.

### 4. AI Assistant chat sidebar

A collapsible chat panel anchored to the left edge (next to the nav sidebar) — class-aware via the URL.

- New: [`AIChatPanel.tsx`](frontend/src/layouts/AIChatPanel.tsx).
- Mounted in [`DashboardLayout`](frontend/src/layouts/DashboardLayout.tsx); visible app-wide. Inside `/classes/:classId/*` it scopes its questions to that class.
- Calls `POST /api/classes/:classId/ai/ask` → backend proxies to FastAPI `POST /rag/ask` → RAG over class materials, discussions, notes (uses Qdrant + sentence-transformers + Ollama Qwen, see [`ai-service/rag_service.py`](ai-service/rag_service.py)).
- Mock fallback returns a canned answer so the UI stays usable when `VITE_USE_MOCK=true`.

### 5. Dockerization

Three services — `pdf-file-server` is intentionally skipped per the task scope.

| Service | Port | Image |
|---|---|---|
| `backend` | 8000 | [`backend/Dockerfile`](backend/Dockerfile) — node:20-bookworm + sqlite build deps |
| `ai-service` | 8001 | [`ai-service/Dockerfile`](ai-service/Dockerfile) — python:3.11-slim + tesseract |
| `frontend` | 5173 → 80 | [`frontend/Dockerfile`](frontend/Dockerfile) — multi-stage Vite build → nginx with SPA fallback ([`nginx.conf`](frontend/nginx.conf)) |

Run the full stack:

```bash
docker compose up --build
# Frontend → http://localhost:5173
# Backend  → http://localhost:8000
# AI       → http://localhost:8001
```

The compose file ([`docker-compose.yml`](docker-compose.yml)):
- Persists backend uploads + sqlite DB in named volumes.
- Wires the AI service to the backend via the docker network (`http://backend:8000`).
- Uses `host.docker.internal` so the AI container can reach an Ollama instance running on the host.
- Builds the frontend with `VITE_USE_MOCK=false` so it hits the real backend.

> Note: the original local-run order above uses ports `3000` (backend), `9000` (AI). The docker-compose stack uses `8000` and `8001` instead — adjust your `VITE_API_BASE_URL` accordingly when running outside docker.

### 6. Frontend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | Backend API base URL |
| `VITE_AI_BASE_URL` | `http://localhost:9000` | AI service URL (reserved for direct calls) |
| `VITE_USE_MOCK` | `true` (in code) / `false` (in shipped `.env`) | `true` = mocks, `false` = real backend |

A starter [`frontend/.env`](frontend/.env) is now committed pointing at `localhost:3000` with mocks disabled — drop it in alongside the example file.

### 7. `.env` files (now shipped, not just `.example`)

Concrete `.env` files exist for each service so they run out of the box. Replace the dev secrets before deploying.

- [`backend/.env`](backend/.env) — `JWT_SECRET`, `INTERNAL_API_KEY=dev_internal_api_key_123`, `DATABASE_PATH=./database.db`, blank email creds.
- [`ai-service/.env`](ai-service/.env) — same `INTERNAL_API_KEY` (must match the backend's), local-model toggle (`USE_LOCAL_MODEL=true`), Qwen GGUF repo/file, ctx/threads, OCR.
- [`frontend/.env`](frontend/.env) — `VITE_API_BASE_URL=http://localhost:3000/api`, `VITE_USE_MOCK=false`.

> The `INTERNAL_API_KEY` in `backend/.env` and `ai-service/.env` **must be identical** — the AI service sends it as `x-internal-api-key`, the backend's `internalAi` middleware compares them.

### 8. Local 4-bit quantized model (no Ollama)

Replaced the Ollama dependency with `llama-cpp-python` running a GGUF Qwen2.5-1.5B-Instruct **Q4_K_M** model (~1 GB). On first call, the model is downloaded from Hugging Face into `ai-service/models/`.

- New: [`ai-service/local_llm.py`](ai-service/local_llm.py) — singleton `Llama` wrapper, lazy-loads on first generation, downloads via `huggingface_hub`.
- Updated: [`ai-service/qwen_service.py`](ai-service/qwen_service.py) — `_generate_text` routes to `LocalLLM.get().generate(...)` when `USE_LOCAL_MODEL=true` (default), keeps the Ollama path as a fallback.
- Updated: [`ai-service/requirements.txt`](ai-service/requirements.txt) — added `llama-cpp-python` and `huggingface_hub`.
- Updated: [`ai-service/Dockerfile`](ai-service/Dockerfile) — installs `build-essential cmake git` so `llama-cpp-python` can compile, plus a persisted `/app/models` volume in [`docker-compose.yml`](docker-compose.yml) so the GGUF survives container rebuilds.
- Updated: [`ai-service/main.py`](ai-service/main.py) — added a `/health` route and `if __name__ == "__main__"` so `python main.py` starts uvicorn on `$PORT` (default `9000`).

Knobs (in [`ai-service/.env`](ai-service/.env)):

| Variable | Default | Notes |
|---|---|---|
| `USE_LOCAL_MODEL` | `true` | flip to `false` to fall back to Ollama |
| `LOCAL_MODEL_REPO` | `Qwen/Qwen2.5-1.5B-Instruct-GGUF` | HF repo |
| `LOCAL_MODEL_FILE` | `qwen2.5-1.5b-instruct-q4_k_m.gguf` | 4-bit K-quant |
| `LOCAL_MODEL_DIR` | `./models` | local download dir |
| `LOCAL_MODEL_CTX` | `4096` | context window |
| `LOCAL_MODEL_THREADS` | `4` | CPU threads |
| `LOCAL_MODEL_GPU_LAYERS` | `0` | set >0 only if you built `llama-cpp-python` with CUDA/Metal |

Install / run locally:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate         # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
python main.py
# First request will pull ~1 GB GGUF into ai-service/models/, then run fully offline.
```

### 9. Database seeding (Node script)

The encrypted SQLite DB now has a seed script that populates **every table** so the frontend renders real data immediately.

- New: [`backend/seed.js`](backend/seed.js) — drops & recreates schema, inserts admins, doctors, departments, courses, classes, enrollments, lectures, materials, grades, questions/answers, attendance, notifications.
- New scripts in [`backend/package.json`](backend/package.json): `npm run seed`, `npm run seed:replace`, `npm start`.

Because `database.db` is sqlcipher-encrypted (PRAGMA `key='123456'`) and may be locked by a running backend, the seed writes to a fresh `database.seed.db` first. Use `--replace` (or `npm run seed:replace`) to atomically swap it into place.

```bash
cd backend
npm install        # if you haven't yet
npm run seed       # writes ./database.seed.db
# Stop any running backend, then:
npm run seed:replace
npm start
```

**Demo logins** (password = `password123` for all):

| Role | Email |
|---|---|
| Admin | `admin@capital.edu` |
| Doctor | `mohamed.elsayed@capital.edu`, `sara.ibrahim@capital.edu` |
| Student (approved) | `ahmed.hassan@capital.edu`, `mariam.khaled@capital.edu`, `youssef.adel@capital.edu`, `lina.mostafa@capital.edu` |
| Student (pending — admin queue) | `omar.tarek@capital.edu` |

### 10. Backend ↔ frontend connection fixes

Two bugs were silently breaking the real-API path:

- The login response is `{ success, data: { token, user } }`, not `{ success, token, data: user }` as `api_doc.md` claimed. [`realServices.ts`](frontend/src/services/realServices.ts) now reads `body.data.token` / `body.data.user`.
- SQLite stores `Role` as `'Student' | 'Doctor' | 'Admin'` and `Account_Status` as `'pending' | 'approved' | …` — but the backend forwards `Role` capitalized. The frontend types expect lowercase. New [`normalizeUser`](frontend/src/services/apiClient.ts) helper lowercases both fields on every user-shaped response, fixing role-gated routes (`/classes`, admin pages) that were silently 403-ing.

Default ports were also unified to **3000 (backend)** and **9000 (ai-service)** to match the existing `.env.example` files. Docker compose, the frontend `.env`, and the apiClient defaults all use these.

### Summary of files added / changed

**Added**
- `frontend/src/services/apiClient.ts`
- `frontend/src/services/realServices.ts`
- `frontend/src/pages/classes/BrowseClassesPage.tsx`
- `frontend/src/layouts/AIChatPanel.tsx`
- `backend/Dockerfile`, `backend/.dockerignore`
- `ai-service/Dockerfile`, `ai-service/.dockerignore`
- `frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`
- `docker-compose.yml`

**Modified**
- `frontend/src/services/index.ts` — mock/real toggle, new `aiService`
- `frontend/src/mock/mockServices.ts` — `dropStudent` + capacity check on `enrollStudent`
- `frontend/src/pages/classes/MyClassesPage.tsx` — Drop button + Browse link
- `frontend/src/App.tsx` — `/classes/browse` route
- `frontend/src/layouts/Sidebar.tsx` — Browse Classes link for all roles
- `frontend/src/layouts/DashboardLayout.tsx` — mounts `AIChatPanel`
- `backend/controllers/classController.js` — `dropStudent` controller
- `backend/routes/classes.js` — `DELETE /:classId/enroll/:studentId`

---

## 📝 License

This project is developed for Capital University, Faculty of Computer Science.
