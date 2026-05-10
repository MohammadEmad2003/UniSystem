import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useThemeStore } from "../hooks/useThemeStore";

// استيراد الصور الخاصة بالوضعين
import heroImageDark from "../assets/images/capital_university.png";
import heroImageLight from "../assets/images/capital_university_light.png";

export default function LandingPage() {
  const { theme } = useThemeStore();

  return (
    <div className="animate-fade-in">
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

        <div className="relative w-full max-w-full px-6 lg:px-24 animate-slide-up">
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
                to="/academics"
                className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-glow hover:bg-primary-700 transition group "
              >
                Explore Programs
                <ArrowRight
                  size={20}
                  className="group-hover:translate-x-1 transition"
                />
              </Link>
              <Link
                to="/campus-life"
                className="inline-flex items-center justify-center rounded-2xl border border-primary-200 dark:border-white/30 bg-white/50 dark:bg-white/10 px-8 py-4 text-base font-bold text-primary-900 dark:text-white backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/20 transition "
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
            to="/academics"
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
    </div>
  );
}
