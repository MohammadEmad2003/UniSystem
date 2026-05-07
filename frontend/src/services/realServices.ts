// Real backend services. Each function returns { success, data, message? }
// to match the existing mock service shape so pages don't need changes.
import axios from "axios";
import { apiClient, normalizeUser, AI_BASE_URL } from "./apiClient";
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
  DoctorStats,
  StudentStats,
  StudentGradeSummary,
  FinancialStats,
} from "../types";

const ok = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

// ---- Auth (POST /api/auth/*) ----
export const realAuthService = {
  async login(
    email: string,
    password: string,
  ): Promise<ApiResponse<LoginResponse>> {
    const res = await apiClient.post("/auth/login", { email, password });
    // Backend returns { success, data: { token, user } }
    const body = res.data?.data || res.data;
    const token = body.token;
    const user = normalizeUser(body.user || body.data || body);
    return ok({ token, user });
  },
  async register(
    data: Omit<Partial<Student>, "document"> & {
      password?: string;
      document?: File;
      image?: File;
    },
  ): Promise<ApiResponse<User>> {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    const res = await apiClient.post("/auth/register", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return ok(res.data.data, res.data.message);
  },
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await apiClient.get("/auth/profile");
    return ok(normalizeUser(res.data.data) as User);
  },
  async forgotPassword(email: string) {
    const res = await apiClient.post("/auth/forgot-password", { email });
    return ok(null, res.data.message);
  },
  async resetPassword(
    token: string,
    password: string,
    confirmPassword?: string,
  ) {
    const res = await apiClient.post(`/auth/reset-password/${token}`, {
      password,
      confirmPassword: confirmPassword || password, // Fallback if not provided to avoid breaking other calls
    });
    return ok(null, res.data.message);
  },
  async verifyEmail(token: string) {
    const res = await apiClient.get(`/auth/verify/${token}`);
    return ok(null, res.data.message);
  },
  async resendVerification(email: string) {
    const res = await apiClient.post("/auth/resend-verification", { email });
    return ok(null, res.data.message);
  },
  async resendPasswordReset(email: string) {
    const res = await apiClient.post("/auth/resend-password-reset", { email });
    return ok(null, res.data.message);
  },
};

// ---- Admin (/api/admin/*) ----
export const realAdminService = {
  async getStats(deptId?: string): Promise<ApiResponse<AdminStats>> {
    const res = await apiClient.get("/admin/stats", {
      params: { dept_id: deptId },
    });
    return ok(res.data.data);
  },
  async getPendingStudents(): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get("/admin/students/pending");
    return ok(
      (res.data.data || []).map((u: Student) => normalizeUser(u) as Student),
    );
  },
  async getAllStudents(deptId?: string): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get("/admin/students", {
      params: { dept_id: deptId },
    });
    return ok(
      (res.data.data || []).map((u: Student) => normalizeUser(u) as Student),
    );
  },
  async approveStudent(studentId: string): Promise<ApiResponse<Student>> {
    const res = await apiClient.patch(`/admin/students/${studentId}/status`, {
      Account_Status: "approved",
    });
    return ok(res.data.data);
  },
  async rejectStudent(studentId: string): Promise<ApiResponse<Student>> {
    const res = await apiClient.patch(`/admin/students/${studentId}/status`, {
      Account_Status: "rejected",
    });
    return ok(res.data.data);
  },
  async getAllDoctors(deptId?: string): Promise<ApiResponse<Doctor[]>> {
    const res = await apiClient.get("/admin/doctors", {
      params: { dept_id: deptId },
    });
    return ok(res.data.data);
  },
  async createDoctor(
    data: Partial<Doctor> & { password: string },
  ): Promise<ApiResponse<Doctor>> {
    const res = await apiClient.post("/admin/doctors", data);
    return ok(res.data.data, res.data.message);
  },
  async createAdmin(
    data: Partial<Admin> & { password: string },
  ): Promise<ApiResponse<Admin>> {
    const res = await apiClient.post("/admin/admins", data);
    return ok(res.data.data, res.data.message);
  },
  async getFinancialStats(): Promise<ApiResponse<FinancialStats>> {
    const res = await apiClient.get("/admin/financial-stats");
    return ok(res.data.data);
  },
  async createStudent(data: Partial<Student>): Promise<ApiResponse<Student>> {
    const res = await apiClient.post("/admin/students", data);
    return ok(res.data.data, res.data.message);
  },
  async getAllAdmins(): Promise<ApiResponse<Admin[]>> {
    const res = await apiClient.get("/admin/admins");
    return ok(res.data.data);
  },
  async getAcademicLevelFees(): Promise<ApiResponse<Record<number, number>>> {
    const res = await apiClient.get("/admin/fees");
    return ok(res.data.data);
  },
  async setAcademicLevelFees(
    level: number,
    total_fees: number,
  ): Promise<ApiResponse<any>> {
    const res = await apiClient.post("/admin/fees", {
      academic_level: level,
      total_fees,
    });
    return ok(res.data.data, res.data.message);
  },
  async getAllCourses(deptId?: string): Promise<ApiResponse<Course[]>> {
    const res = await apiClient.get("/admin/courses", {
      params: { dept_id: deptId },
    });
    return ok(res.data.data);
  },
};

// ---- Departments (/api/departments/*) ----
export const realDepartmentService = {
  async getAll(): Promise<ApiResponse<Department[]>> {
    const res = await apiClient.get("/departments");
    return ok(res.data.data);
  },
  async getById(deptId: string): Promise<ApiResponse<Department>> {
    const res = await apiClient.get(`/departments/${deptId}`);
    return ok(res.data.data);
  },
  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    const res = await apiClient.post("/departments", {
      Dept_Name: data.dept_name,
      ...data,
    });
    return ok(res.data.data);
  },
  async update(
    deptId: string,
    data: Partial<Department>,
  ): Promise<ApiResponse<Department>> {
    const res = await apiClient.patch(`/departments/${deptId}`, {
      Dept_Name: data.dept_name,
      ...data,
    });
    return ok(res.data.data);
  },
  async delete(deptId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/departments/${deptId}`);
    return ok(null);
  },
};

// ---- Courses (/api/courses/*) ----
export const realCourseService = {
  async getAll(): Promise<ApiResponse<Course[]>> {
    const res = await apiClient.get("/courses");
    return ok(res.data.data);
  },
  async getByDepartment(deptId: string): Promise<ApiResponse<Course[]>> {
    const res = await apiClient.get("/courses", {
      params: { department_id: deptId },
    });
    return ok(res.data.data);
  },
  async getByCode(code: string): Promise<ApiResponse<Course>> {
    const res = await apiClient.get(`/courses/${code}`);
    return ok(res.data.data);
  },
  async create(data: Partial<Course>): Promise<ApiResponse<Course>> {
    const res = await apiClient.post("/courses", data);
    return ok(res.data.data);
  },
  async update(
    code: string,
    data: Partial<Course>,
  ): Promise<ApiResponse<Course>> {
    const res = await apiClient.patch(`/courses/${code}`, data);
    return ok(res.data.data);
  },
  async delete(code: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/courses/${code}`);
    return ok(null);
  },
};

// ---- Classes (/api/classes/*) ----
export const realClassService = {
  async getAll(): Promise<ApiResponse<Class[]>> {
    const res = await apiClient.get("/classes");
    return ok(res.data.data);
  },
  async getById(classId: string): Promise<ApiResponse<Class>> {
    const res = await apiClient.get(`/classes/${classId}`);
    return ok(res.data.data);
  },
  async getByDoctor(doctorId: string): Promise<ApiResponse<Class[]>> {
    const res = await apiClient.get(`/classes/doctor/${doctorId}`);
    return ok(res.data.data);
  },
  async getByStudent(studentId: string): Promise<ApiResponse<Class[]>> {
    const res = await apiClient.get(`/classes/student/${studentId}`);
    return ok(res.data.data);
  },
  async getStudents(classId: string): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get(`/classes/${classId}/students`);
    return ok(res.data.data);
  },
  async create(data: Partial<Class>): Promise<ApiResponse<Class>> {
    const res = await apiClient.post("/classes", data);
    return ok(res.data.data, res.data.message);
  },
  async delete(classId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/classes/${classId}`);
    return ok(null);
  },
  async enrollStudent(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<Enrollment>> {
    const res = await apiClient.post(`/classes/${classId}/enroll`, {
      student_id: studentId,
    });
    return ok(res.data.data ?? ({} as Enrollment), res.data.message);
  },
  async dropStudent(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<null>> {
    const res = await apiClient.delete(
      `/classes/${classId}/enroll/${studentId}`,
    );
    return ok(null, res.data.message);
  },
  // AI question (POST /api/classes/:classId/ai/ask)
  async askAI(
    classId: string,
    question: string,
  ): Promise<ApiResponse<{ answer: string; sources?: unknown[] }>> {
    const res = await apiClient.post(`/classes/${classId}/ai/ask`, {
      question,
    });
    return ok(res.data.data ?? res.data);
  },
  // General AI (POST /api/classes/ai/ask — no class context)
  async askGeneralAI(
    question: string,
  ): Promise<ApiResponse<{ answer: string }>> {
    const res = await apiClient.post(`/classes/ai/ask`, { question });
    return ok(res.data.data ?? res.data);
  },
};

// Helper to wrap AI calls with an auto-index retry
const withAutoIndex = async <T>(
  classId: string,
  materialId: string,
  requestFn: () => Promise<any>,
): Promise<ApiResponse<T>> => {
  try {
    const res = await requestFn();
    if (
      res.data?.status === "error" &&
      res.data?.message?.includes("Material not indexed")
    ) {
      // Try to index the material first
      try {
        await axios.post(`${AI_BASE_URL}/rag/index/material/${materialId}`, {
          class_id: Number(classId),
        });
        // Retry the original request
        const retryRes = await requestFn();
        if (retryRes.data?.status === "error")
          throw new Error(retryRes.data.message);
        return ok(retryRes.data);
      } catch (retryErr: any) {
        throw new Error(
          `Failed to index and process material: ${retryErr?.response?.data?.detail || retryErr.message}`,
        );
      }
    }
    if (res.data?.status === "error") throw new Error(res.data.message);
    return ok(res.data);
  } catch (err: any) {
    const errMsg =
      err?.response?.data?.detail ||
      err?.response?.data?.message ||
      err?.message ||
      "";
    throw new Error(errMsg);
  }
};

// ---- AI RAG Actions (Direct to AI service or via backend) ----
export const realAIRagService = {
  async summarizeMaterial(
    classId: string,
    materialId: string,
  ): Promise<ApiResponse<any>> {
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/summary`, {
        class_id: Number(classId),
        material_id: Number(materialId),
        mode: "detailed",
      }),
    );
  },
  async getPageSummaries(
    classId: string,
    materialId: string,
  ): Promise<ApiResponse<any>> {
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/page-summaries`, {
        class_id: Number(classId),
        material_id: Number(materialId),
      }),
    );
  },
  async getNotes(
    classId: string,
    materialId: string,
  ): Promise<ApiResponse<any>> {
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/notes`, {
        class_id: Number(classId),
        material_id: Number(materialId),
      }),
    );
  },
  async getQuiz(
    classId: string,
    materialId: string,
  ): Promise<ApiResponse<any>> {
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/quiz`, {
        class_id: Number(classId),
        material_id: Number(materialId),
        num_questions: 5,
      }),
    );
  },
  async getFlashcards(
    classId: string,
    materialId: string,
  ): Promise<ApiResponse<any>> {
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/flashcards`, {
        class_id: Number(classId),
        material_id: Number(materialId),
        num_cards: 10,
      }),
    );
  },
};

// ---- Lectures (/api/classes/:classId/lectures via lectureRouter mounted on /api/classes) ----
export const realLectureService = {
  async getByClass(classId: string): Promise<ApiResponse<Lecture[]>> {
    const res = await apiClient.get(`/classes/${classId}/lectures`);
    return ok(res.data.data);
  },
  async create(
    data: Partial<Lecture> & { class_id: string },
  ): Promise<ApiResponse<Lecture>> {
    const res = await apiClient.post(
      `/classes/${data.class_id}/lectures`,
      data,
    );
    return ok(res.data.data, res.data.message);
  },
  async delete(lecId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/classes/lectures/${lecId}`);
    return ok(null);
  },
};

// ---- Materials (/api/classes/:classId/materials) ----
export const realMaterialService = {
  async getByClass(classId: string): Promise<ApiResponse<Material[]>> {
    const res = await apiClient.get(`/classes/${classId}/materials`);
    return ok(res.data.data);
  },
  async upload(
    data: Partial<Material> & { class_id: string; file?: File },
  ): Promise<ApiResponse<Material>> {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append("document", v);
      else fd.append(k, String(v));
    });
    const res = await apiClient.post(
      `/classes/${data.class_id}/materials`,
      fd,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return ok(res.data.data, res.data.message);
  },
  async delete(materialId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/materials/${materialId}`);
    return ok(null);
  },
};

// ---- Discussion (/api/classes/:classId/questions, /api/questions/:qId/answers) ----
export const realDiscussionService = {
  async getQuestions(classId: string): Promise<ApiResponse<Question[]>> {
    const res = await apiClient.get(`/classes/${classId}/questions`);
    const mapped = (res.data.data || []).map((q: any) => ({
      q_id: String(q.Questions_ID || q.q_id),
      class_id: String(q.Class_ID || q.class_id),
      text: q.Text || q.text,
      user_id: String(q.User_ID || q.user_id),
      user_name: q.User_Name || q.user_name,
      user_role: (q.User_Role || q.user_role)?.toLowerCase(),
      user_image: q.User_Image || q.user_image,
      time: q.Time || q.time,
      answers: (q.answers || []).map((a: any) => ({
        a_id: String(a.Answer_ID || a.a_id),
        question_id: String(a.Questions_ID || a.q_id || a.question_id),
        text: a.Text || a.text,
        user_id: String(a.User_ID || a.user_id),
        user_name: a.User_Name || a.user_name,
        user_role: (a.User_Role || a.user_role)?.toLowerCase(),
        time: a.Time || a.time,
      })),
    }));
    return ok(mapped);
  },
  async postQuestion(
    data: Partial<Question> & { class_id: string },
  ): Promise<ApiResponse<Question>> {
    const res = await apiClient.post(`/classes/${data.class_id}/questions`, {
      text: data.text,
    });
    // Backend doesn't return the full object, so we construct one for the UI state
    const newQuestion: Question = {
      q_id: String(res.data.data?.q_id || Math.random().toString()),
      class_id: data.class_id,
      text: data.text || "",
      user_id: data.user_id || "",
      user_name: data.user_name || "",
      user_role: data.user_role || "student",
      time: new Date().toISOString(),
      answers: [],
    };
    return ok(newQuestion, res.data.message);
  },
  async postAnswer(
    questionId: string,
    data: Partial<Answer>,
  ): Promise<ApiResponse<Answer>> {
    const res = await apiClient.post(`/questions/${questionId}/answers`, {
      text: data.text,
    });
    const newAnswer: Answer = {
      a_id: String(res.data.data?.a_id || Math.random().toString()),
      question_id: questionId,
      text: data.text || "",
      user_id: data.user_id || "",
      user_name: data.user_name || "",
      user_role: data.user_role || "student",
      time: new Date().toISOString(),
    };
    return ok(newAnswer, res.data.message);
  },
};

// ---- Grades (/api/classes/:classId/grades, /api/grades/student/:id) ----
export const realGradeService = {
  async getByClass(
    classId: string,
  ): Promise<ApiResponse<StudentGradeSummary[]>> {
    const res = await apiClient.get(`/classes/${classId}/grades`);
    return ok(res.data.data);
  },
  async getByStudent(studentId: string): Promise<ApiResponse<Grade[]>> {
    const res = await apiClient.get(`/grades/student/${studentId}`);
    return ok(res.data.data);
  },
  async getStudentClassGrades(
    classId: string,
    studentId: string,
  ): Promise<ApiResponse<Grade[]>> {
    const res = await apiClient.get(
      `/classes/${classId}/grades/student/${studentId}`,
    );
    return ok(res.data.data);
  },
  async addGrade(
    data: Partial<Grade> & { class_id: string },
  ): Promise<ApiResponse<Grade>> {
    const res = await apiClient.post(`/classes/${data.class_id}/grades`, data);
    return ok(res.data.data, res.data.message);
  },
};

// ---- Attendance (/api/attendance/*, /api/classes/:lectureId/attendance) ----
export const realAttendanceService = {
  async getByLecture(lectureId: string): Promise<ApiResponse<Attendance[]>> {
    const res = await apiClient.get(`/classes/${lectureId}/attendance`);
    return ok(res.data.data);
  },
  async getByStudentAndClass(
    studentId: string,
    classId: string,
  ): Promise<ApiResponse<Attendance[]>> {
    const res = await apiClient.get(
      `/attendance/student/${studentId}/class/${classId}`,
    );
    return ok(res.data.data);
  },
  async record(
    data: Partial<Attendance> & { lecture_id: string },
  ): Promise<ApiResponse<Attendance>> {
    const res = await apiClient.post(
      `/classes/${data.lecture_id}/attendance`,
      data,
    );
    return ok(res.data.data, res.data.message);
  },
};

// ---- Notifications (/api/notifications/*) ----
export const realNotificationService = {
  async getByUser(): Promise<ApiResponse<Notification[]>> {
    const res = await apiClient.get("/notifications");
    return ok(res.data.data);
  },
  async markAsRead(notificationId: string): Promise<ApiResponse<null>> {
    await apiClient.put(`/notifications/${notificationId}/read`);
    return ok(null);
  },
  async markAllAsRead(): Promise<ApiResponse<null>> {
    await apiClient.put("/notifications/read-all");
    return ok(null);
  },
  async getUnreadCount(): Promise<ApiResponse<number>> {
    const res = await apiClient.get("/notifications/unread-count");
    return ok(res.data.data);
  },
};

// ---- Doctor / Student stats ----
export const realDoctorService = {
  async getStats(doctorId: string): Promise<ApiResponse<DoctorStats>> {
    const res = await apiClient.get(`/doctors/${doctorId}/stats`);
    return ok(res.data.data);
  },
};

export const realStudentService = {
  async getStats(studentId: string): Promise<ApiResponse<StudentStats>> {
    const res = await apiClient.get(`/students/${studentId}/stats`);
    return ok(res.data.data);
  },
  async getAll(): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get("/students");
    return ok(res.data.data);
  },
};
