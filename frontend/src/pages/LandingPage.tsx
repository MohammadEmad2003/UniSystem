import { Link } from "react-router-dom";
import { Moon, Sun, ArrowRight, Mail } from "lucide-react";
import { useThemeStore } from "../hooks/useThemeStore";

// استيراد الصور الخاصة بالوضعين
import heroImageDark from "../assets/images/capital_university.png";
import heroImageLight from "../assets/images/capital_university_light.png";

export default function LandingPage() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-[#050b14] dark:text-white relative font-sans transition-colors duration-300">
      {/* Background Decor - طبقات الخلفية الديكورية */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e5fbff] via-white to-transparent opacity-90 dark:from-[#07111f] dark:via-[#05101d] dark:to-[#050b14]" />
        <div className="absolute -left-16 top-12 w-64 h-64 rounded-full bg-primary-300/20 blur-3xl" />
        <div className="absolute right-0 top-36 w-96 h-96 rounded-full bg-primary-500/15 blur-3xl" />
      </div>

      {/* Navigation - شريط التنقل */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/50 dark:bg-slate-950/80 dark:border-slate-700/60 transition-colors">
        <div className="flex w-full items-center justify-between px-6 py-4 lg:px-12 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3">
            {/* اللوجو */}
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-600 text-white shadow-glow transform hover:rotate-3 transition duration-300">
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
          </div>

          <div className="hidden md:flex gap-8 text-sm font-semibold text-primary-900 dark:text-slate-200">
            <Link to="/" className="transition hover:text-primary-500">
              Academics
            </Link>
            <Link to="/" className="transition hover:text-primary-500">
              Admissions
            </Link>
            <Link to="/" className="transition hover:text-primary-500">
              Research
            </Link>
            <Link to="/" className="transition hover:text-primary-500">
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
              to="/register"
              className="rounded-full bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-soft hover:bg-primary-700 transition active:scale-95"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section - الهيرو سيكشن مع تبديل الصور */}
        <header className="relative h-[90vh] w-full flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 pt-20">
            <img
              src={theme === "dark" ? heroImageDark : heroImageLight}
              alt="Capital University Campus"
              className="h-full w-full object-cover scale-100 transition-opacity duration-700"
            />
            {/* التظليل المتغير حسب الوضع لضمان وضوح النص */}
            <div
              className={`absolute inset-0 transition-colors duration-500 ${
                theme === "dark"
                  ? "bg-gradient-to-r from-slate-950/90 via-slate-950/40 to-transparent"
                  : "bg-gradient-to-r from-white/90 via-white/30 to-transparent"
              }`}
            />
          </div>

          <div className="relative w-full max-w-7xl px-6 lg:px-12 animate-slide-up">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 dark:border-white/20 bg-white/60 dark:bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary-700 dark:text-primary-100 backdrop-blur-md mb-8">
                <span className="h-2 w-2 rounded-full bg-primary-500 animate-ping" />
                QS Ranked Excellence 2026
              </div>

              <h1 className="text-5xl font-extrabold leading-[1.1] tracking-tight text-primary-950 dark:text-white md:text-7xl lg:text-8xl">
                The Future of <br />
                <span className="text-primary-600 dark:text-primary-400">
                  Engineering.
                </span>
              </h1>

              <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-700 dark:text-slate-200 md:text-xl">
                Empowering the next generation of thinkers and leaders at
                <span className="font-bold text-primary-900 dark:text-white">
                  {" "}
                  Capital University
                </span>
                , with a modern campus built for global impact and industrial
                innovation.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-glow hover:bg-primary-700 transition group"
                >
                  Explore Programs
                  <ArrowRight
                    size={20}
                    className="group-hover:translate-x-1 transition"
                  />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-primary-200 dark:border-white/30 bg-white/50 dark:bg-white/10 px-8 py-4 text-base font-bold text-primary-900 dark:text-white backdrop-blur-md hover:bg-white/20 transition"
                >
                  Virtual Tour
                </Link>
              </div>
            </div>
          </div>

          <div
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50 ${theme === "dark" ? "text-white" : "text-primary-600"}`}
          >
            <div
              className={`h-10 w-6 rounded-full border-2 flex justify-center p-1 ${theme === "dark" ? "border-white" : "border-primary-600"}`}
            >
              <div
                className={`h-2 w-1 rounded-full ${theme === "dark" ? "bg-white" : "bg-primary-600"}`}
              ></div>
            </div>
          </div>
        </header>

        {/* Stats Section - قسم الإحصائيات */}
        <section className="py-16 bg-slate-50/50 dark:bg-slate-950 border-y border-slate-100 dark:border-slate-800 transition-colors">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "QS Ranking", val: "#120" },
              { label: "Global Partners", val: "450+" },
              { label: "Research Hubs", val: "12" },
              { label: "Success Rate", val: "98%" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl font-black text-primary-600 dark:text-primary-400">
                  {stat.val}
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Announcements - قسم الإعلانات */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="mb-16 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-4xl font-extrabold text-primary-950 dark:text-white mb-4">
                Latest Announcements
              </h2>
              <p className="max-w-md text-slate-600 dark:text-slate-400">
                Stay updated with academic schedules, innovation summits, and
                scholarship opportunities.
              </p>
            </div>
            <Link
              to="/"
              className="text-primary-600 font-bold hover:gap-2 transition-all flex items-center gap-1 dark:text-primary-400"
            >
              View All Notices <ArrowRight size={18} />
            </Link>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Spring 2026 Graduation Schedule",
                date: "May 15, 2026",
                category: "Academic",
                img: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80",
              },
              {
                title: "AI & Robotics: Global Summit",
                date: "May 20, 2026",
                category: "Events",
                img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80",
              },
              {
                title: "New Engineering Scholarships",
                date: "June 02, 2026",
                category: "Enrollment",
                img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80",
              },
            ].map((item, index) => (
              <article
                key={index}
                className="group overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-soft border border-slate-100 dark:border-slate-800 transition hover:-translate-y-2"
              >
                <div className="h-56 overflow-hidden relative">
                  <img
                    src={item.img}
                    className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-bold uppercase text-primary-600">
                    {item.category}
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-primary-950 dark:text-white mb-3">
                    {item.title}
                  </h3>
                  <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs text-slate-400">{item.date}</span>
                    <span className="text-sm font-bold text-primary-600">
                      Read More
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer - الفوتر المطور للوضعين */}
        <footer className="bg-slate-50 dark:bg-[#03080f] py-20 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-transparent transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid gap-12 md:grid-cols-4 mb-16">
              <div className="col-span-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-black">
                    C
                  </div>
                  <span className="text-2xl font-bold text-primary-950 dark:text-white tracking-tighter">
                    CAPITAL
                  </span>
                </div>
                <p className="max-w-xs leading-relaxed">
                  Leading the way in engineering education and industrial
                  research since 1992. Empowering students for the challenges of
                  2026 and beyond.
                </p>
              </div>
              <div>
                <h4 className="text-primary-950 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  Quick Links
                </h4>
                <ul className="space-y-4 text-sm">
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      Academic Calendar
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      className="hover:text-primary-600 dark:hover:text-primary-400 transition"
                    >
                      Student Portal
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-primary-950 dark:text-white font-bold mb-6 uppercase tracking-wider text-sm">
                  Connect
                </h4>
                <p className="text-sm mb-2 font-medium">
                  admissions@capital.edu
                </p>
                <p className="text-sm font-medium">+1 (555) 000-2026</p>
              </div>
            </div>
            <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center md:text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <p>© 2026 Capital University System. Excellence Redefined.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
