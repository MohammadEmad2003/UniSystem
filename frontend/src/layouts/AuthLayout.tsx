import { Outlet } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-white dark:bg-[#0a192f]">
      {/* Deep Space Background gradient */}
      <div className="absolute inset-0 hidden dark:block bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#004d66] via-[#0a192f] to-[#050b14]" />

      {/* Glowing orbs for space effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-[#00e5ff] rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#0088ff] rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-[#111111]/50 backdrop-blur-xl border border-[#00e5ff]/20 shadow-[0_0_30px_rgba(0,229,255,0.2)] mb-5">
            <GraduationCap size={40} className="text-[#00e5ff]" />
          </div>
          <h1
            className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase"
            style={{ textShadow: "0 0 20px rgba(0,229,255,0.3)" }}
          >
            Capital University
          </h1>
          <p className="text-[#00b4d8] mt-2 font-medium tracking-widest text-sm uppercase">
            Management System
          </p>
        </div>

        {/* Dark Glass Card */}
        <div className="bg-white dark:bg-[#111111]/80 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-8 sm:p-10 animate-scale-in">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
