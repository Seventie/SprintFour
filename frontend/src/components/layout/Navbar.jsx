import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="w-full max-w-[1000px] mx-auto mt-6 px-4 z-50">
      <div className="bg-white dark:bg-card-dark rounded-full flex items-center justify-between px-6 py-3.5 border-2 border-black shadow-brutalist-sm hover:shadow-retro transition-all duration-200">
        <Link to="/" className="flex items-center gap-2.5 font-display font-bold text-2xl tracking-tight text-gray-900 dark:text-white transition-transform hover:scale-105">
          <div className="bg-primary p-1.5 rounded-full border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
            <Shield className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <span>Conseal<span className="text-primary font-hand text-3xl ml-0.5">.</span></span>
        </Link>
        <nav className="flex items-center gap-6 text-xs md:text-sm font-bold uppercase tracking-wider">
          <Link to="/" className="text-gray-800 dark:text-gray-200 hover:text-primary transition-colors">Home</Link>
          <Link to="/upload" className="text-gray-800 dark:text-gray-200 hover:text-primary transition-colors">Workspace</Link>
          <Link to="/upload" className="bg-secondary text-black px-5 py-2 rounded-full border-2 border-black font-bold shadow-retro hover:translate-y-[-2px] hover:shadow-retro-hover transition-all text-xs">
            Start Redacting
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
