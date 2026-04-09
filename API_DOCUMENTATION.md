# Capital University Management System — API Documentation

> **Base URL**: `http://localhost:8000/api`  
> **Auth**: All endpoints (except login/register) require `Authorization: Bearer <token>` header.  
> **Content-Type**: `application/json`

---

## Standard Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

### Error
```json
{
  "success": false,
  "message": "Error description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

---

## 1. Authentication

### POST `/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "ahmed.hassan@capital.edu",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "user_id": "student-1",
      "f_name": "Ahmed",
      "l_name": "Hassan",
      "email": "ahmed.hassan@capital.edu",
      "role": "student",
      "account_status": "approved",
      "image_url": "",
      "created_at": "2024-09-01T08:00:00Z"
    }
  }
}
```

**Errors:**
- `401` — Invalid credentials
- `403` — Account pending approval / rejected

---

### POST `/auth/register`
Register a new student account. Account will be in `pending` status until admin approval.

**Request Body (multipart/form-data):**
```json
{
  "f_name": "Nour",
  "l_name": "Ibrahim",
  "email": "nour.ibrahim@capital.edu",
  "password": "securepass",
  "ssn": "30101051234567",
  "academic_level": 1,
  "department_id": "dept-2",
  "document": "<file upload - national ID>"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user_id": "student-123",
    "f_name": "Nour",
    "l_name": "Ibrahim",
    "email": "nour.ibrahim@capital.edu",
    "role": "student",
    "account_status": "pending",
    "ssn": "30101051234567",
    "academic_level": 1,
    "department_id": "dept-2",
    "total_hours": 0,
    "total_gpa": 0,
    "payment_status": "unpaid",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

---

### GET `/auth/profile`
Get current user profile.

**Response (200):** Returns full user object (Student/Doctor/Admin based on role).

---

## 2. Admin Endpoints

### GET `/admin/stats`
Get system-wide statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_students": 3,
    "total_doctors": 2,
    "total_classes": 6,
    "total_departments": 3,
    "total_courses": 8,
    "pending_approvals": 2
  }
}
```

---

### GET `/admin/students/pending`
Get all students with `account_status = 'pending'`.

**Response:** Array of Student objects.

---

### PUT `/admin/students/:studentId/approve`
Approve a student registration.

**Response:** Updated Student object with `account_status: "approved"`.

---

### PUT `/admin/students/:studentId/reject`
Reject a student registration.

**Response:** Updated Student object with `account_status: "rejected"`.

---

### GET `/admin/students`
Get all students (all statuses).

**Response:** Array of Student objects.

---

### GET `/admin/doctors`
Get all doctors.

**Response:** Array of Doctor objects.

---

### POST `/admin/doctors`
Create a new doctor account.

**Request Body:**
```json
{
  "f_name": "Ahmed",
  "l_name": "Mohamed",
  "email": "ahmed.mohamed@capital.edu",
  "password": "securepass",
  "specialization": "Software Engineering",
  "department_id": "dept-1"
}
```

**Response (201):** Created Doctor object.

---

### POST `/admin/admins`
Create a new admin account.

**Request Body:**
```json
{
  "f_name": "Sara",
  "l_name": "Ahmed",
  "email": "sara.admin@capital.edu",
  "password": "securepass",
  "permissions_level": "admin"
}
```

**Response (201):** Created Admin object.

---

## 3. Departments

### GET `/departments`
Get all departments.

**Response:**
```json
{
  "success": true,
  "data": [
    { "dept_id": "dept-1", "dept_name": "Computer Science" },
    { "dept_id": "dept-2", "dept_name": "Information Systems" },
    { "dept_id": "dept-3", "dept_name": "Artificial Intelligence" }
  ]
}
```

---

### POST `/departments`
Create a new department. *(Admin only)*

**Request Body:**
```json
{ "dept_name": "Data Science" }
```

**Response (201):** Created Department object.

---

### PUT `/departments/:deptId`
Update a department. *(Admin only)*

**Request Body:**
```json
{ "dept_name": "Updated Name" }
```

---

### DELETE `/departments/:deptId`
Delete a department. *(Admin only)*

---

## 4. Courses

### GET `/courses`
Get all courses.

**Response:** Array of Course objects.

**Course Object:**
```json
{
  "course_code": "CS201",
  "name": "Data Structures & Algorithms",
  "credit_hours": 3,
  "department_id": "dept-1"
}
```

---

### GET `/courses?department_id=dept-1`
Get courses filtered by department.

---

### POST `/courses`
Create a new course. *(Admin only)*

**Request Body:**
```json
{
  "course_code": "CS501",
  "name": "Cloud Computing",
  "credit_hours": 3,
  "department_id": "dept-1"
}
```

---

### PUT `/courses/:courseCode`
Update a course. *(Admin only)*

---

### DELETE `/courses/:courseCode`
Delete a course. *(Admin only)*

---

## 5. Classes

### GET `/classes`
Get all classes. *(Admin only)*

**Class Object:**
```json
{
  "class_id": "class-1",
  "course_code": "CS201",
  "course_name": "Data Structures & Algorithms",
  "doctor_id": "doctor-1",
  "doctor_name": "Dr. Mohamed El-Sayed",
  "semester": "Spring",
  "level": 2,
  "capacity": 40,
  "enrolled_count": 28,
  "department_id": "dept-1"
}
```

---

### GET `/classes/:classId`
Get a single class by ID.

---

### GET `/classes/doctor/:doctorId`
Get all classes assigned to a doctor.

---

### GET `/classes/student/:studentId`
Get all classes a student is enrolled in (via Enrollment table).

---

### POST `/classes`
Create a new class instance. *(Admin only)*

**Request Body:**
```json
{
  "course_code": "CS201",
  "doctor_id": "doctor-1",
  "semester": "Fall",
  "level": 2,
  "capacity": 40
}
```

---

### DELETE `/classes/:classId`
Delete a class. *(Admin only)*

---

### GET `/classes/:classId/students`
Get all students enrolled in a class. *(Doctor only)*

---

### POST `/classes/:classId/enroll`
Enroll a student in a class.

**Request Body:**
```json
{ "student_id": "student-1" }
```

---

## 6. Lectures

### GET `/classes/:classId/lectures`
Get all lectures for a class.

**Lecture Object:**
```json
{
  "lec_id": "lec-1",
  "class_id": "class-1",
  "day": "Sunday",
  "time": "09:00",
  "type": "offline",
  "room_id": "Hall-A1",
  "meeting_link": null,
  "title": "Arrays & Linked Lists",
  "date": "2025-02-02"
}
```

---

### POST `/classes/:classId/lectures`
Create a new lecture. *(Doctor only)*

**Request Body:**
```json
{
  "day": "Sunday",
  "time": "09:00",
  "type": "offline",
  "room_id": "Hall-A1",
  "title": "New Topic",
  "date": "2025-03-01"
}
```

For `type: "online"` or `"hybrid"`, include `meeting_link`.

---

### DELETE `/lectures/:lecId`
Delete a lecture. *(Doctor only)*

---

## 7. Materials

### GET `/classes/:classId/materials`
Get all materials for a class.

**Material Object:**
```json
{
  "material_id": "mat-1",
  "lecture_id": "lec-1",
  "class_id": "class-1",
  "name": "Lecture 1 - Arrays Slides",
  "url": "/files/arrays.pdf",
  "type": "pdf",
  "summarize": "Overview of array data structures...",
  "uploaded_at": "2025-02-02T10:00:00Z",
  "uploaded_by": "doctor-1"
}
```

**type** enum: `pdf`, `link`, `video`, `document`, `image`

---

### POST `/classes/:classId/materials`
Upload a new material. *(Doctor only)*

**Request Body (multipart/form-data):**
```json
{
  "name": "Lecture Notes",
  "lecture_id": "lec-1",
  "type": "pdf",
  "summarize": "Optional summary",
  "file": "<uploaded file>"
}
```

Or for links:
```json
{
  "name": "Reference Link",
  "type": "link",
  "url": "https://example.com"
}
```

---

### DELETE `/materials/:materialId`
Delete a material. *(Doctor only)*

---

## 8. Discussion (Questions & Answers)

### GET `/classes/:classId/questions`
Get all questions (with nested answers) for a class.

**Question Object:**
```json
{
  "q_id": "q-1",
  "class_id": "class-1",
  "user_id": "student-1",
  "user_name": "Ahmed Hassan",
  "user_role": "student",
  "user_image": "",
  "text": "Can someone explain...",
  "time": "2025-02-03T14:30:00Z",
  "answers": [
    {
      "a_id": "a-1",
      "question_id": "q-1",
      "user_id": "doctor-1",
      "user_name": "Dr. Mohamed El-Sayed",
      "user_role": "doctor",
      "text": "A singly linked list...",
      "time": "2025-02-03T15:00:00Z"
    }
  ]
}
```

---

### POST `/classes/:classId/questions`
Post a new question. *(Student or Doctor)*

**Request Body:**
```json
{
  "text": "What is the difference between..."
}
```
`user_id`, `user_name`, `user_role` are derived from the auth token.

---

### POST `/questions/:questionId/answers`
Post an answer to a question. *(Student or Doctor)*

**Request Body:**
```json
{
  "text": "The answer is..."
}
```

---

## 9. Grades

### GET `/classes/:classId/grades`
Get grade summaries for all students in a class. *(Doctor only)*

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "student_id": "student-1",
      "student_name": "Ahmed Hassan",
      "class_id": "class-1",
      "midterm": 35,
      "project": 18,
      "practical": 13,
      "attendance_grade": 9,
      "final": null,
      "total": 75,
      "gpa": 3.0
    }
  ]
}
```

---

### GET `/grades/student/:studentId`
Get all grades for a student across all classes.

---

### GET `/classes/:classId/grades/student/:studentId`
Get individual grade entries for a student in a specific class.

**Grade Entry Object:**
```json
{
  "grade_id": "grade-1",
  "class_id": "class-1",
  "student_id": "student-1",
  "type": "midterm",
  "grade": 35,
  "max_grade": 40,
  "generated_at": "2025-03-15T10:00:00Z"
}
```

**type** enum: `midterm`, `final`, `project`, `attendance`, `practical`

---

### POST `/classes/:classId/grades`
Add a grade entry. *(Doctor only)*

**Request Body:**
```json
{
  "student_id": "student-1",
  "type": "midterm",
  "grade": 35,
  "max_grade": 40
}
```

---

## 10. Attendance

### GET `/lectures/:lectureId/attendance`
Get attendance records for a lecture.

**Attendance Object:**
```json
{
  "attendance_id": "att-1",
  "lecture_id": "lec-1",
  "student_id": "student-1",
  "student_name": "Ahmed Hassan",
  "time": "2025-02-02T08:55:00Z",
  "is_verified": true,
  "status": "present"
}
```

**status** enum: `present`, `absent`, `late`, `excused`

---

### GET `/attendance/student/:studentId/class/:classId`
Get all attendance records for a student in a specific class.

---

### POST `/lectures/:lectureId/attendance`
Record attendance (NFC-based). *(Doctor only)*

**Request Body:**
```json
{
  "student_id": "student-1",
  "status": "present",
  "is_verified": true
}
```

---

## 11. Notifications

### GET `/notifications`
Get notifications for the authenticated user (sorted by most recent).

**Notification Object:**
```json
{
  "notification_id": "notif-1",
  "user_id": "student-1",
  "type": "new_material",
  "title": "New Material Uploaded",
  "message": "Dr. Mohamed uploaded slides...",
  "class_id": "class-1",
  "class_name": "Data Structures & Algorithms",
  "reference_id": "mat-3",
  "is_read": false,
  "created_at": "2025-02-05T12:00:00Z"
}
```

**type** enum: `new_material`, `new_question`, `new_answer`, `new_grade`, `announcement`, `approval`, `enrollment`

---

### PUT `/notifications/:notificationId/read`
Mark a notification as read.

---

### PUT `/notifications/read-all`
Mark all notifications as read for the authenticated user.

---

## 12. Student Stats

### GET `/students/:studentId/stats`
Get dashboard statistics for a student.

**Response:**
```json
{
  "success": true,
  "data": {
    "gpa": 3.45,
    "total_hours": 90,
    "enrolled_classes": 3,
    "upcoming_lectures": 10,
    "unread_notifications": 3
  }
}
```

---

## 13. Doctor Stats

### GET `/doctors/:doctorId/stats`
Get dashboard statistics for a doctor.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_classes": 3,
    "total_students": 15,
    "total_lectures": 10,
    "total_materials": 8,
    "recent_questions": 5
  }
}
```

---

## Entity JSON Schemas

### User (Base)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | string (UUID) | auto | Primary key |
| f_name | string | yes | First name |
| l_name | string | yes | Last name |
| email | string | yes | Unique email |
| password | string | yes | Hashed password (never returned) |
| role | enum | yes | `student`, `doctor`, `admin` |
| account_status | enum | auto | `pending`, `approved`, `rejected`, `suspended` |
| document | string | no | Uploaded document filename |
| image_url | string | no | Profile image URL |
| created_at | datetime | auto | ISO 8601 |

### Student (extends User)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| ssn | string(14) | yes | National ID number |
| nfc_tag_id | string | no | NFC tag for attendance |
| academic_level | int (1-4) | yes | Current academic year |
| payment_status | enum | auto | `paid`, `unpaid`, `partial` |
| total_hours | int | auto | Completed credit hours |
| total_gpa | float | auto | Cumulative GPA (0-4) |
| department_id | string (FK) | yes | References Department |

### Doctor (extends User)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| specialization | string | yes | Area of expertise |
| department_id | string (FK) | yes | References Department |

### Admin (extends User)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| permissions_level | string | yes | e.g., `super_admin`, `admin` |

---

## Access Control Matrix

| Endpoint | Student | Doctor | Admin |
|----------|---------|--------|-------|
| Auth (login/register) | ✅ | ✅ | ✅ |
| View own classes | ✅ | ✅ | ❌ |
| Enter class workspace | ✅ | ✅ | ❌ |
| Upload materials | ❌ | ✅ | ❌ |
| Post/answer questions | ✅ | ✅ | ❌ |
| View/manage grades | View own | Full CRUD | ❌ |
| Manage attendance | ❌ | ✅ | ❌ |
| Approve students | ❌ | ❌ | ✅ |
| CRUD departments | ❌ | ❌ | ✅ |
| CRUD courses | ❌ | ❌ | ✅ |
| CRUD classes | ❌ | ❌ | ✅ |
| Create doctors/admins | ❌ | ❌ | ✅ |
