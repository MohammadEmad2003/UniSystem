// Real backend services. Each function returns { success, data, message? }
// to match the existing mock service shape so pages don't need changes.
import { apiClient, normalizeUser } from './apiClient';
import type {
  User, Student, Doctor, Admin, Department, Course, Class,
  Lecture, Material, Attendance, Grade, Question, Answer,
  Enrollment, Notification, LoginResponse, ApiResponse,
  AdminStats, DoctorStats, StudentStats, StudentGradeSummary,
} from '../types';

const ok = <T>(data: T, message?: string): ApiResponse<T> => ({ success: true, data, message });

// ---- Auth (POST /api/auth/*) ----
export const realAuthService = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const res = await apiClient.post('/auth/login', { email, password });
    // Backend returns { success, data: { token, user } }
    const body = res.data?.data || res.data;
    const token = body.token;
    const user = normalizeUser(body.user || body.data || body);
    return ok({ token, user });
  },
  async register(data: Partial<Student> & { password?: string; document?: File; image?: File }): Promise<ApiResponse<User>> {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append(k, v);
      else fd.append(k, String(v));
    });
    const res = await apiClient.post('/auth/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    return ok(res.data.data, res.data.message);
  },
  async getProfile(): Promise<ApiResponse<User>> {
    const res = await apiClient.get('/auth/profile');
    return ok(normalizeUser(res.data.data) as User);
  },
  async forgotPassword(email: string) {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return ok(null, res.data.message);
  },
  async resetPassword(token: string, password: string) {
    const res = await apiClient.post(`/auth/reset-password/${token}`, { password });
    return ok(null, res.data.message);
  },
};

// ---- Admin (/api/admin/*) ----
export const realAdminService = {
  async getStats(): Promise<ApiResponse<AdminStats>> {
    const res = await apiClient.get('/admin/stats');
    return ok(res.data.data);
  },
  async getPendingStudents(): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get('/admin/students/pending');
    return ok((res.data.data || []).map((u: Student) => normalizeUser(u) as Student));
  },
  async getAllStudents(): Promise<ApiResponse<Student[]>> {
    const res = await apiClient.get('/admin/students');
    return ok((res.data.data || []).map((u: Student) => normalizeUser(u) as Student));
  },
  async approveStudent(studentId: string): Promise<ApiResponse<Student>> {
    const res = await apiClient.patch(`/admin/students/${studentId}/status`, { Account_Status: 'approved' });
    return ok(res.data.data);
  },
  async rejectStudent(studentId: string): Promise<ApiResponse<Student>> {
    const res = await apiClient.patch(`/admin/students/${studentId}/status`, { Account_Status: 'rejected' });
    return ok(res.data.data);
  },
  async getAllDoctors(): Promise<ApiResponse<Doctor[]>> {
    const res = await apiClient.get('/admin/doctors');
    return ok(res.data.data);
  },
  async createDoctor(data: Partial<Doctor> & { password: string }): Promise<ApiResponse<Doctor>> {
    const res = await apiClient.post('/admin/doctors', data);
    return ok(res.data.data, res.data.message);
  },
  async createAdmin(data: Partial<Admin> & { password: string }): Promise<ApiResponse<Admin>> {
    const res = await apiClient.post('/admin/admins', data);
    return ok(res.data.data, res.data.message);
  },
};

// ---- Departments (/api/departments/*) ----
export const realDepartmentService = {
  async getAll(): Promise<ApiResponse<Department[]>> {
    const res = await apiClient.get('/departments');
    return ok(res.data.data);
  },
  async getById(deptId: string): Promise<ApiResponse<Department>> {
    const res = await apiClient.get(`/departments/${deptId}`);
    return ok(res.data.data);
  },
  async create(data: Partial<Department>): Promise<ApiResponse<Department>> {
    const res = await apiClient.post('/departments', { Dept_Name: data.dept_name, ...data });
    return ok(res.data.data);
  },
  async update(deptId: string, data: Partial<Department>): Promise<ApiResponse<Department>> {
    const res = await apiClient.patch(`/departments/${deptId}`, { Dept_Name: data.dept_name, ...data });
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
    const res = await apiClient.get('/courses');
    return ok(res.data.data);
  },
  async getByDepartment(deptId: string): Promise<ApiResponse<Course[]>> {
    const res = await apiClient.get('/courses', { params: { department_id: deptId } });
    return ok(res.data.data);
  },
  async getByCode(code: string): Promise<ApiResponse<Course>> {
    const res = await apiClient.get(`/courses/${code}`);
    return ok(res.data.data);
  },
  async create(data: Partial<Course>): Promise<ApiResponse<Course>> {
    const res = await apiClient.post('/courses', data);
    return ok(res.data.data);
  },
  async update(code: string, data: Partial<Course>): Promise<ApiResponse<Course>> {
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
    const res = await apiClient.get('/classes');
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
    const res = await apiClient.post('/classes', data);
    return ok(res.data.data, res.data.message);
  },
  async delete(classId: string): Promise<ApiResponse<null>> {
    await apiClient.delete(`/classes/${classId}`);
    return ok(null);
  },
  async enrollStudent(classId: string, studentId: string): Promise<ApiResponse<Enrollment>> {
    const res = await apiClient.post(`/classes/${classId}/enroll`, { student_id: studentId });
    return ok(res.data.data ?? ({} as Enrollment), res.data.message);
  },
  async dropStudent(classId: string, studentId: string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete(`/classes/${classId}/enroll/${studentId}`);
    return ok(null, res.data.message);
  },
  // AI question (POST /api/classes/:classId/ai/ask)
  async askAI(classId: string, question: string): Promise<ApiResponse<{ answer: string; sources?: unknown[] }>> {
    const res = await apiClient.post(`/classes/${classId}/ai/ask`, { question });
    return ok(res.data.data ?? res.data);
  },
  // General AI (POST /api/classes/ai/ask — no class context)
  async askGeneralAI(question: string): Promise<ApiResponse<{ answer: string }>> {
    const res = await apiClient.post(`/classes/ai/ask`, { question });
    return ok(res.data.data ?? res.data);
  },
};

// ---- Lectures (/api/classes/:classId/lectures via lectureRouter mounted on /api/classes) ----
export const realLectureService = {
  async getByClass(classId: string): Promise<ApiResponse<Lecture[]>> {
    const res = await apiClient.get(`/classes/${classId}/lectures`);
    return ok(res.data.data);
  },
  async create(data: Partial<Lecture> & { class_id: string }): Promise<ApiResponse<Lecture>> {
    const res = await apiClient.post(`/classes/${data.class_id}/lectures`, data);
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
  async upload(data: Partial<Material> & { class_id: string; file?: File }): Promise<ApiResponse<Material>> {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File) fd.append('document', v);
      else fd.append(k, String(v));
    });
    const res = await apiClient.post(`/classes/${data.class_id}/materials`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
    return ok(res.data.data);
  },
  async postQuestion(data: Partial<Question> & { class_id: string }): Promise<ApiResponse<Question>> {
    const res = await apiClient.post(`/classes/${data.class_id}/questions`, { text: data.text });
    return ok(res.data.data, res.data.message);
  },
  async postAnswer(questionId: string, data: Partial<Answer>): Promise<ApiResponse<Answer>> {
    const res = await apiClient.post(`/questions/${questionId}/answers`, { text: data.text });
    return ok(res.data.data, res.data.message);
  },
};

// ---- Grades (/api/classes/:classId/grades, /api/grades/student/:id) ----
export const realGradeService = {
  async getByClass(classId: string): Promise<ApiResponse<StudentGradeSummary[]>> {
    const res = await apiClient.get(`/classes/${classId}/grades`);
    return ok(res.data.data);
  },
  async getByStudent(studentId: string): Promise<ApiResponse<Grade[]>> {
    const res = await apiClient.get(`/grades/student/${studentId}`);
    return ok(res.data.data);
  },
  async getStudentClassGrades(classId: string, studentId: string): Promise<ApiResponse<Grade[]>> {
    const res = await apiClient.get(`/classes/${classId}/grades/student/${studentId}`);
    return ok(res.data.data);
  },
  async addGrade(data: Partial<Grade> & { class_id: string }): Promise<ApiResponse<Grade>> {
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
  async getByStudentAndClass(studentId: string, classId: string): Promise<ApiResponse<Attendance[]>> {
    const res = await apiClient.get(`/attendance/student/${studentId}/class/${classId}`);
    return ok(res.data.data);
  },
  async record(data: Partial<Attendance> & { lecture_id: string }): Promise<ApiResponse<Attendance>> {
    const res = await apiClient.post(`/classes/${data.lecture_id}/attendance`, data);
    return ok(res.data.data, res.data.message);
  },
};

// ---- Notifications (/api/notifications/*) ----
export const realNotificationService = {
  async getByUser(): Promise<ApiResponse<Notification[]>> {
    const res = await apiClient.get('/notifications');
    return ok(res.data.data);
  },
  async markAsRead(notificationId: string): Promise<ApiResponse<null>> {
    await apiClient.put(`/notifications/${notificationId}/read`);
    return ok(null);
  },
  async markAllAsRead(): Promise<ApiResponse<null>> {
    await apiClient.put('/notifications/read-all');
    return ok(null);
  },
  async getUnreadCount(): Promise<ApiResponse<number>> {
    const res = await apiClient.get('/notifications/unread-count');
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
    const res = await apiClient.get('/students');
    return ok(res.data.data);
  },
};
