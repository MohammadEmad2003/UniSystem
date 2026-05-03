import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  LayoutDashboard, BookOpen, Users, Building2, GraduationCap,
  ShieldCheck, UserPlus, LogOut, Menu, X, ChevronDown,
  ClipboardList, FolderOpen, Search
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const [adminExpanded, setAdminExpanded] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'sidebar-link-active' : 'sidebar-link';

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-surface-100"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-40 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-72 bg-white border-r border-surface-100 flex flex-col`}>
        {/* Logo */}
        <div className="p-6 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-header flex items-center justify-center">
              <GraduationCap size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-surface-900 text-lg leading-tight">Capital</h1>
              <p className="text-xs text-surface-500 font-medium">University System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink to="/dashboard" end className={linkClass} onClick={() => setOpen(false)}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>

          {/* Student & Doctor: My Classes — use `end` so /classes/browse doesn't highlight this */}
          {(user?.role === 'student' || user?.role === 'doctor') && (
            <NavLink to="/classes" end className={linkClass} onClick={() => setOpen(false)}>
              <BookOpen size={20} /> My Classes
            </NavLink>
          )}

          {/* Browse Classes: students only */}
          {user?.role === 'student' && (
            <NavLink to="/classes/browse" className={linkClass} onClick={() => setOpen(false)}>
              <Search size={20} /> Browse Classes
            </NavLink>
          )}

          {/* Profile — all roles */}
          <NavLink to="/profile" className={linkClass} onClick={() => setOpen(false)}>
            <Users size={20} /> My Profile
          </NavLink>

          {/* Admin section */}
          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-2">
                <button
                  onClick={() => setAdminExpanded(!adminExpanded)}
                  className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-surface-400 uppercase tracking-wider"
                >
                  Administration
                  <ChevronDown size={14} className={`transition-transform ${adminExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {adminExpanded && (
                <div className="space-y-1 animate-fade-in">
                  <NavLink to="/admin/approvals" className={linkClass} onClick={() => setOpen(false)}>
                    <ShieldCheck size={20} /> Approvals
                  </NavLink>
                  <NavLink to="/admin/users" className={linkClass} onClick={() => setOpen(false)}>
                    <UserPlus size={20} /> Manage Users
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
                </div>
              )}
            </>
          )}
        </nav>

        {/* User info + logout */}
        <div className="p-4 border-t border-surface-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.f_name?.[0]}{user?.l_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-surface-800 truncate">{user?.f_name} {user?.l_name}</p>
              <p className="text-xs text-surface-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
