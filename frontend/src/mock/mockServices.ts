// ============================================================
// Mock Services — Simulated API layer with realistic delays
// ============================================================
import type {
  User,
  Student,
  Doctor,
  Admin,
  Department,
  Course,
  Class,
  Lecture,
  Material,
  Attendance,
  Grade,
  Question,
  Answer,
  Enrollment,
  Notification,
  LoginResponse,
  ApiResponse,
  AdminStats,
  FinancialStats,
  DoctorStats,
  StudentStats,
  StudentGradeSummary,
} from "../types";
import {
  mockStudents,
  mockDoctors,
  mockAdmins,
  mockDepartments,
  mockCourses,
  mockClasses,
  mockLectures,
  mockMaterials,
  mockQuestions,
  mockGrades,
  mockAttendance,
  mockEnrollments,
  mockNotifications,
  mockGradeSummaries,
} from "./data";

// Simulate network delay
const delay = (ms: number = 400) =>
  new Promise((r) => setTimeout(r, ms + Math.random() * 400));

// Mutable copies for CRUD operations
let students = [...mockStudents];
let doctors = [...mockDoctors];
let admins = [...mockAdmins];
let departments = [...mockDepartments];
let courses = [...mockCourses];
let classes = [...mockClasses];
let lectures = [...mockLectures];
let materials = [...mockMaterials];
let questions = [...mockQuestions];
let grades = [...mockGrades];
let attendance = [...mockAttendance];
let enrollments = [...mockEnrollments];
let notifications = [...mockNotifications];
const gradeSummaries = [...mockGradeSummaries];

const allUsers: User[] = [...students, ...doctors, ...admins];

// ---- Auth ----
export const mockAuthService = {
  async login(
    email: string,
    _password: string,
  ): Promise<ApiResponse<LoginResponse>> {
    await delay();
    const user = allUsers.find((u) => u.email === email);
    if (!user) throw new Error("Invalid credentials");
    if (user.account_status === "pending")
      throw new Error("Account pending approval");
    if (user.account_status === "rejected")
      throw new Error("Account has been rejected");
    return { success: true, data: { token: `mock-jwt-${user.user_id}`, user } };
  },

  async register(
    data: Omit<Partial<Student>, "document"> & {
      password?: string;
      document?: File | string;
      image?: File;
    },
  ): Promise<ApiResponse<User>> {
    await delay();
    const newStudent: Student = {
      user_id: `student-${Date.now()}`,
      f_name: data.f_name || "",
      l_name: data.l_name || "",
      email: data.email || "",
      role: "student",
      account_status: "pending",
      ssn: data.ssn || "",
      nfc_tag_id: "",
      academic_level: data.academic_level || 1,
      payment_status: "unpaid",
      total_hours: 0,
      total_gpa: 0,
      department_id: data.department_id || "dept-1",
      document:
        typeof data.document === "string"
          ? data.document
          : data.document
            ? (data.document as File).name
            : undefined,
      image_url: "",
      created_at: new Date().toISOString(),
    };
    students.push(newStudent);
    return { success: true, data: newStudent };
  },

  async getProfile(userId: string): Promise<ApiResponse<User>> {
    await delay();
    const user =
      allUsers.find((u) => u.user_id === userId) ||
      students.find((u) => u.user_id === userId);
    if (!user) throw new Error("User not found");
    return { success: true, data: user };
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    await delay();
    return {
      success: true,
      data: null,
      message: "Password reset instructions sent.",
    };
  },

  async resetPassword(
    token: string,
    password: string,
    confirmPassword?: string,
  ): Promise<ApiResponse<null>> {
    await delay();
    return { success: true, data: null, message: "Password reset successful." };
  },

  async verifyEmail(token: string): Promise<ApiResponse<null>> {
    await delay();
    return {
      success: true,
      data: null,
      message: "Email verified successfully.",
    };
  },

  async resendVerification(email: string): Promise<ApiResponse<null>> {
    await delay();
    return { success: true, data: null, message: "Verification email resent." };
  },

  async resendPasswordReset(email: string): Promise<ApiResponse<null>> {
    await delay();
    return {
      success: true,
      data: null,
      message: "Password reset email resent.",
    };
  },
};

// ---- Admin ----
export const mockAdminService = {
  async getStats(deptId?: string): Promise<ApiResponse<AdminStats>> {
    await delay();
    const filteredStudents = deptId
      ? students.filter((s) => s.department_id === deptId)
      : students;
    const filteredDoctors = deptId
      ? doctors.filter((d) => d.department_id === deptId)
      : doctors;
    const filteredCourses = deptId
      ? courses.filter((c) => c.department_id === deptId)
      : courses;
    return {
      success: true,
      data: {
        total_students: filteredStudents.filter(
          (s) => s.account_status === "approved",
        ).length,
        total_doctors: filteredDoctors.length,
        total_classes: classes.length,
        total_departments: departments.length,
        total_courses: filteredCourses.length,
        pending_approvals: filteredStudents.filter(
          (s) => s.account_status === "pending",
        ).length,
      },
    };
  },

  async getPendingStudents(): Promise<ApiResponse<Student[]>> {
    await delay();
    return {
      success: true,
      data: students.filter((s) => s.account_status === "pending"),
    };
  },

  async approveStudent(studentId: string): Promise<ApiResponse<Student>> {
    await delay();
    const student = students.find((s) => s.user_id === studentId);
    if (!student) throw new Error("Student not found");
    student.account_status = "approved";
    return { success: true, data: student };
  },

  async rejectStudent(studentId: string): Promise<ApiResponse<Student>> {
    await delay();
    const student = students.find((s) => s.user_id === studentId);
    if (!student) throw new Error("Student not found");
    student.account_status = "rejected";
    return { success: true, data: student };
  },

  async getAllStudents(deptId?: string): Promise<ApiResponse<Student[]>> {
    await delay();
    return {
      success: true,
      data: deptId
        ? students.filter((s) => s.department_id === deptId)
        : students,
    };
  },

  async getAllDoctors(deptId?: string): Promise<ApiResponse<Doctor[]>> {
    await delay();
    return {
      success: true,
      data: deptId
        ? doctors.filter((d) => d.department_id === deptId)
        : doctors,
    };
  },

  async getAllCourses(deptId?: string): Promise<ApiResponse<Course[]>> {
    await delay();
    return {
      success: true,
      data: deptId
        ? courses.filter((c) => c.department_id === deptId)
        : courses,
    };
  },

  async createDoctor(data: Partial<Doctor>): Promise<ApiResponse<Doctor>> {
    await delay();
    const doc: Doctor = {
      user_id: `doctor-${Date.now()}`,
      f_name: data.f_name || "",
      l_name: data.l_name || "",
      email: data.email || "",
      role: "doctor",
      account_status: "approved",
      specialization: data.specialization || "",
      department_id: data.department_id || "dept-1",
      image_url: "",
      created_at: new Date().toISOString(),
    };
    doctors.push(doc);
    return { success: true, data: doc };
  },

  async createAdmin(data: Partial<Admin>): Promise<ApiResponse<Admin>> {
    await delay();
    const admin: Admin = {
      user_id: `admin-${Date.now()}`,
      f_name: data.f_name || "",
      l_name: data.l_name || "",
      email: data.email || "",
      role: "admin",
      account_status: "approved",
      permissions_level: data.permissions_level ?? 1,
      image_url: "",
      created_at: new Date().toISOString(),
    };
    admins.push(admin);
    return { success: true, data: admin };
  },

  async getFinancialStats(): Promise<ApiResponse<FinancialStats>> {
    await delay();
    return {
      success: true,
      data: {
        total_students: students.length,
        pending_students: students.filter((s) => s.account_status === "pending")
          .length,
        approved_students: students.filter(
          (s) => s.account_status === "approved",
        ).length,
        total_expected: students.length * 5000,
        total_paid:
          students.filter((s) => s.payment_status === "paid").length * 5000,
        total_outstanding:
          students.filter((s) => s.payment_status !== "paid").length * 5000,
      },
    };
  },

  async createStudent(data: Partial<Student>): Promise<ApiResponse<Student>> {
    await delay();
    const student: Student = {
      user_id: `student-${Date.now()}`,
      f_name: data.f_name || "",
      l_name: data.l_name || "",
      email: data.email || "",
      role: "student",
      account_status: "approved",
      ssn: data.ssn || "",
      academic_level: data.academic_level || 1,
      payment_status: "unpaid",
      total_hours: 0,
      total_gpa: 0,
      department_id: data.department_id || "dept-1",
      created_at: new Date().toISOString(),
    };
    students.push(student);
    return { success: true, data: student };
  },

  async getAllAdmins(): Promise<ApiResponse<Admin[]>> {
    await delay();
    return { success: true, data: admins };
  },

  async getAcademicLevelFees(): Promise<ApiResponse<any[]>> {
    await delay();
    return {
      success: true,
      data: [
        { Academic_Level: 1, Total_Fees: 5000, Max_Hours: 18, Min_Hours: 12, Hour_Price: 500 },
        { Academic_Level: 2, Total_Fees: 5000, Max_Hours: 18, Min_Hours: 12, Hour_Price: 500 },
        { Academic_Level: 3, Total_Fees: 6000, Max_Hours: 18, Min_Hours: 12, Hour_Price: 600 },
        { Academic_Level: 4, Total_Fees: 6000, Max_Hours: 18, Min_Hours: 12, Hour_Price: 600 },
        { Academic_Level: 5, Total_Fees: 7000, Max_Hours: 18, Min_Hours: 12, Hour_Price: 700 },
      ],
    };
  },

  async setAcademicLevelFees(
    level: number,
    total_fees?: number,
    max_hours?: number,
    min_hours?: number,
    hour_price?: number,
  ): Promise<ApiResponse<any>> {
    await delay();
    return { success: true, data: null, message: "Settings updated successfully" };
  },
};

// ---- Departments ----
export const mockDepartmentService = {
  async getAll(): Promise<ApiResponse<Department[]>> {
    await delay();
    return { success: true, data: departments };
  },

  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    await delay();
    const dept: Department = {
      dept_id: `dept-${Date.now()}`,
      dept_name: data.dept_name || "",
    };
    departments.push(dept);
    return { success: true, data: dept };
  },

  async update(
    deptId: string,
    data: Partial<Department>,
  ): Promise<ApiResponse<Department>> {
    await delay();
    const dept = departments.find((d) => d.dept_id === deptId);
    if (!dept) throw new Error("Department not found");
    Object.assign(dept, data);
    return { success: true, data: dept };
  },

  async delete(deptId: string): Promise<ApiResponse<null>> {
    await delay();
    departments = departments.filter((d) => d.dept_id !== deptId);
    return { success: true, data: null };
  },
};

// ---- Courses ----
export const mockCourseService = {
  async getAll(): Promise<ApiResponse<Course[]>> {
    await delay();
    return { success: true, data: courses };
  },

  async getByDepartment(deptId: string): Promise<ApiResponse<Course[]>> {
    await delay();
    return {
      success: true,
      data: courses.filter((c) => c.department_id === deptId),
    };
  },

  async create(data: Partial<Course>): Promise<ApiResponse<Course>> {
    await delay();
    const course: Course = {
      course_code: data.course_code || `C${Date.now()}`,
      name: data.name || "",
      credit_hours: data.credit_hours || 3,
      department_id: data.department_id || "dept-1",
    };
    courses.push(course);
    return { success: true, data: course };
  },

  async update(
    code: string,
    data: Partial<Course>,
  ): Promise<ApiResponse<Course>> {
    await delay();
    const course = courses.find((c) => c.course_code === code);
    if (!course) throw new Error("Course not found");
    Object.assign(course, data);
    return { success: true, data: course };
  },

  async delete(code: string): Promise<ApiResponse<null>> {
    await delay();
    courses = courses.filter((c) => c.course_code !== code);
    return { success: true, data: null };
  },

  async getPrerequisites(courseCode: string): Promise<ApiResponse<any[]>> {
    await delay();
    return { success: true, data: [] };
  },
  async addPrerequisite(courseCode: string, prereqCode: string): Promise<ApiResponse<any>> {
    await delay();
    return { success: true, data: null };
  },
  async removePrerequisite(courseCode: string, prereqCode: string): Promise<ApiResponse<any>> {
    await delay();
    return { success: true, data: null };
  },
};

// ---- Classes ----
export const mockClassService = {
  async getAll(): Promise<ApiResponse<Class[]>> {
    await delay();
    return { success: true, data: classes };
  },

  async getById(classId: string): Promise<ApiResponse<Class>> {
    await delay();
    const cls = classes.find((c) => c.class_id === classId);
    if (!cls) throw new Error("Class not found");
    return { success: true, data: cls };
  },

  async getByDoctor(doctorId: string): Promise<ApiResponse<Class[]>> {
    await delay();
    return {
      success: true,
      data: classes.filter((c) => c.doctor_id === doctorId),
    };
  },

  async getByStudent(studentId: string): Promise<ApiResponse<Class[]>> {
    await delay();
    const enrolledClassIds = enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.class_id);
    return {
      success: true,
      data: classes.filter((c) => enrolledClassIds.includes(c.class_id)),
    };
  },

  async create(data: Partial<Class>): Promise<ApiResponse<Class>> {
    await delay();
    const course = courses.find((c) => c.course_code === data.course_code);
    const doctor = doctors.find((d) => d.user_id === data.doctor_id);
    const cls: Class = {
      class_id: `class-${Date.now()}`,
      course_code: data.course_code || "",
      course_name: course?.name || "",
      doctor_id: data.doctor_id || "",
      doctor_name: doctor ? `Dr. ${doctor.f_name} ${doctor.l_name}` : "",
      semester: data.semester || "Fall",
      level: data.level || 1,
      capacity: data.capacity || 30,
      enrolled_count: 0,
      department_id: course?.department_id,
    };
    classes.push(cls);
    return { success: true, data: cls };
  },

  async delete(classId: string): Promise<ApiResponse<null>> {
    await delay();
    classes = classes.filter((c) => c.class_id !== classId);
    return { success: true, data: null };
  },

  async getStudents(classId: string): Promise<ApiResponse<Student[]>> {
    await delay();
    const enrolledStudentIds = enrollments
      .filter((e) => e.class_id === classId)
      .map((e) => e.student_id);
    return {
      success: true,
      data: students.filter((s) => enrolledStudentIds.includes(s.user_id)),
    };
  },

  async enrollStudent(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<Enrollment>> {
    await delay();
    if (
      enrollments.some(
        (e) => e.student_id === studentId && e.class_id === classId,
      )
    ) {
      throw new Error("Already enrolled");
    }
    const cls = classes.find((c) => c.class_id === classId);
    if (
      cls &&
      cls.enrolled_count !== undefined &&
      cls.enrolled_count >= cls.capacity
    ) {
      throw new Error("Class is full");
    }
    const enrollment: Enrollment = {
      enrollment_id: `enr-${Date.now()}`,
      student_id: studentId,
      class_id: classId,
      enrolled_at: new Date().toISOString(),
    };
    enrollments.push(enrollment);
    if (cls && cls.enrolled_count !== undefined) cls.enrolled_count++;
    return { success: true, data: enrollment };
  },

  async dropStudent(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<null>> {
    await delay();
    enrollments = enrollments.filter(
      (e) => !(e.class_id === classId && e.student_id === studentId),
    );
    const cls = classes.find((c) => c.class_id === classId);
    if (cls && cls.enrolled_count !== undefined && cls.enrolled_count > 0)
      cls.enrolled_count--;
    return { success: true, data: null };
  },
};

// ---- Lectures ----
export const mockLectureService = {
  async getByClass(classId: string): Promise<ApiResponse<Lecture[]>> {
    await delay();
    return {
      success: true,
      data: lectures.filter((l) => l.class_id === classId),
    };
  },

  async create(data: Partial<Lecture>): Promise<ApiResponse<Lecture>> {
    await delay();
    const lecture: Lecture = {
      lec_id: `lec-${Date.now()}`,
      class_id: data.class_id || "",
      day: data.day || "",
      time: data.time || "",
      type: data.type || "offline",
      meeting_link: data.meeting_link,
      room_id: data.room_id,
      title: data.title,
      date: data.date,
    };
    lectures.push(lecture);
    return { success: true, data: lecture };
  },

  async delete(lecId: string): Promise<ApiResponse<null>> {
    await delay();
    lectures = lectures.filter((l) => l.lec_id !== lecId);
    return { success: true, data: null };
  },
};

// ---- Materials ----
export const mockMaterialService = {
  async getByClass(classId: string): Promise<ApiResponse<Material[]>> {
    await delay();
    return {
      success: true,
      data: materials.filter((m) => m.class_id === classId),
    };
  },

  async upload(
    data: Partial<Material> & { class_id: string; file?: File },
  ): Promise<ApiResponse<Material>> {
    await delay();
    const mat: Material = {
      material_id: `mat-${Date.now()}`,
      lecture_id: data.lecture_id,
      class_id: data.class_id || "",
      name: data.name || "",
      url: data.url || "/files/uploaded_file.pdf",
      type: data.type || "pdf",
      summarize: data.summarize,
      document: data.document,
      uploaded_at: new Date().toISOString(),
      uploaded_by: data.uploaded_by || "",
    };
    materials.push(mat);
    return { success: true, data: mat };
  },

  async delete(matId: string): Promise<ApiResponse<null>> {
    await delay();
    materials = materials.filter((m) => m.material_id !== matId);
    return { success: true, data: null };
  },
};

// ---- Discussion ----
export const mockDiscussionService = {
  async getQuestions(classId: string): Promise<ApiResponse<Question[]>> {
    await delay();
    return {
      success: true,
      data: questions.filter((q) => q.class_id === classId),
    };
  },

  async postQuestion(data: Partial<Question>): Promise<ApiResponse<Question>> {
    await delay();
    const q: Question = {
      q_id: `q-${Date.now()}`,
      class_id: data.class_id || "",
      user_id: data.user_id || "",
      user_name: data.user_name || "",
      user_role: data.user_role || "student",
      user_image: data.user_image,
      text: data.text || "",
      time: new Date().toISOString(),
      answers: [],
    };
    questions.push(q);
    return { success: true, data: q };
  },

  async postAnswer(
    questionId: string,
    data: Partial<Answer>,
  ): Promise<ApiResponse<Answer>> {
    await delay();
    const a: Answer = {
      a_id: `a-${Date.now()}`,
      question_id: questionId,
      user_id: data.user_id || "",
      user_name: data.user_name || "",
      user_role: data.user_role || "student",
      user_image: data.user_image,
      text: data.text || "",
      time: new Date().toISOString(),
    };
    const q = questions.find((q) => q.q_id === questionId);
    if (q) q.answers.push(a);
    return { success: true, data: a };
  },
};

// ---- Grades ----
export const mockGradeService = {
  async getByClass(
    classId: string,
  ): Promise<ApiResponse<StudentGradeSummary[]>> {
    await delay();
    return {
      success: true,
      data: gradeSummaries.filter((g) => g.class_id === classId),
    };
  },

  async getByStudent(studentId: string): Promise<ApiResponse<Grade[]>> {
    await delay();
    return {
      success: true,
      data: grades.filter((g) => g.student_id === studentId),
    };
  },

  async getStudentClassGrades(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<Grade[]>> {
    await delay();
    return {
      success: true,
      data: grades.filter(
        (g) => g.class_id === classId && g.student_id === studentId,
      ),
    };
  },

  async addGrade(data: Partial<Grade>): Promise<ApiResponse<Grade>> {
    await delay();
    const grade: Grade = {
      grade_id: `grade-${Date.now()}`,
      class_id: data.class_id || "",
      student_id: data.student_id || "",
      student_name: data.student_name,
      type: data.type || "midterm",
      grade: data.grade || 0,
      max_grade: data.max_grade || 100,
      generated_at: new Date().toISOString(),
      gpa: data.gpa ?? 0,
      attendance: data.attendance ?? 0,
      practical: data.practical ?? 0,
      project: data.project ?? 0,
      midterm: data.midterm ?? 0,
      final: data.final ?? 0,
    };
    grades.push(grade);
    return { success: true, data: grade };
  },
};

// ---- Attendance ----
export const mockAttendanceService = {
  async getByLecture(lectureId: string): Promise<ApiResponse<Attendance[]>> {
    await delay();
    return { success: true, data: attendance.filter((a) => a.lec_id === lectureId) };
  },

  async getByStudentAndClass(studentId: string, classId: string): Promise<ApiResponse<Attendance[]>> {
    await delay();
    const classLectureIds = lectures.filter((l) => l.class_id === classId).map((l) => l.lec_id);
    return {
      success: true,
      data: attendance.filter((a) => a.student_id === studentId && classLectureIds.includes(a.lec_id)),
    };
  },

  async record(data: Partial<Attendance>): Promise<ApiResponse<Attendance>> {
    await delay();
    const att: Attendance = {
      attendance_id: `att-${Date.now()}`,
      lec_id: data.lec_id || "",
      student_id: data.student_id || "",
      student_name: data.student_name,
      time: new Date().toISOString(),
      early_check: data.early_check ?? 1,
      late_check: data.late_check ?? 0,
      method: data.method || "manual",
    };
    attendance.push(att);
    return { success: true, data: att };
  },
};

// ---- Notifications ----
export const mockNotificationService = {
  async getByUser(userId: string): Promise<ApiResponse<Notification[]>> {
    await delay();
    return {
      success: true,
      data: notifications
        .filter((n) => n.user_id === userId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
    };
  },

  async markAsRead(notificationId: string): Promise<ApiResponse<null>> {
    await delay();
    const notif = notifications.find(
      (n) => n.notification_id === notificationId,
    );
    if (notif) notif.is_read = true;
    return { success: true, data: null };
  },

  async markAllAsRead(userId: string): Promise<ApiResponse<null>> {
    await delay();
    notifications
      .filter((n) => n.user_id === userId)
      .forEach((n) => (n.is_read = true));
    return { success: true, data: null };
  },
};

// ---- Doctor Stats ----
export const mockDoctorService = {
  async getStats(doctorId: string): Promise<ApiResponse<DoctorStats>> {
    await delay();
    const doctorClasses = classes.filter((c) => c.doctor_id === doctorId);
    const classIds = doctorClasses.map((c) => c.class_id);
    return {
      success: true,
      data: {
        total_classes: doctorClasses.length,
        total_students: enrollments.filter((e) => classIds.includes(e.class_id))
          .length,
        total_lectures: lectures.filter((l) => classIds.includes(l.class_id))
          .length,
        total_materials: materials.filter((m) => classIds.includes(m.class_id))
          .length,
        recent_questions: questions.filter((q) => classIds.includes(q.class_id))
          .length,
        class_enrollment_data: doctorClasses.map((c) => ({
          id: Number(c.class_id.replace(/\D/g, "")) || 0,
          name: c.course_name || c.course_code,
          students: enrollments.filter((e) => e.class_id === c.class_id).length,
        })),
        upcoming_lectures: lectures
          .filter((l) => classIds.includes(l.class_id))
          .slice(0, 3)
          .map((l) => ({
            id: Number(l.lec_id.replace(/\D/g, "")) || 0,
            title: l.title || "",
            date: l.date || "",
            course:
              doctorClasses.find((c) => c.class_id === l.class_id)
                ?.course_name || "",
          })),
      },
    };
  },
};

// ---- Student Stats ----
export const mockStudentService = {
  async getStats(studentId: string): Promise<ApiResponse<StudentStats>> {
    await delay();
    const student = students.find((s) => s.user_id === studentId);
    const enrolledClassIds = enrollments
      .filter((e) => e.student_id === studentId)
      .map((e) => e.class_id);
    return {
      success: true,
      data: {
        gpa: student?.total_gpa || 0,
        total_hours: student?.total_hours || 0,
        enrolled_classes: enrolledClassIds.length,
        upcoming_lectures: lectures.filter((l) =>
          enrolledClassIds.includes(l.class_id),
        ).length,
        unread_notifications: notifications.filter(
          (n) => n.user_id === studentId && !n.is_read,
        ).length,
      },
    };
  },
  async getTranscript(studentId: string): Promise<ApiResponse<any>> {
    await delay();
    return { success: true, data: {} };
  },
  async getPayment(studentId: string): Promise<ApiResponse<any>> {
    await delay();
    return { success: true, data: {} };
  },
};

export const mockRoomService = {
  async getAll(): Promise<ApiResponse<any[]>> {
    await delay();
    return { success: true, data: [
      { Room_ID: 'H1-101', Room_Name: 'Hall A — 101', Capacity: 60, Type: 'Lecture', Location: 'Building H1, Floor 1' },
      { Room_ID: 'H1-102', Room_Name: 'Hall A — 102', Capacity: 60, Type: 'Lecture', Location: 'Building H1, Floor 1' },
    ] };
  },
  async getEmpty(date?: string, time?: string): Promise<ApiResponse<any[]>> {
    await delay();
    return { success: true, data: [
      { Room_ID: 'H1-101', Room_Name: 'Hall A — 101', Capacity: 60, Type: 'Lecture', Location: 'Building H1, Floor 1' },
    ] };
  },
};
