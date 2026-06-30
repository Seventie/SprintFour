import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="w-full max-w-[800px] mt-8 px-4 animate-fade-in-up z-50">
      <div className="bg-white/80 backdrop-blur-md rounded-full flex items-center justify-between px-6 py-4 shadow-sm border border-[#e5e7eb]/50">
        <Link to="/" aria-label="Conseal Home" className="flex items-center gap-2 font-bold text-xl tracking-tight transition-transform hover:scale-105 duration-300">
          <ShieldAlert className="w-6 h-6 text-[#121212] fill-[#121212]/10" />
          Conseal
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/upload" className="relative text-[#121212] hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">Workspace</Link>
          <a href="/#how-it-works" className="relative text-[#121212] hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">How it works</a>
          <a href="/#github" className="relative text-[#121212] hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">GitHub</a>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
