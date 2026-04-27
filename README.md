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

## 📝 License

This project is developed for Capital University, Faculty of Computer engineering.
