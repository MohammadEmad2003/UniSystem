import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "./hooks/useAuthStore";
import { useThemeStore } from "./hooks/useThemeStore";
import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import PendingApprovalPage from "./pages/auth/PendingApprovalPage";
import StudentDashboard from "./pages/dashboard/StudentDashboard";
import DoctorDashboard from "./pages/dashboard/DoctorDashboard";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import MyClassesPage from "./pages/classes/MyClassesPage";
import BrowseClassesPage from "./pages/classes/BrowseClassesPage";
import ClassWorkspacePage from "./pages/classes/ClassWorkspacePage";
import ClassStreamTab from "./pages/classes/ClassStreamTab";
import ClassMaterialsTab from "./pages/classes/ClassMaterialsTab";
import ClassLecturesTab from "./pages/classes/ClassLecturesTab";
import ClassStudentsTab from "./pages/classes/ClassStudentsTab";
import ClassGradesTab from "./pages/classes/ClassGradesTab";
import ApprovalQueuePage from "./pages/admin/ApprovalQueuePage";
import ManageUsersPage from "./pages/admin/ManageUsersPage";
import ManageDepartmentsPage from "./pages/admin/ManageDepartmentsPage";
import ManageCoursesPage from "./pages/admin/ManageCoursesPage";
import ManageClassesPage from "./pages/admin/ManageClassesPage";
import ProfilePage from "./pages/ProfilePage";

// Route guard component
function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role))
    return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Dashboard redirect based on role
function DashboardRedirect() {
  const { user } = useAuthStore();
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "doctor") return <DoctorDashboard />;
  return <StudentDashboard />;
}

export default function App() {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Classes (student + doctor only) */}
        <Route
          path="/classes"
          element={
            <ProtectedRoute roles={["student", "doctor"]}>
              <MyClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes/browse"
          element={
            <ProtectedRoute roles={["student"]}>
              <BrowseClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/classes/:classId"
          element={
            <ProtectedRoute roles={["student", "doctor"]}>
              <ClassWorkspacePage />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="stream" replace />} />
          <Route path="stream" element={<ClassStreamTab />} />
          <Route path="materials" element={<ClassMaterialsTab />} />
          <Route path="lectures" element={<ClassLecturesTab />} />
          <Route path="students" element={<ClassStudentsTab />} />
          <Route path="grades" element={<ClassGradesTab />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/approvals"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ApprovalQueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ManageUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ManageDepartmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ManageCoursesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/classes"
          element={
            <ProtectedRoute roles={["admin"]}>
              <ManageClassesPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
