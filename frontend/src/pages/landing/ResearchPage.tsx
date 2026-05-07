import { Zap, Shield, Cpu, Globe, ArrowUpRight, Beaker } from "lucide-react";
import researchHero from "../../assets/images/research_hero.png";

export default function ResearchPage() {
  const hubs = [
    {
      title: "AI & Cognitive Systems",
      lead: "Dr. Sarah Chen",
      projects: 14,
      desc: "Exploring deep learning, neural networks, and human-AI interaction.",
      icon: <Cpu className="w-10 h-10 text-primary-500" />
    },
    {
      title: "Sustainable Energy",
      lead: "Prof. James Wilson",
      projects: 8,
      desc: "Developing next-gen solar cells and grid optimization algorithms.",
      icon: <Zap className="w-10 h-10 text-amber-500" />
    },
    {
      title: "Cyber-Physical Security",
      lead: "Dr. Elena Rodriguez",
      projects: 11,
      desc: "Protecting critical infrastructure from digital and physical threats.",
      icon: <Shield className="w-10 h-10 text-rose-500" />
    },
    {
      title: "Biotechnology & Nano",
      lead: "Prof. Michael Aris",
      projects: 19,
      desc: "Innovating at the intersection of biology and nanotechnology.",
      icon: <Beaker className="w-10 h-10 text-emerald-500" />
    }
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <section className="pt-32 pb-24 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="inline-block px-4 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            Innovation Hub
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-primary-950 dark:text-white mb-8">
            Solving Global <span className="text-primary-600">Challenges.</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
            At Capital University, research isn't just about discovery—it's about impact. We bring together diverse minds to tackle the most pressing technical problems of our time.
          </p>
          <div className="flex items-center gap-8 border-t border-slate-100 dark:border-slate-800 pt-8">
            <div>
              <div className="text-3xl font-black text-primary-600">$42M+</div>
              <div className="text-xs font-bold uppercase text-slate-400">Annual Funding</div>
            </div>
            <div>
              <div className="text-3xl font-black text-primary-600">250+</div>
              <div className="text-xs font-bold uppercase text-slate-400">Patents Filed</div>
            </div>
            <div>
              <div className="text-3xl font-black text-primary-600">12</div>
              <div className="text-xs font-bold uppercase text-slate-400">Centers of Excellence</div>
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="aspect-video bg-slate-200 dark:bg-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
            <img 
              src={researchHero} 
              className="w-full h-full object-cover"
              alt="Lab research"
            />
          </div>
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary-600 rounded-3xl -z-10 animate-pulse" />
        </div>
      </section>

      {/* Research Hubs */}
      <section className="py-24 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-primary-950 dark:text-white mb-4">Research Centers</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Interdisciplinary hubs where faculty and students collaborate on high-stakes projects.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {hubs.map((hub, i) => (
              <div key={i} className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="mb-6 group-hover:scale-110 transition-transform">
                  {hub.icon}
                </div>
                <h3 className="text-xl font-bold text-primary-950 dark:text-white mb-3">{hub.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{hub.desc}</p>
                <div className="flex justify-between items-center text-xs font-bold border-t border-slate-50 dark:border-slate-800 pt-6">
                  <span className="text-slate-400">Lead: {hub.lead}</span>
                  <span className="text-primary-600">{hub.projects} Projects</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Publications/News */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-end mb-16">
          <div>
            <h2 className="text-4xl font-black text-primary-950 dark:text-white mb-4">Recent Publications</h2>
            <p className="text-slate-500">Our latest findings published in top-tier journals.</p>
          </div>
          <button className="flex items-center gap-2 text-primary-600 font-bold hover:gap-3 transition-all">
            View Research Repository <ArrowUpRight size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {[
            { date: "May 2026", journal: "Nature Nanotechnology", title: "Quantum Dot Sensors for Real-time Water Filtration Monitoring", authors: "Chen, L. et al." },
            { date: "April 2026", journal: "IEEE Transactions", title: "Distributed Consensus Algorithms for Swarm Robotics in Disaster Recovery", authors: "Wilson, J. & Lee, S." },
            { date: "March 2026", journal: "Sustainable Systems", title: "Graphene-Enhanced Lithium-Sulfur Batteries with 500+ Cycle Stability", authors: "Aris, M. et al." },
          ].map((pub, i) => (
            <div key={i} className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center gap-3 text-xs font-bold text-primary-500 mb-2 uppercase tracking-widest">
                  <Globe size={14} /> {pub.journal} • {pub.date}
                </div>
                <h4 className="text-xl font-bold text-primary-950 dark:text-white group-hover:text-primary-600 transition-colors">{pub.title}</h4>
              </div>
              <div className="text-slate-400 font-medium italic">{pub.authors}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
