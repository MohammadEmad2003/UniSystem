// ============================================================
// Capital University Management System — Type Definitions
// Based on ERD_final (6).drawio database schema
// ============================================================

// ---- Enums ----

export type UserRole = "student" | "doctor" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected" | "suspended";
export type PaymentStatus = "paid" | "unpaid" | "partial";
export type LectureType =
  | "Lecture"
  | "Section"
  | "Lab"
  | "Online"
  | "offline"
  | "online"
  | "hybrid";
export type MaterialType = "pdf" | "link" | "video" | "document" | "image";
export type GradeType =
  | "midterm"
  | "final"
  | "project"
  | "attendance"
  | "practical";
export type AttendanceStatus = "present" | "absent" | "late" | "excused";
export type NotificationType =
  | "new_material"
  | "new_question"
  | "new_answer"
  | "new_grade"
  | "announcement"
  | "approval"
  | "enrollment";
export type AcademicLevel = 1 | 2 | 3 | 4;
export type Semester = "Fall" | "Spring" | "Summer";

// ---- Base Entities ----

export interface User {
  user_id: string;
  f_name: string;
  l_name: string;
  email: string;
  password?: string;
  role: UserRole;
  account_status: AccountStatus;
  document?: string;
  image_url?: string;
  created_at: string;
}

export interface Student extends User {
  role: "student";
  ssn: string;
  nfc_tag_id?: string;
  academic_level: AcademicLevel;
  payment_status: PaymentStatus;
  total_hours: number;
  total_gpa: number;
  department_id: string;
  paid_amount?: number;
  total_fees?: number;
}

export interface Doctor extends User {
  role: "doctor";
  specialization: string;
  department_id: string;
}

export interface Admin extends User {
  role: "admin";
  permissions_level: number;
}

// ---- Academic Structure ----

export interface Department {
  dept_id: string;
  dept_name: string;
}

export interface Course {
  course_code: string;
  name: string;
  credit_hours: number;
  department_id: string;
}

export interface Class {
  class_id: string;
  course_code: string;
  course_name?: string;
  doctor_id: string;
  doctor_name?: string;
  semester: Semester;
  level: AcademicLevel;
  capacity: number;
  enrolled_count?: number;
  department_id?: string;
}

// ---- Class Content ----

export interface Lecture {
  lec_id: string;
  class_id: string;
  day: string;
  time: string;
  type: LectureType;
  meeting_link?: string;
  room_id?: string;
  title?: string;
  date?: string;
}

export interface Material {
  material_id: string;
  lecture_id?: string;
  class_id: string;
  name: string;
  url: string;
  type: MaterialType;
  summarize?: string;
  document?: string;
  file?: File;
  uploaded_at: string;
  uploaded_by: string;
}

export interface Attendance {
  attendance_id: string;
  lecture_id: string;
  student_id: string;
  student_name?: string;
  time: string;
  is_verified: boolean;
  status: AttendanceStatus;
}

// ---- Grades ----

export interface Grade {
  grade_id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  course_code?: string;
  course_name?: string;
  level?: number;
  semester?: string;
  type: GradeType;
  attendance: number;
  practical: number;
  project: number;
  midterm: number;
  final: number;
  gpa: number;
  generated_at: string;
  // New optional fields for adding grades via API
  grade?: number;
  max_grade?: number;
}

export interface StudentGradeSummary {
  student_id: string;
  student_name: string;
  class_id: string;
  midterm?: number;
  final?: number;
  project?: number;
  practical?: number;
  attendance?: number;
  total: number;
  gpa: number;
}

// ---- Discussion (Q&A) ----

export interface Question {
  q_id: string;
  class_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  user_image?: string;
  text: string;
  time: string;
  answers: Answer[];
}

export interface Answer {
  a_id: string;
  question_id: string;
  user_id: string;
  user_name: string;
  user_role: UserRole;
  user_image?: string;
  text: string;
  time: string;
}

// ---- Enrollment ----

export interface Enrollment {
  enrollment_id: string;
  student_id: string;
  class_id: string;
  enrolled_at: string;
}

// ---- Notifications ----

export interface Notification {
  notification_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  class_id?: string;
  class_name?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

// ---- API Response Wrappers ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  f_name: string;
  l_name: string;
  email: string;
  password: string;
  role: "student";
  ssn: string;
  academic_level: AcademicLevel;
  department_id: string;
  document?: File;
}

// ---- Dashboard Stats ----

export interface AdminStats {
  total_students: number;
  total_doctors: number;
  total_classes: number;
  total_departments: number;
  total_courses: number;
  pending_approvals: number;
}

export interface DoctorStats {
  total_classes: number;
  total_students: number;
  total_lectures: number;
  total_materials: number;
  recent_questions: number;
  class_enrollment_data: { id: number; name: string; students: number }[];
  upcoming_lectures: {
    id: number;
    title: string;
    date: string;
    course: string;
  }[];
}

export interface StudentStats {
  gpa: number;
  total_hours: number;
  enrolled_classes: number;
  upcoming_lectures: number;
  unread_notifications: number;
}

export interface FinancialStats {
  total_students: number;
  pending_students: number;
  approved_students: number;
  total_expected: number;
  total_paid: number;
  total_outstanding: number;
}
