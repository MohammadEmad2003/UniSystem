import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../hooks/useAuthStore";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Building2,
  GraduationCap,
  ShieldCheck,
  UserPlus,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ClipboardList,
  FolderOpen,
  Search,
  DollarSign,
  Award,
} from "lucide-react";
import logo from "../assets/images/logo.png";

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [adminExpanded, setAdminExpanded] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "sidebar-link-active" : "sidebar-link";

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-[#111111] text-slate-900 dark:text-white rounded-xl shadow-[0_0_15px_rgba(0,184,212,0.2)] border border-slate-200 dark:border-slate-800 transition-all hover:bg-slate-50 dark:hover:bg-[#1a1a24]"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 dark:bg-[#050b14]/80 backdrop-blur-sm z-30 transition-all duration-500"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 transition-transform duration-500 ease-out ${open ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 w-72 bg-white dark:bg-[#050b14]/95 backdrop-blur-3xl border-r border-slate-200 dark:border-slate-800/50 shadow-[4px_0_10px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_30px_rgba(0,0,0,0.8)] flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800/50">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00b8d4]/10 dark:from-[#00b8d4]/20 to-transparent border border-[#00b8d4]/20 dark:border-[#00e5ff]/30 shadow-[0_0_8px_rgba(0,184,212,0.1)] dark:shadow-[0_0_15px_rgba(0,229,255,0.2)] flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(0,184,212,0.2)] dark:group-hover:shadow-[0_0_25px_rgba(0,229,255,0.4)] transition-all duration-500 overflow-hidden">
              <img src={logo} alt="Capital University Logo" className="w-full h-full object-contain p-2" />
            </div>
            <div>
              <h1
                className="font-black text-slate-900 dark:text-white text-lg tracking-tight uppercase"
                style={{ textShadow: "0 0 10px rgba(0,229,255,0.2)" }}
              >
                Capital
              </h1>
              <p className="text-[10px] text-[#00b8d4] dark:text-[#00e5ff] font-bold tracking-widest uppercase">
                University
              </p>
            </div>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <NavLink
            to="/dashboard"
            end
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard
              size={20}
              className="drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]"
            />{" "}
            Dashboard
          </NavLink>

          {/* Student & Doctor: My Classes - use end prop so /classes/browse doesn't highlight this */}
          {(user?.role === 'student' || user?.role === 'doctor') && (
            <NavLink
              to="/classes"
              end
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <BookOpen size={20} /> My Classes
            </NavLink>
          )}

          {user?.role === 'student' && (
            <NavLink
              to="/grades"
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <Award size={20} /> My Grades
            </NavLink>
          )}

          {/* Department Management - only for Doctor Heads */}
          {user?.role === 'doctor' && Number((user as any).permissions_level) === 1 && (
            <NavLink to="/admin/dept-management" className={linkClass} onClick={() => setOpen(false)}>
              <Building2 size={20} /> Dept Management
            </NavLink>
          )}

          {/* Browse Classes: students only */}
          {user?.role === "student" && (
            <>
              <NavLink
                to="/classes/browse"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <Search size={20} /> Browse Classes
              </NavLink>
              <NavLink
                to="/payments"
                className={linkClass}
                onClick={() => setOpen(false)}
              >
                <ClipboardList size={20} /> Payments
              </NavLink>
            </>
          )}

          {/* Profile — all roles */}
          <NavLink
            to="/profile"
            className={linkClass}
            onClick={() => setOpen(false)}
          >
            <Users size={20} /> My Profile
          </NavLink>

          {/* Admin section */}
          {(user?.role?.toLowerCase() === "admin" || (user as any)?.Role?.toLowerCase() === "admin") && (
            <>
              <div className="pt-6 pb-2">
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className="flex items-center justify-between w-full px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-[#00b8d4] dark:hover:text-[#00e5ff] uppercase tracking-widest transition-colors"
                >
                  Administration
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-500 ${adminExpanded ? "rotate-180 text-[#00e5ff]" : ""}`}
                  />
                </button>
              </div>
              {adminExpanded && (
                <div className="space-y-1.5 animate-slide-up">
                  {/* Role based split for Admins */}
                  {Number((user as any)?.permissions_level || (user as any)?.Permissions_Level) === 1 ? (
                    // Dean (Level 1) Links
                    <>
                      <NavLink to="/admin/users" className={linkClass} onClick={() => setOpen(false)}>
                        <UserPlus size={20} /> Manage Staff
                      </NavLink>
                      <NavLink to="/admin/departments" className={linkClass} onClick={() => setOpen(false)}>
                        <Building2 size={20} /> Departments
                      </NavLink>
                      <NavLink to="/admin/courses" className={linkClass} onClick={() => setOpen(false)}>
                        <FolderOpen size={20} /> Courses
                      </NavLink>
                      <NavLink to="/admin/classes" className={linkClass} onClick={() => setOpen(false)}>
                        <ClipboardList size={20} /> Classes
                      </NavLink>
                      <NavLink to="/admin/fees" className={linkClass} onClick={() => setOpen(false)}>
                        <DollarSign size={20} /> Manage Fees
                      </NavLink>
                      <NavLink to="/admin/rooms" className={linkClass} onClick={() => setOpen(false)}>
                        <Building2 size={20} /> Manage Rooms
                      </NavLink>
                    </>
                  ) : (
                    // Student Affairs (Level 2) Links
                    <>
                      <NavLink to="/admin/student-management" className={linkClass} onClick={() => setOpen(false)}>
                        <Users size={20} /> Student Management
                      </NavLink>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </nav>
        {/* User info + logout */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#111111] border border-[#00b8d4]/30 shadow-[0_0_10px_rgba(0,184,212,0.2)] flex items-center justify-center text-[#00e5ff] font-bold text-sm">
              {user?.f_name?.[0]}
              {user?.l_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {user?.f_name} {user?.l_name}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">
                {user?.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-400 hover:bg-red-900/20 hover:text-red-300 border border-transparent hover:border-red-500/30"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
