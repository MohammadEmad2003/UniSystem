import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useThemeStore } from "../../hooks/useThemeStore";

export default function LandingNavbar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/50 dark:bg-slate-950/80 dark:border-slate-700/60 transition-colors">
      <div className="flex w-full items-center justify-between px-6 py-4 lg:px-12 max-w-[1600px] mx-auto">
        <Link to="/" className="flex items-center gap-3 group">
          {/* Logo */}
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-glow transform group-hover:rotate-3 transition duration-300">
            <span className="text-xl font-black">C</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl font-black tracking-tighter text-primary-950 dark:text-white">
              CAPITAL
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-primary-500">
              UNIVERSITY
            </span>
          </div>
        </Link>

        <div className="hidden md:flex gap-8 text-sm font-semibold text-primary-900 dark:text-slate-200">
          <Link to="/" className="transition hover:text-primary-500">
            Home
          </Link>
          <Link to="/academics" className="transition hover:text-primary-500">
            Academics
          </Link>
          <Link to="/admissions" className="transition hover:text-primary-500">
            Admissions
          </Link>
          <Link to="/research" className="transition hover:text-primary-500">
            Research
          </Link>
          <Link to="/campus-life" className="transition hover:text-primary-500">
            Campus Life
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-primary-700 shadow-sm transition hover:border-primary-500 hover:text-primary-500 dark:border-slate-700 dark:bg-slate-900 dark:text-primary-300"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            to="/login"
            className="hidden sm:block text-sm font-bold text-primary-700 hover:text-primary-500 transition"
          >
            Portal Login
          </Link>
          <Link
            to="/login"
            className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-soft hover:bg-primary-700 transition active:scale-95"
          >
            Apply Now
          </Link>
        </div>
      </div>
    </nav>
  );
}
