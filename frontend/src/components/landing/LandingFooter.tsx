import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from "lucide-react";
import logo from "../../assets/images/logo.png";

export default function LandingFooter() {
  return (
    <footer className="relative z-20 bg-slate-50 dark:bg-[#03080f] pt-24 pb-12 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 mb-20">
          <div className="col-span-1 lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-8 group">
              <img src={logo} alt="Capital University Logo" className="h-10 w-10 object-contain group-hover:rotate-3 transition" />
              <span className="text-2xl font-bold text-primary-950 dark:text-white tracking-tighter">
                CAPITAL
              </span>
            </Link>
            <p className="max-w-xs leading-relaxed mb-8">
              Leading the way in engineering education and industrial research
              since 1992. Empowering students for the challenges of tomorrow.
            </p>
            <div className="flex gap-4">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-primary-600 hover:text-white transition-all shadow-sm">
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-primary-950 dark:text-white font-black mb-8 uppercase tracking-widest text-xs">
              Quick Navigation
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link to="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center gap-2">
                   Home
                </Link>
              </li>
              <li>
                <Link to="/academics" className="hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center gap-2">
                   Academics
                </Link>
              </li>
              <li>
                <Link to="/admissions" className="hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center gap-2">
                   Admissions
                </Link>
              </li>
              <li>
                <Link to="/research" className="hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center gap-2">
                   Research
                </Link>
              </li>
              <li>
                <Link to="/campus-life" className="hover:text-primary-600 dark:hover:text-primary-400 transition flex items-center gap-2">
                   Campus Life
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-primary-950 dark:text-white font-black mb-8 uppercase tracking-widest text-xs">
              Student Resources
            </h4>
            <ul className="space-y-4 text-sm font-medium">
              <li>
                <Link to="/login" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                  Student Portal Login
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                  Apply for Admission
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                  Academic Calendar
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-primary-600 dark:hover:text-primary-400 transition">
                  Library Services
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-primary-950 dark:text-white font-black mb-8 uppercase tracking-widest text-xs">
              Contact Info
            </h4>
            <ul className="space-y-6 text-sm font-medium">
              <li className="flex gap-4">
                <MapPin className="text-primary-500 flex-shrink-0" size={20} />
                <span>123 University Ave, <br />Tech City, TC 10101</span>
              </li>
              <li className="flex gap-4">
                <Phone className="text-primary-500 flex-shrink-0" size={20} />
                <span>+1 (555) 123-4567</span>
              </li>
              <li className="flex gap-4">
                <Mail className="text-primary-500 flex-shrink-0" size={20} />
                <span>admissions@capital.edu</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/60 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          <p>© 2026 Capital University System. All Rights Reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary-600 transition">Privacy Policy</a>
            <a href="#" className="hover:text-primary-600 transition">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
