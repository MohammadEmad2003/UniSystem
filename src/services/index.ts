// Service barrel — routes to mock or real API based on env
import {
  mockAuthService, mockAdminService, mockDepartmentService,
  mockCourseService, mockClassService, mockLectureService,
  mockMaterialService, mockDiscussionService, mockGradeService,
  mockAttendanceService, mockNotificationService, mockDoctorService,
  mockStudentService,
} from '../mock/mockServices';

const useMock = import.meta.env.VITE_USE_MOCK === 'true';

// For now we always use mock. When backend is ready, add real implementations.
export const authService = useMock ? mockAuthService : mockAuthService;
export const adminService = useMock ? mockAdminService : mockAdminService;
export const departmentService = useMock ? mockDepartmentService : mockDepartmentService;
export const courseService = useMock ? mockCourseService : mockCourseService;
export const classService = useMock ? mockClassService : mockClassService;
export const lectureService = useMock ? mockLectureService : mockLectureService;
export const materialService = useMock ? mockMaterialService : mockMaterialService;
export const discussionService = useMock ? mockDiscussionService : mockDiscussionService;
export const gradeService = useMock ? mockGradeService : mockGradeService;
export const attendanceService = useMock ? mockAttendanceService : mockAttendanceService;
export const notificationService = useMock ? mockNotificationService : mockNotificationService;
export const doctorService = useMock ? mockDoctorService : mockDoctorService;
export const studentService = useMock ? mockStudentService : mockStudentService;
