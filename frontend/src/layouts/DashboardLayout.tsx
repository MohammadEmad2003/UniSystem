import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import AIChatPanel from './AIChatPanel';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-transparent font-sans text-slate-800 dark:text-slate-200 selection:bg-[#00e5ff]/30 selection:text-white">
      <Sidebar />
      <AIChatPanel />
      <div className="lg:ml-72 min-h-screen flex flex-col transition-all duration-500 ease-out">
        <TopNav />
        <main className="flex-1 p-6 lg:p-10 w-full max-w-[1400px] mx-auto page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

