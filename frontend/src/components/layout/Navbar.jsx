import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="w-full max-w-[800px] mt-6 px-4 animate-fade-in-up z-50">
      <div className="bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-between px-5 py-3.5 shadow-sm border border-gray-100">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight transition-transform hover:scale-105 duration-200">
          <Shield className="w-5 h-5 text-[#121212]" />
          Conseal
        </Link>
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link to="/upload" className="text-gray-600 hover:text-black transition-colors duration-200">Workspace</Link>
          <Link to="/" className="text-gray-600 hover:text-black transition-colors duration-200">Home</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
