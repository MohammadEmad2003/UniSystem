import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Search, Check, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { useThemeStore } from '../hooks/useThemeStore';
import { notificationService } from '../services';
import type { Notification } from '../types';

export default function TopNav() {
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user) {
      notificationService.getByUser(user.user_id).then(res => setNotifications(res.data));
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotifClick = (notif: Notification) => {
    notificationService.markAsRead(notif.notification_id);
    setNotifications(prev => prev.map(n => n.notification_id === notif.notification_id ? { ...n, is_read: true } : n));
    setShowNotifs(false);
    if (notif.class_id) {
      navigate(`/classes/${notif.class_id}/stream`);
    }
  };

  const handleMarkAllRead = () => {
    if (user) {
      notificationService.markAllAsRead(user.user_id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <header className="sticky top-0 z-20 bg-white dark:bg-[#050b14]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00b8d4]" />
          <input
            type="text"
            placeholder="Search classes, materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-2.5 rounded-full bg-white dark:bg-[#111111]/80 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-[#00e5ff] focus:border-[#00e5ff] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner transition-all duration-300 hover:border-slate-500"
          />
        </div>

        <div className="flex items-center gap-5 ml-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-colors duration-300"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2.5 rounded-xl bg-white dark:bg-[#111111] hover:bg-[#1a1a24] border border-transparent hover:border-[#00b8d4]/30 transition-all duration-300 group"
            >
              <Bell size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-[#00e5ff] transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#00e5ff] text-[#050b14] text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse-soft shadow-[0_0_10px_#00e5ff]">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-3 w-96 bg-slate-50 dark:bg-[#0a192f]/95 backdrop-blur-3xl rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.8)] border border-slate-300 dark:border-slate-700 z-50 animate-scale-in overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-[#00b8d4] hover:text-[#00e5ff] hover:drop-shadow-[0_0_5px_#00e5ff] font-bold flex items-center gap-1 transition-all">
                        <Check size={14} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-sm font-medium">No new notifications in orbit</div>
                    ) : (
                      notifications.slice(0, 10).map(notif => (
                        <button
                          key={notif.notification_id}
                          onClick={() => handleNotifClick(notif)}
                          className={`w-full text-left px-5 py-4 hover:bg-white dark:bg-[#111111] transition-colors border-b border-slate-200 dark:border-slate-800/50 ${!notif.is_read ? 'bg-[#00b8d4]/5 border-l-2 border-l-[#00e5ff]' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!notif.is_read ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{notif.title}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {notif.class_name && (
                                  <span className="text-[10px] uppercase tracking-widest text-[#00b8d4] font-bold">{notif.class_name}</span>
                                )}
                                <span className="text-[10px] text-slate-500">{formatTime(notif.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <Link to="/profile" title="View Profile" className="block transform hover:scale-110 hover:-translate-y-0.5 transition-all duration-300">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00b8d4] to-[#007492] flex items-center justify-center text-[#ecf4ff] dark:text-[#050b14] font-black text-sm shadow-[0_0_15px_rgba(0,184,212,0.4)] hover:shadow-[0_0_25px_rgba(0,229,255,0.7)] ring-2 ring-transparent hover:ring-[#00e5ff]/50">
                {user?.f_name?.[0]}{user?.l_name?.[0]}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

