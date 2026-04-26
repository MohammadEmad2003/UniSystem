# UniSystem API Documentation

This document provides a comprehensive overview of all API endpoints available in both the backend (Node.js/Express) and AI service (FastAPI/Python) of the UniSystem project. Each endpoint includes its method, path, required authentication, request parameters, and response structure.

---

## Table of Contents
- [Backend API](#backend-api)
  - [Auth](#auth)
  - [Admin](#admin)
  - [Classes](#classes)
  - [Attendance](#attendance)
  - [Courses](#courses)
  - [Departments](#departments)
  - [Doctor](#doctor)
  - [Grade](#grade)
  - [Lecture](#lecture)
  - [Material](#material)
  - [Notifications](#notifications)
  - [Questions/Discussion](#questionsdiscussion)
  - [Student](#student)
  - [AI Routes](#ai-routes)
  - [Internal AI Routes](#internal-ai-routes)
- [AI Service API](#ai-service-api)

---

## Backend API


### Auth

#### POST `/api/auth/register`
**Request (multipart/form-data):**
```
{
  f_name: string,
  l_name: string,
  email: string,
  password: string,
  ssn: string,
  academic_level: string,
  department_id: string,
  image: file (optional),
  document: file (optional)
}
```
**Response:**
```
{
  success: true,
  data: { ...user fields... },
  message: string
}
```

#### POST `/api/auth/login`
**Request:**
```
{
  email: string,
  password: string
}
```
**Response:**
```
{
  success: true,
  token: string,
  data: { ...user fields... }
}
```

#### GET `/api/auth/profile`
**Headers:** `Authorization: Bearer <token>`
**Response:**
```
{
  success: true,
  data: { ...user fields... }
}
```

#### GET `/api/auth/verify/:token`
**Response:**
```
{
  success: true,
  message: string
}
```

#### POST `/api/auth/forgot-password`
**Request:**
```
{
  email: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### POST `/api/auth/reset-password/:token`
**Request:**
```
{
  password: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### POST `/api/auth/resend-verification`
**Request:**
```
{
  email: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### POST `/api/auth/resend-password-reset`
**Request:**
```
{
  email: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```


### Admin (Requires ADMIN role)

#### GET `/api/admin/stats`
**Response:**
```
{
  success: true,
  data: {
    total_students: number,
    total_doctors: number,
    total_classes: number,
    total_departments: number,
    total_courses: number,
    pending_approvals: number
  }
}
```

#### GET `/api/admin/students/pending`
**Response:**
```
{
  success: true,
  data: [ { ...student fields... } ]
}
```

#### GET `/api/admin/students`
**Response:**
```
{
  success: true,
  data: [ { ...student fields... } ]
}
```

#### PATCH `/api/admin/students/:studentId/status`
**Request:**
```
{
  status: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### GET `/api/admin/doctors`
**Response:**
```
{
  success: true,
  data: [ { ...doctor fields... } ]
}
```

#### POST `/api/admin/doctors`
**Request:**
```
{
  f_name: string,
  l_name: string,
  email: string,
  password: string,
  department_id: string,
  specialization: string
}
```
**Response:**
```
{
  success: true,
  data: { ...doctor fields... },
  message: string
}
```

#### POST `/api/admin/admins`
**Request:**
```
{
  f_name: string,
  l_name: string,
  email: string,
  password: string,
  permissions_level: string
}
```
**Response:**
```
{
  success: true,
  data: { ...admin fields... },
  message: string
}
```


### Classes

#### GET `/api/classes/`
**Response:**
```
{
  success: true,
  data: [ { ...class fields... } ]
}
```

#### GET `/api/classes/doctor/:doctorId`
**Response:**
```
{
  success: true,
  data: [ { ...class fields... } ]
}
```

#### GET `/api/classes/student/:studentId`
**Response:**
```
{
  success: true,
  data: [ { ...class fields... } ]
}
```

#### GET `/api/classes/:classId`
**Response:**
```
{
  success: true,
  data: { ...class fields... }
}
```

#### GET `/api/classes/:classId/students`
**Response:**
```
{
  success: true,
  data: [ { ...student fields... } ]
}
```

#### GET `/api/classes/:classId/questions`
**Response:**
```
{
  success: true,
  data: [ { ...question fields... } ]
}
```

#### GET `/api/classes/:classId/grades`
**Response:**
```
{
  success: true,
  data: [ { ...grade fields... } ]
}
```

#### GET `/api/classes/:classId/grades/student/:studentId`
**Response:**
```
{
  success: true,
  data: [ { ...grade fields... } ]
}
```

#### POST `/api/classes/`
**Request:**
```
{
  ...class fields...
}
```
**Response:**
```
{
  success: true,
  data: { ...class fields... },
  message: string
}
```

#### POST `/api/classes/:classId/enroll`
**Request:**
```
{
  student_id: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### POST `/api/classes/:classId/questions`
**Request:**
```
{
  title: string,
  content: string
}
```
**Response:**
```
{
  success: true,
  data: { ...question fields... },
  message: string
}
```

#### POST `/api/classes/:classId/grades`
**Request:**
```
{
  student_id: string,
  grade: number,
  ...other grade fields...
}
```
**Response:**
```
{
  success: true,
  data: { ...grade fields... },
  message: string
}
```

#### DELETE `/api/classes/:classId`
**Response:**
```
{
  success: true,
  message: string
}
```


### Attendance

#### GET `/api/attendance/student/:studentId/class/:classId`
**Response:**
```
{
  success: true,
  data: [
    {
      Attendance_ID: number,
      Lec_ID: number,
      Student_ID: number,
      Student_Name: string,
      Time: string,
      Is_Verified: boolean,
      Status: string
    },
    ...
  ]
}
```


### Courses

#### GET `/api/courses/`
**Query:** `department_id` (optional)
**Response:**
```
{
  success: true,
  data: [ { course_code, name, credit_hours, department_id } ],
  message: string
}
```

#### POST `/api/courses/`
**Request:**
```
{
  course_code: string,
  name: string,
  credit_hours: number,
  department_id: string
}
```
**Response:**
```
{
  success: true,
  data: { course_code, name, credit_hours, department_id },
  message: string
}
```

#### GET `/api/courses/:courseCode`
**Response:**
```
{
  success: true,
  data: { course_code, name, credit_hours, department_id },
  message: string
}
```

#### PATCH `/api/courses/:courseCode`
**Request:**
```
{
  ...fields to update...
}
```
**Response:**
```
{
  success: true,
  data: { ...updated course fields... },
  message: string
}
```

#### DELETE `/api/courses/:courseCode`
**Response:**
```
{
  success: true,
  message: string
}
```


### Departments

#### GET `/api/department/`
**Response:**
```
{
  success: true,
  data: [ { ...department fields... } ],
  message: string
}
```

#### POST `/api/department/`
**Request:**
```
{
  Dept_Name: string,
  ...other department fields...
}
```
**Response:**
```
{
  success: true,
  data: { ...department fields... },
  message: string
}
```

#### GET `/api/department/:departmentId`
**Response:**
```
{
  success: true,
  data: { ...department fields... },
  message: string
}
```

#### PATCH `/api/department/:departmentId`
**Request:**
```
{
  ...fields to update...
}
```
**Response:**
```
{
  success: true,
  data: { ...updated department fields... },
  message: string
}
```

#### DELETE `/api/department/:departmentId`
**Response:**
```
{
  success: true,
  message: string
}
```

#### PATCH `/api/department/:departmentId/assigndoctor`
**Request:**
```
{
  doctor_id: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```

#### PATCH `/api/department/:departmentId/setpermission`
**Request:**
```
{
  permission: string
}
```
**Response:**
```
{
  success: true,
  message: string
}
```


### Doctor

#### GET `/api/doctor/:doctorId/stats`
**Response:**
```
{
  success: true,
  data: {
    total_classes: number,
    total_students: number,
    total_lectures: number,
    total_materials: number,
    recent_questions: number
  }
}
```


### Grade

#### GET `/api/grade/student/:studentId`
**Response:**
```
{
  success: true,
  data: [
    {
      grade_id: number,
      student_id: number,
      class_id: number,
      course_code: string,
      level: string,
      semester: string,
      type: string,
      attendance: number,
      practical: number,
      project: number,
      midterm: number,
      final: number,
      gpa: number,
      doctor_id: number,
      generated_at: string
    },
    ...
  ],
  total: number
}
```


### Lecture

#### GET `/api/lecture/:classId/lectures`
**Response:**
```
{
  success: true,
  data: [ { ...lecture fields... } ]
}
```

#### POST `/api/lecture/:classId/lectures`
**Request:**
```
{
  day: string,
  time: string,
  type: string,
  room_id: string (optional),
  title: string,
  date: string,
  meeting_link: string (optional)
}
```
**Response:**
```
{
  success: true,
  message: string,
  data: { Lec_ID: number, ...lecture fields... }
}
```

#### DELETE `/api/lecture/lectures/:lecId`
**Response:**
```
{
  success: true,
  message: string
}
```

#### GET `/api/lecture/:lectureId/attendance`
**Response:**
```
{
  success: true,
  data: [ { ...attendance fields... } ]
}
```

#### POST `/api/lecture/:lectureId/attendance`
**Request:**
```
{
  student_id: string,
  status: string,
  is_verified: boolean (optional)
}
```
**Response:**
```
{
  success: true,
  message: string
}
```


### Material

#### POST `/api/material/:classId/materials`
**Request (multipart/form-data):**
```
{
  name: string,
  lecture_id: string,
  type: string, // 'link' or 'file'
  summarize: boolean,
  url: string (if type is 'link'),
  document: file (if type is 'file')
}
```
**Response:**
```
{
  success: true,
  message: string,
  data: {
    id: number,
    name: string,
    lecture_id: string,
    type: string,
    url: string | null,
    document: string | null,
    summarize: boolean
  }
}
```

#### GET `/api/material/:classId/materials`
**Response:**
```
{
  success: true,
  data: [ { ...material fields... } ]
}
```

#### GET `/api/material/lectures/:lectureId/materials`
**Response:**
```
{
  success: true,
  data: [ { ...material fields... } ]
}
```

#### DELETE `/api/material/materials/:materialId`
**Response:**
```
{
  success: true,
  message: string
}
```


### Notifications

#### GET `/api/notifications/`
**Query:** `page` (optional)
**Response:**
```
{
  success: true,
  data: [ { ...notification fields... } ]
}
```

#### PUT `/api/notifications/read-all`
**Response:**
```
{
  success: true,
  message: string
}
```

#### PUT `/api/notifications/:notificationId/read`
**Response:**
```
{
  success: true,
  message: string
}
```

#### GET `/api/notifications/unread-count`
**Response:**
```
{
  success: true,
  data: number
}
```


### Questions/Discussion

#### POST `/api/questions/:questionId/answers`
**Request:**
```
{
  content: string
}
```
**Response:**
```
{
  success: true,
  data: { ...answer fields... },
  message: string
}
```


### Student

#### GET `/api/students/:studentId/stats`
**Response:**
```
{
  success: true,
  data: {
    gpa: number,
    total_hours: number,
    enrolled_classes: number,
    upcoming_lectures: number,
    unread_notifications: number
  }
}
```

#### GET `/api/students/`
**Response:**
```
{
  success: true,
  data: [ { ...student fields... } ]
}
```


### AI Routes

#### POST `/api/classes/:classId/ai/ask`
**Request:**
```
{
  question: string
}
```
**Response:**
```
{
  success: true,
  data: { answer: string, ... },
  message: string
}
```


### Internal AI Routes (Requires Internal API Key)

#### GET `/api/internal/ai/classes/:classId/questions`
**Headers:** `x-internal-api-key: <key>`
**Response:**
```
{
  data: [ { ...question fields... } ]
}
```

#### GET `/api/internal/ai/classes/:classId/materials`
**Headers:** `x-internal-api-key: <key>`
**Response:**
```
{
  data: [ { ...material fields... } ]
}
```

#### GET `/api/internal/ai/questions/:questionId`
**Headers:** `x-internal-api-key: <key>`
**Response:**
```
{
  data: { ...question fields... }
}
```

#### GET `/api/internal/ai/materials/:materialId`
**Headers:** `x-internal-api-key: <key>`
**Response:**
```
{
  data: { ...material fields... }
}
```

---


## PDF File Server API

### GET `/`
**Response:**
```
{
  success: true,
  message: "PDF file server is running",
  usage: "/files/<filename>"
}
```

### GET `/health`
**Response:**
```
{
  success: true,
  message: "PDF file server is running",
  files_route: "/files"
}
```

### GET `/files/*filePath`
**Request:**
- Path: `/files/<relative_path_to_file>` (relative to server's DOWNLOADS_DIR)

**Response (Success):**
- Returns the requested file as a download/stream.

**Response (Error):**
```
{
  success: false,
  message: "File not found" | "Access to this file path is not allowed" | "File path is required"
}
```

### 404 Handler
**Response:**
```
{
  success: false,
  message: "Route not found"
}
```

### Error Handler
**Response:**
```
{
  success: false,
  message: "Internal server error" | <error message>
}
```

---

## AI Service API (FastAPI)


### AI Service API (FastAPI)

#### POST `/rag/ask`
**Request:**
```
{
  class_id: int,
  user_id: int,
  question: string
}
```
**Response:**
```
{
  answer: string,
  ...other fields...
}
```

#### POST `/rag/index/class/{class_id}`
**Response:**
```
{
  ...indexing result fields...
}
```

#### POST `/rag/index/question/{question_id}`
**Request:** (optional)
```
{
  ...any JSON...
}
```
**Response:**
```
{
  ...indexing result fields...
}
```

#### POST `/rag/index/material/{material_id}`
**Request:** (optional)
```
{
  ...any JSON...
}
```
**Response:**
```
{
  ...indexing result fields...
}
```

#### POST `/rag/material/summary`
**Request:**
```
{
  class_id: int,
  material_id: int,
  mode: string (default: "simple")
}
```
**Response:**
```
{
  summary: string,
  ...other fields...
}
```

#### POST `/rag/material/page-summaries`
**Request:**
```
{
  class_id: int,
  material_id: int
}
```
**Response:**
```
{
  page_summaries: [string],
  ...other fields...
}
```

#### POST `/rag/material/notes`
**Request:**
```
{
  class_id: int,
  material_id: int
}
```
**Response:**
```
{
  notes: string,
  ...other fields...
}
```

#### POST `/rag/material/quiz`
**Request:**
```
{
  class_id: int,
  material_id: int,
  num_questions: int (default: 5)
}
```
**Response:**
```
{
  quiz: [ { question: string, options: [string], answer: string } ],
  ...other fields...
}
```

#### POST `/rag/material/flashcards`
**Request:**
```
{
  class_id: int,
  material_id: int,
  num_cards: int (default: 10)
}
```
**Response:**
```
{
  flashcards: [ { front: string, back: string } ],
  ...other fields...
}
```

---


## Notes
- All backend endpoints (except `/auth/*` and `/internal/ai/*`) require a valid JWT token in the `Authorization` header.
- Internal AI endpoints require a special API key in the `x-internal-api-key` header.
- File upload endpoints require `multipart/form-data`.
- For detailed request/response schemas, refer to the controller and model code.

---

*This documentation was generated by analyzing the source code. For the most up-to-date details, always refer to the codebase.*
