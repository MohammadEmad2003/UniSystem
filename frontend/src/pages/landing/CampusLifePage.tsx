import { Coffee, Music, Heart, MapPin, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import campusHero from "../../assets/images/campus_hero.png";
import campusDetail from "../../assets/images/campus_detail.png";

export default function CampusLifePage() {
  const highlights = [
    { title: "Student Clubs", count: "40+", icon: <Music className="text-rose-500" /> },
    { title: "Modern Labs", count: "12", icon: <Coffee className="text-amber-500" /> },
    { title: "Sports Complex", count: "5", icon: <Heart className="text-emerald-500" /> },
    { title: "Innovation Hub", count: "24/7", icon: <Camera className="text-blue-500" /> },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section - Immersive Split Layout */}
      <section className="pt-32 pb-24 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black uppercase tracking-[0.2em]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Campus Experience
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-primary-950 dark:text-white leading-[1.1] tracking-tighter">
              Where <span className="text-primary-600">Innovation</span> <br />
              Meets Community.
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-xl">
              Beyond the lectures and labs, Capital University offers a rich tapestry of experiences designed to help you grow, connect, and lead. Discover your passion in our 40+ student organizations.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link to="/register" className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-glow hover:bg-primary-700 transition active:scale-95">
                Explore Student Life
              </Link>
              <Link to="/admissions" className="px-8 py-4 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition active:scale-95">
                Campus Map
              </Link>
            </div>
          </div>

          <div className="flex-1 relative w-full">
            <div className="relative z-10 rounded-[3.5rem] overflow-hidden shadow-2xl aspect-[4/5] md:aspect-square bg-slate-100 dark:bg-slate-800">
              <img 
                src={campusHero} 
                className="w-full h-full object-cover" 
                alt="Students walking on campus"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-950/40 to-transparent" />
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -left-6 md:-bottom-10 md:-left-10 w-48 h-48 md:w-64 md:h-64 rounded-[2.5rem] overflow-hidden border-8 border-white dark:border-slate-900 shadow-2xl z-20 hidden sm:block ring-1 ring-black/5 bg-slate-200 dark:bg-slate-700">
              <img 
                src={campusDetail} 
                className="w-full h-full object-cover" 
                alt="Modern university building"
              />
            </div>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-100 dark:bg-primary-900/20 rounded-full blur-3xl -z-10" />
            <div className="absolute top-1/2 -right-6 w-32 h-32 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-2xl -z-10" />
          </div>
        </div>
      </section>

      {/* Stats/Highlights */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
            {highlights.map((h, i) => (
              <div key={i} className="flex flex-col md:flex-row items-center md:items-start gap-5 group">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl shadow-soft group-hover:bg-primary-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  {h.icon}
                </div>
                <div className="text-center md:text-left">
                  <div className="text-3xl font-black text-primary-950 dark:text-white leading-none mb-1">{h.count}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities & Services */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-4xl font-black text-primary-950 dark:text-white mb-4">Beyond the Classroom</h2>
          <p className="text-slate-500 max-w-xl">World-class facilities designed for work, play, and everything in between.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {/* Facilities & Services */}
          {[
            {
              title: "Engineering Commons",
              desc: "A 24/7 collaborative space equipped with high-performance workstations and 3D printing labs.",
              img: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80"
            },
            {
              title: "Innovation Hub",
              desc: "Our startup incubator where student entrepreneurs turn classroom theories into market-ready ventures.",
              img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80"
            },
            {
              title: "Wellness Center",
              desc: "A state-of-the-art gym, swimming pool, and mental health support services for a balanced life.",
              img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&q=80"
            }
          ].map((f, i) => (
            <Link to="/register" key={i} className="group cursor-pointer">
              <div className="aspect-[4/3] rounded-[3rem] overflow-hidden mb-8 shadow-lg ring-1 ring-slate-200 dark:ring-slate-800">
                <img src={f.img} className="w-full h-full object-cover group-hover:scale-110 transition duration-700 ease-in-out" />
              </div>
              <h3 className="text-2xl font-bold text-primary-950 dark:text-white mb-3 group-hover:text-primary-600 transition-colors">{f.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{f.desc}</p>
              <div className="flex items-center gap-2 text-primary-600 font-bold group-hover:gap-3 transition-all text-sm uppercase tracking-widest">
                Explore Facility <MapPin size={16} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Community Callout */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="bg-primary-950 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 opacity-20">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border-[40px] border-primary-500 rounded-full blur-3xl animate-pulse" />
          </div>
          <div className="relative z-10">
            <span className="text-primary-400 font-black uppercase tracking-[0.3em] text-xs mb-8 block">Start Your Journey</span>
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter">Ready to join the <br /><span className="text-primary-500">community?</span></h2>
            <p className="text-primary-100/70 max-w-xl mx-auto mb-12 text-lg leading-relaxed">
              Experience the energy of Capital University firsthand. Schedule a physical campus tour or attend our next virtual open house.
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/register" className="px-12 py-5 bg-primary-600 text-white rounded-2xl font-black hover:bg-primary-700 transition shadow-glow active:scale-95">
                Schedule a Visit
              </Link>
              <Link to="/academics" className="px-12 py-5 bg-white/5 text-white border border-white/20 rounded-2xl font-black hover:bg-white/10 transition backdrop-blur-md active:scale-95">
                Virtual Tour
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
