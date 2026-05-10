import { CheckCircle2, Calendar, FileText, Send, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdmissionsPage() {
  const steps = [
    {
      title: "Submit Application",
      desc: "Complete our online application form with your personal and academic details.",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-blue-500",
    },
    {
      title: "Upload Documents",
      desc: "Submit your transcripts, certificates, and identification documents.",
      icon: <FileText className="w-6 h-6" />,
      color: "bg-purple-500",
    },
    {
      title: "Review & Interview",
      desc: "Our admissions committee reviews your profile. Some programs may require an interview.",
      icon: <Calendar className="w-6 h-6" />,
      color: "bg-amber-500",
    },
    {
      title: "Join Capital",
      desc: "Receive your offer and start your journey with us as a Capital University student.",
      icon: <CheckCircle2 className="w-6 h-6" />,
      color: "bg-green-500",
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-primary-950 text-white overflow-hidden rounded-b-[4rem]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center pt-12">
          <h1 className="text-5xl md:text-8xl font-black mb-8 tracking-tighter">
            Join the <span className="text-primary-400">Class of 2030.</span>
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto mb-12 leading-relaxed">
            Your journey to global impact begins here. Apply to Capital University and join a community of visionary engineers.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/register" className="px-10 py-5 bg-white text-primary-950 rounded-2xl font-black shadow-xl hover:scale-105 transition">
              Start Application
            </Link>
            <Link to="/campus-life" className="px-10 py-5 bg-primary-800 text-white rounded-2xl font-black hover:bg-primary-700 transition">
              Request Information
            </Link>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-primary-950 dark:text-white mb-4">Admissions Process</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Four simple steps to join the most innovative engineering school in the region.</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative group">
              <div className={`w-16 h-16 ${step.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:rotate-12 transition-transform`}>
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-primary-950 dark:text-white mb-3">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              {i < 3 && (
                <div className="hidden lg:block absolute top-8 left-full w-full h-[1px] bg-slate-200 dark:bg-slate-800 -z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Deadlines & Requirements */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-soft border border-slate-100 dark:border-slate-800">
            <h3 className="text-2xl font-bold text-primary-950 dark:text-white mb-8 flex items-center gap-3">
              <Calendar className="text-primary-500" /> Key Deadlines
            </h3>
            <div className="space-y-8">
              {[
                { label: "Early Action", date: "Nov 15, 2025", desc: "Notification by late December" },
                { label: "Regular Decision", date: "Jan 15, 2026", desc: "Notification by late March" },
                { label: "Transfer Application", date: "Mar 01, 2026", desc: "Fall semester entry" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-start border-b border-slate-50 dark:border-slate-800 pb-6 last:border-0 last:pb-0">
                  <div>
                    <h4 className="font-bold text-primary-900 dark:text-slate-200">{item.label}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-primary-600">{item.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-soft border border-slate-100 dark:border-slate-800">
            <h3 className="text-2xl font-bold text-primary-950 dark:text-white mb-8 flex items-center gap-3">
              <FileText className="text-primary-500" /> Requirements
            </h3>
            <ul className="space-y-6">
              {[
                "High School Diploma with emphasis on Science/Math",
                "Minimum GPA of 3.5 on a 4.0 scale",
                "SAT/ACT Scores (Optional but recommended)",
                "English Proficiency (IELTS 6.5+ or TOEFL 80+)",
                "Two letters of recommendation from teachers",
                "Statement of purpose / Personal essay"
              ].map((req, i) => (
                <li key={i} className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 flex-shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-24 text-center max-w-4xl mx-auto px-6">
        <HelpCircle className="w-16 h-16 text-primary-200 dark:text-primary-800 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-primary-950 dark:text-white mb-6">Have more questions?</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-10">
          Our admissions team is here to help you through every step of the process. Contact us for personalized guidance.
        </p>
        <Link to="/register" className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-2xl font-bold hover:scale-105 transition">
          <Send size={18} /> Contact Admissions Team
        </Link>
      </section>
    </div>
  );
}
