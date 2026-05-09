import { ArrowRight, BookOpen, GraduationCap, Microscope, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import academicsHero from "../../assets/images/academics_hero.png";

export default function AcademicsPage() {
  const departments = [
    {
      name: "Computer Engineering",
      icon: <Cpu className="w-8 h-8 text-primary-500" />,
      description: "Pushing the boundaries of computing, AI, and software engineering.",
      programs: ["BSc Software Engineering", "BSc Artificial Intelligence", "MSc Data Science"],
    },
    {
      name: "Electrical Engineering",
      icon: <Microscope className="w-8 h-8 text-blue-500" />,
      description: "Innovating in power systems, electronics, and telecommunications.",
      programs: ["BSc Power Systems", "BSc Telecommunications", "PhD Electronics"],
    },
    {
      name: "Civil Engineering",
      icon: <BookOpen className="w-8 h-8 text-amber-500" />,
      description: "Building the sustainable infrastructure of the future.",
      programs: ["BSc Structural Engineering", "BSc Environmental Systems"],
    },
    {
      name: "Mechanical Engineering",
      icon: <GraduationCap className="w-8 h-8 text-rose-500" />,
      description: "Advancing robotics, thermodynamics, and manufacturing.",
      programs: ["BSc Mechatronics", "BSc Automotive Design"],
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-black text-primary-950 dark:text-white mb-6">
              Academic <span className="text-primary-600">Excellence.</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8">
              Discover a world-class education designed to empower the next generation of engineers and innovators. Our curriculum combines theoretical depth with hands-on industrial experience.
            </p>
            <div className="flex gap-4">
              <Link to="/register" className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-glow hover:bg-primary-700 transition">
                Apply Now
              </Link>
              <Link to="/admissions" className="px-8 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition">
                Download Catalog
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Departments Grid */}
      <section className="py-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-primary-950 dark:text-white mb-4">Our Departments</h2>
            <p className="text-slate-500 dark:text-slate-400">Leading research and education across multiple engineering disciplines.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {departments.map((dept, idx) => (
              <div key={idx} className="p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-soft hover:shadow-xl transition-all group">
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 w-fit rounded-2xl group-hover:scale-110 transition-transform">
                  {dept.icon}
                </div>
                <h3 className="text-2xl font-bold text-primary-950 dark:text-white mb-4">{dept.name}</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                  {dept.description}
                </p>
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-primary-500">Featured Programs</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {dept.programs.map((prog, pIdx) => (
                      <li key={pIdx} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                        {prog}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/register" className="mt-8 flex items-center gap-2 text-primary-600 font-bold hover:gap-3 transition-all">
                  Explore Department <ArrowRight size={18} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
              <img
                src={academicsHero}
                alt="Students collaborating"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 p-8 bg-primary-600 rounded-3xl text-white shadow-glow hidden lg:block">
              <div className="text-4xl font-black mb-1">98%</div>
              <div className="text-xs font-bold uppercase tracking-wider opacity-80">Graduate Success Rate</div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold text-primary-950 dark:text-white mb-8">
              A Curriculum Built for <span className="text-primary-600">The Real World.</span>
            </h2>
            <div className="space-y-6">
              {[
                { title: "Interdisciplinary Approach", desc: "Collaborate across departments to solve complex global challenges." },
                { title: "Industry Partnerships", desc: "Gain experience through internships with top global tech and engineering firms." },
                { title: "Research-Driven", desc: "Work alongside world-class faculty on cutting-edge research projects from year one." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-primary-900 dark:text-slate-100 mb-1">{item.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
