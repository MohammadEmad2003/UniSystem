import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import AIChatPanel from './AIChatPanel';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <AIChatPanel />
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
