import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Navbar = () => {
  return (
    <header className="w-full max-w-[800px] mt-8 px-4 animate-fade-in-up z-50">
      <div className="bg-surface/80 backdrop-blur-md rounded-none flex items-center justify-between px-6 py-4 shadow-sm border border-brand-border/50">
        <Link to="/" aria-label="Conseal Home" className="flex items-center gap-2 font-bold text-xl tracking-tight transition-transform hover:scale-105 duration-300 font-sans">
          <Shield className="w-6 h-6 text-redaction-primary" />
          Conseal
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium font-mono uppercase tracking-wider">
          <Link to="/" className="relative text-brand-black hover:text-redaction-primary transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-redaction-primary after:transition-all hover:after:w-full duration-300">Home</Link>
          <Link to="/upload" className="relative text-brand-black hover:text-redaction-primary transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-redaction-primary after:transition-all hover:after:w-full duration-300">Workspace</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
