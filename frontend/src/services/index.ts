// Service barrel — switches between mock and real (axios) backend.
// Set VITE_USE_MOCK=false to hit the real API.
import {
  mockAuthService, mockAdminService, mockDepartmentService,
  mockCourseService, mockClassService, mockLectureService,
  mockMaterialService, mockDiscussionService, mockGradeService,
  mockAttendanceService, mockNotificationService, mockDoctorService,
  mockStudentService, mockRoomService
} from '../mock/mockServices';
import {
  realAuthService, realAdminService, realDepartmentService,
  realCourseService, realClassService, realLectureService,
  realMaterialService, realDiscussionService, realGradeService,
  realAttendanceService, realNotificationService, realDoctorService,
  realStudentService, realAIRagService, realStudyOutputService, realRoomService,
  buildStudyOptionsKey,
} from './realServices';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

export const authService         = useMock ? mockAuthService         : (realAuthService         as unknown as typeof mockAuthService);
export const adminService        = useMock ? mockAdminService        : (realAdminService        as unknown as typeof mockAdminService);
export const departmentService   = useMock ? mockDepartmentService   : (realDepartmentService   as unknown as typeof mockDepartmentService);
export const courseService       = useMock ? mockCourseService       : (realCourseService       as unknown as typeof mockCourseService);
export const classService        = useMock ? mockClassService        : (realClassService        as unknown as typeof mockClassService);
export const lectureService      = useMock ? mockLectureService      : (realLectureService      as unknown as typeof mockLectureService);
export const materialService     = useMock ? mockMaterialService     : (realMaterialService     as unknown as typeof mockMaterialService);
export const discussionService   = useMock ? mockDiscussionService   : (realDiscussionService   as unknown as typeof mockDiscussionService);
export const gradeService        = useMock ? mockGradeService        : (realGradeService        as unknown as typeof mockGradeService);
export const attendanceService   = useMock ? mockAttendanceService   : (realAttendanceService   as unknown as typeof mockAttendanceService);
export const notificationService = useMock ? mockNotificationService : (realNotificationService as unknown as typeof mockNotificationService);
export const doctorService       = useMock ? mockDoctorService       : (realDoctorService       as unknown as typeof mockDoctorService);
export const studentService      = useMock ? mockStudentService      : (realStudentService      as unknown as typeof mockStudentService);
export const roomService         = useMock ? mockRoomService         : (realRoomService         as unknown as typeof mockRoomService);

// Real-only: AI ask via backend, mock falls back to a canned response
export const aiService = {
  async ask(classId: string | undefined, question: string) {
    if (useMock) {
      await new Promise(r => setTimeout(r, 500));
      return { success: true, data: { answer: `(mock) You asked: "${question}". Wire VITE_USE_MOCK=false for real RAG.` } };
    }
    if (classId) return realClassService.askAI(classId, question);
    return realClassService.askGeneralAI(question);
  },
};

// Real-only: study output persistence (no mock needed — gracefully returns null)
export const studyOutputService = realStudyOutputService;
export { buildStudyOptionsKey };

// Also expose rag service for AI Toolbar
export const aiRagService = useMock ? {
  async summarizeMaterial() { await new Promise(r=>setTimeout(r, 800)); return { success: true, data: { summary: "This is a mock summary of the document." }}; },
  async getPageSummaries() { await new Promise(r=>setTimeout(r, 800)); return { success: true, data: { summaries: ["Page 1 mock", "Page 2 mock"] }}; },
  async getNotes() { await new Promise(r=>setTimeout(r, 800)); return { success: true, data: { notes: "Mock Notes: - Study hard - Sleep well" }}; },
  async getQuiz() { await new Promise(r=>setTimeout(r, 800)); return { success: true, data: { quiz: "1. What is Mock?\n2. Why mock?" }}; },
  async getFlashcards() { await new Promise(r=>setTimeout(r, 800)); return { success: true, data: { flashcards: "Card 1: Front / Back" }}; },
} : realAIRagService;
