import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Check } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { notificationService } from '../services';
import type { Notification } from '../types';

export default function TopNav() {
  const { user } = useAuthStore();
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
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-surface-100">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Search classes, materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-50 border border-surface-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-4 ml-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2.5 rounded-xl bg-surface-50 hover:bg-surface-100 transition-colors"
            >
              <Bell size={20} className="text-surface-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse-soft">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-surface-100 z-50 animate-scale-in overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100">
                    <h3 className="font-semibold text-surface-800">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                        <Check size={14} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-surface-400 text-sm">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map(notif => (
                        <button
                          key={notif.notification_id}
                          onClick={() => handleNotifClick(notif)}
                          className={`w-full text-left px-4 py-3 hover:bg-surface-50 transition-colors border-b border-surface-50 ${!notif.is_read ? 'bg-primary-50/50' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.is_read ? 'bg-primary-500' : 'bg-transparent'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-800 truncate">{notif.title}</p>
                              <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{notif.message}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {notif.class_name && (
                                  <span className="text-xs text-primary-600 font-medium">{notif.class_name}</span>
                                )}
                                <span className="text-xs text-surface-400">{formatTime(notif.created_at)}</span>
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.f_name?.[0]}{user?.l_name?.[0]}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
