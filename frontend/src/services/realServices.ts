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
    semester: string,
    total_fees?: number,
    max_hours?: number,
    min_hours?: number,
    hour_price?: number,
  ): Promise<ApiResponse<any>> {
    const res = await apiClient.post("/admin/fees", {
      academic_level: level,
      semester,
      total_fees,
      max_hours,
      min_hours,
      hour_price,
    });
    return ok(res.data.data, res.data.message);
  },
  async getAllCourses(deptId?: string): Promise<ApiResponse<Course[]>> {
    const res = await apiClient.get("/admin/courses", {
      params: { dept_id: deptId },
    });
    return ok(res.data.data);
  },
  async linkCard(userId: string, nfcTagId: string): Promise<ApiResponse<{ userId: string; nfcTagId: string }>> {
    const res = await apiClient.post("/admin/link-card", { userId, nfcTagId });
    return ok(res.data.data, res.data.message);
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
  async getPrerequisites(courseCode: string): Promise<ApiResponse<any[]>> {
    const res = await apiClient.get(`/courses/${courseCode}/prerequisites`);
    return ok(res.data.data);
  },
  async addPrerequisite(courseCode: string, prereqCode: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/courses/${courseCode}/prerequisites`, { prereqCode });
    return ok(res.data.data);
  },
  async removePrerequisite(courseCode: string, prereqCode: string): Promise<ApiResponse<any>> {
    const res = await apiClient.delete(`/courses/${courseCode}/prerequisites/${prereqCode}`);
    return ok(res.data.data);
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
  // Ask AI + persist question & answer in DB in one call
  async askAndSave(
    classId: string,
    text: string,
  ): Promise<ApiResponse<{ status: string; question: any }>> {
    const res = await apiClient.post(`/classes/${classId}/ai/ask-and-save`, { text });
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
    opts?: Record<string, any>,
    forceRefresh = false,
  ): Promise<ApiResponse<any>> {
    console.debug('[STUDY_AI_OPTIONS] summary', opts, forceRefresh ? '[FORCE_REFRESH]' : '');
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/summary`, {
        class_id:         Number(classId),
        material_id:      Number(materialId),
        length:           opts?.length           ?? 'medium',
        format:           opts?.format           ?? 'study_notes',
        include_formulas: opts?.include_formulas ?? true,
        force_refresh:    forceRefresh,
      }),
    );
  },
  async getPageSummaries(
    classId: string,
    materialId: string,
    opts?: Record<string, any>,
    forceRefresh = false,
  ): Promise<ApiResponse<any>> {
    console.debug('[STUDY_AI_OPTIONS] page_summaries', opts, forceRefresh ? '[FORCE_REFRESH]' : '');
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/page-summaries`, {
        class_id:          Number(classId),
        material_id:       Number(materialId),
        detail_level:      opts?.detail_level      ?? 'normal',
        include_key_terms: opts?.include_key_terms ?? true,
        include_formulas:  opts?.include_formulas  ?? true,
        force_refresh:     forceRefresh,
      }),
    );
  },
  async getNotes(
    classId: string,
    materialId: string,
    opts?: Record<string, any>,
    forceRefresh = false,
  ): Promise<ApiResponse<any>> {
    console.debug('[STUDY_AI_OPTIONS] notes', opts, forceRefresh ? '[FORCE_REFRESH]' : '');
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/notes`, {
        class_id:         Number(classId),
        material_id:      Number(materialId),
        notes_style:      opts?.notes_style      ?? 'bullet_notes',
        detail_level:     opts?.detail_level     ?? 'detailed',
        include_examples: opts?.include_examples ?? true,
        include_formulas: opts?.include_formulas ?? true,
        force_refresh:    forceRefresh,
      }),
    );
  },
  async getQuiz(
    classId: string,
    materialId: string,
    opts?: Record<string, any>,
    forceRefresh = false,
  ): Promise<ApiResponse<any>> {
    console.debug('[STUDY_AI_OPTIONS] quiz', opts, forceRefresh ? '[FORCE_REFRESH]' : '');
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/quiz`, {
        class_id:      Number(classId),
        material_id:   Number(materialId),
        num_questions: opts?.count         ?? 10,
        difficulty:    opts?.difficulty    ?? 'mixed',
        question_type: opts?.question_type ?? 'mcq',
        force_refresh: forceRefresh,
      }),
    );
  },
  async getFlashcards(
    classId: string,
    materialId: string,
    opts?: Record<string, any>,
    forceRefresh = false,
  ): Promise<ApiResponse<any>> {
    console.debug('[STUDY_AI_OPTIONS] flashcards', opts, forceRefresh ? '[FORCE_REFRESH]' : '');
    return withAutoIndex(classId, materialId, () =>
      axios.post(`${AI_BASE_URL}/rag/material/flashcards`, {
        class_id:         Number(classId),
        material_id:      Number(materialId),
        num_cards:        opts?.count            ?? 10,
        focus:            opts?.focus            ?? 'mixed',
        include_examples: opts?.include_examples ?? false,
        force_refresh:    forceRefresh,
      }),
    );
  },
};

// ---- Lectures (/api/classes/lectures/* via lectureRouter mounted on /api/classes) ----
export const realLectureService = {
  async getByClass(classId: string): Promise<ApiResponse<Lecture[]>> {
    const res = await apiClient.get(`/classes/${classId}/lectures`);
    return ok(res.data.data);
  },
  async create(
    data: Partial<Lecture> & { class_id: string },
  ): Promise<ApiResponse<Lecture>> {
    const res = await apiClient.post(`/classes/${data.class_id}/lectures`, data);
    return ok(res.data.data, res.data.message);
  },
  async update(lecId: string, data: Partial<Lecture>): Promise<ApiResponse<Lecture>> {
    const res = await apiClient.put(`/classes/lectures/${lecId}`, data);
    return ok(res.data.data, res.data.message);
  },
  async delete(lecId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/classes/lectures/${lecId}`);
    return ok(null);
  },
  async start(lecId: string, attendanceCode?: string): Promise<ApiResponse<{ start_time: string; attendance_code?: string }>> {
    const res = await apiClient.post(`/classes/lectures/${lecId}/start`, attendanceCode ? { attendanceCode } : {});
    return ok(res.data.data, res.data.message);
  },
  async end(lecId: string): Promise<ApiResponse<{ end_time: string }>> {
    const res = await apiClient.post(`/classes/lectures/${lecId}/end`, {});
    return ok(res.data.data, res.data.message);
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
    // normalizeKeys lowercases all keys from the API (Questions_ID → questions_id).
    // Fall through normalised-lowercase → PascalCase → snake_case so any shape works.
    const mapped = (res.data.data || []).map((q: any) => ({
      q_id: String(q.questions_id || q.Questions_ID || q.q_id || ''),
      class_id: String(q.class_id || q.Class_ID || ''),
      text: q.text || q.Text || '',
      user_id: String(q.user_id ?? q.User_ID ?? ''),
      user_name: q.user_name || q.User_Name || 'Unknown',
      user_role: (q.user_role || q.User_Role || 'student')?.toLowerCase(),
      user_image: q.user_image || q.User_Image,
      time: q.time || q.Time || new Date().toISOString(),
      answers: (q.answers || []).map((a: any) => ({
        a_id: String(a.answer_id || a.Answer_ID || a.a_id || Math.random()),
        question_id: String(a.questions_id || a.Questions_ID || a.question_id || ''),
        text: a.text || a.Text || '',
        user_id: String(a.user_id ?? a.User_ID ?? ''),
        user_name: a.user_name || a.User_Name || 'AI Assistant',
        user_role: (a.user_role || a.User_Role)?.toLowerCase() || 'ai',
        time: a.time || a.Time || new Date().toISOString(),
        is_ai_generated: Boolean(a.is_ai_generated || a.Is_AI_Generated),
        source_type: a.source_type || a.Source_Type || undefined,
        source_id: a.source_id || a.Source_ID || undefined,
        confidence: a.confidence ?? a.Confidence ?? undefined,
        ai_metadata: a.ai_metadata || a.AI_Metadata || undefined,
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
    const res = await apiClient.get(`/attendance/student/${studentId}/class/${classId}`);
    return ok(res.data.data);
  },
  async record(
    data: Partial<Attendance> & { lec_id: string },
  ): Promise<ApiResponse<Attendance>> {
    const res = await apiClient.post(`/classes/${data.lec_id}/attendance`, data);
    return ok(res.data.data, res.data.message);
  },
  async recordManual(lectureId: string, studentId: string): Promise<ApiResponse<null>> {
    const res = await apiClient.post(`/classes/${lectureId}/attendance`, { student_id: studentId });
    return ok(null, res.data.message);
  },
  async updateByLectureAndStudent(
    lectureId: string,
    studentId: string,
    data: { earlyCheck?: 0 | 1; lateCheck?: 0 | 1; method?: string },
  ): Promise<ApiResponse<null>> {
    const res = await apiClient.put(`/classes/${lectureId}/attendance/${studentId}`, data);
    return ok(null, res.data.message);
  },
  async deleteByLectureAndStudent(lectureId: string, studentId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/classes/${lectureId}/attendance/${studentId}`);
    return ok(null);
  },
  async onlineAttendance(lectureId: string, code: string, studentId: string): Promise<ApiResponse<{ earlyCheck: number; lateCheck: number }>> {
    const res = await apiClient.post(`/attendance/online`, { lectureId, code, studentId });
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
  async getTranscript(studentId: string): Promise<ApiResponse<any>> {
    const res = await apiClient.get(`/students/${studentId}/transcript`);
    return ok(res.data.data);
  },
  async getPayment(studentId: string): Promise<ApiResponse<any>> {
    const res = await apiClient.get(`/students/${studentId}/payment`);
    return ok(res.data.data);
  },
};

// ---- Study Output Cache (/api/classes/:classId/study-outputs) ----
export interface StudyOutputRecord {
  output_id: number;
  tool_type: string;
  options_key: string;
  options: Record<string, any>;
  content: any;
  created_at: string;
  updated_at: string;
}

/** Build a deterministic options key (must match backend buildOptionsKey). */
export function buildStudyOptionsKey(toolType: string, options: Record<string, any>): string {
  const sorted = Object.keys(options)
    .sort()
    .map(k => `${k}=${options[k]}`)
    .join('|');
  return `${toolType}::${sorted}`;
}

export const realStudyOutputService = {
  async get(
    classId: string,
    materialId: string,
    toolType: string,
    options: Record<string, any>,
  ): Promise<StudyOutputRecord | null> {
    const optionsKey = buildStudyOptionsKey(toolType, options);
    try {
      const res = await apiClient.get(`/classes/${classId}/study-outputs`, {
        params: { material_id: materialId, tool_type: toolType, options_key: optionsKey },
      });
      return res.data.data as StudyOutputRecord;
    } catch {
      return null;
    }
  },

  async save(
    classId: string,
    materialId: string,
    toolType: string,
    options: Record<string, any>,
    content: any,
  ): Promise<void> {
    await apiClient.post(`/classes/${classId}/study-outputs`, {
      material_id: materialId,
      tool_type:   toolType,
      options,
      content,
    });
  },
};
