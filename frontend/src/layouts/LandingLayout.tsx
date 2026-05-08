import { Outlet } from "react-router-dom";
import LandingNavbar from "../components/landing/LandingNavbar";
import LandingFooter from "../components/landing/LandingFooter";

export default function LandingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 dark:bg-[#050b14] dark:text-white relative font-sans transition-colors duration-300">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-[-10]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e5fbff] via-white to-transparent opacity-90 dark:from-[#07111f] dark:via-[#05101d] dark:to-[#050b14]" />
        <div className="absolute -left-16 top-12 w-64 h-64 rounded-full bg-primary-300/20 blur-3xl" />
        <div className="absolute right-0 top-36 w-96 h-96 rounded-full bg-primary-500/15 blur-3xl" />
      </div>

      <LandingNavbar />
      
      <main className="relative z-10 flex-grow">
        <Outlet />
      </main>

      <LandingFooter />
    </div>
  );
}
