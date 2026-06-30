import { Link } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { ShieldAlert, ArrowRight } from 'lucide-react';

const Landing = () => {
  return (
    <PageWrapper>
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl mt-20 mb-24">
        {/* Hero Icon */}
        <div className="relative w-24 h-24 mb-10 flex items-center justify-center animate-float">
          <div className="absolute inset-0 bg-redaction-primary/20 rounded-none transform translate-y-[-10px] scale-90 opacity-60"></div>
          <div className="absolute inset-0 bg-redaction-primary/40 rounded-none transform translate-y-[-5px] scale-95 opacity-80"></div>
          <div className="relative w-20 h-20 bg-redaction-primary rounded-none flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
        </div>
        
        {/* Headline */}
        <h1 className="text-[3.5rem] md:text-[5rem] font-bold leading-[1.05] tracking-tighter mb-6 text-brand-black animate-fade-in-up font-sans">
          Anonymize documents<br />
          safely and securely.
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl text-brand-gray mb-10 max-w-2xl font-normal leading-relaxed animate-fade-in-up delay-100 font-sans">
          Redact or label personally identifying information (PII) automatically.<br className="hidden sm:block" />
          Ensure zero leaks before sharing with AI tools.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto animate-fade-in-up delay-200">
          <Link to="/upload" className="w-full sm:w-auto px-8 py-3.5 bg-brand-black text-white rounded-none font-medium font-mono uppercase tracking-wider text-sm hover:bg-redaction-primary transition-all duration-300 hover:scale-105 flex items-center justify-center">
            Open Workspace
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-3.5 bg-white text-brand-black border border-brand-border rounded-none font-medium font-mono uppercase tracking-wider text-sm hover:bg-gray-50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
            How it works
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>
      
      {/* Footer / Trusted By equivalent */}
      <section className="w-full max-w-[1000px] px-4 pb-16 mt-auto animate-fade-in-up delay-300">
        <div className="flex justify-center border-t border-brand-border/50 pt-8">
          <p className="text-center text-sm text-brand-gray font-mono uppercase tracking-widest">
            SprintFour Hackathon 2026 — Local First Architecture
          </p>
        </div>
      </section>
    </PageWrapper>
  );
};

export default Landing;
