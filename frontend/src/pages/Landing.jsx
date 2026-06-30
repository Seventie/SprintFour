import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight, Shield, FileText, Eye, Download } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center antialiased bg-white text-[#1a1a1a]">
      {/* Navigation */}
      <header className="w-full max-w-[800px] mt-6 px-4 animate-fade-in-up z-50">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-between px-5 py-3.5 shadow-sm border border-gray-100">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg tracking-tight transition-transform hover:scale-105 duration-200">
            <Shield className="w-5 h-5 text-[#121212]" />
            Conseal
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            <Link to="/upload" className="text-gray-600 hover:text-black transition-colors duration-200">Workspace</Link>
            <a href="#how-it-works" className="text-gray-600 hover:text-black transition-colors duration-200">How it works</a>
          </nav>
          <Link 
            to="/upload" 
            className="px-5 py-2 bg-[#121212] text-white rounded-xl font-semibold text-xs hover:bg-gray-800 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl mt-16 mb-20">
        {/* Icon */}
        <div className="relative w-20 h-20 mb-8 flex items-center justify-center animate-float">
          <div className="absolute inset-0 bg-gray-100 rounded-2xl transform -translate-y-2 scale-90 opacity-60"></div>
          <div className="absolute inset-0 bg-gray-200/60 rounded-2xl transform -translate-y-1 scale-95 opacity-80"></div>
          <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Headline */}
        <h1 className="text-[3rem] md:text-[4.5rem] font-bold leading-[1.05] tracking-tighter mb-5 text-[#1a1a1a] animate-fade-in-up">
          Anonymize documents<br />
          safely and securely.
        </h1>
        
        {/* Sub */}
        <p className="text-base md:text-lg text-gray-500 mb-8 max-w-xl font-normal leading-relaxed animate-fade-in-up delay-100" style={{opacity: 1}}>
          Automatically detect and redact PII before sharing with AI tools.
          <br className="hidden sm:block" />
          Understand every decision. Fix every mistake.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto animate-fade-in-up delay-200" style={{opacity: 1}}>
          <Link 
            to="/upload" 
            className="w-full sm:w-auto px-8 py-3.5 bg-[#121212] text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
          >
            Open Workspace
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a 
            href="#how-it-works" 
            className="w-full sm:w-auto px-8 py-3.5 bg-white text-[#1a1a1a] border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
          >
            See how it works
          </a>
        </div>
      </main>

      {/* How It Works */}
      <section id="how-it-works" className="w-full max-w-4xl px-4 pb-20 animate-fade-in-up delay-300" style={{opacity: 1}}>
        <h2 className="text-center text-xs text-gray-400 font-bold mb-10 uppercase tracking-[0.2em]">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { 
              icon: <FileText className="w-5 h-5" />, 
              title: 'Upload', 
              desc: 'Drop your PDF, DOCX, or TXT files. Our engine extracts and analyzes the text.' 
            },
            { 
              icon: <Eye className="w-5 h-5" />, 
              title: 'Review & Correct', 
              desc: 'Inspect every detection. Accept, reject, or flag. Add missed PII manually.' 
            },
            { 
              icon: <Download className="w-5 h-5" />, 
              title: 'Export Clean', 
              desc: 'Download a safely redacted document with PII permanently removed.' 
            },
          ].map((step, i) => (
            <div 
              key={i} 
              className="bg-gray-50 rounded-2xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200"
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 border border-gray-200 text-gray-500">
                {step.icon}
              </div>
              <h3 className="font-bold text-base mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          Built for the SprintFour Hackathon 2026 · Problems 1 + 3
        </p>
      </footer>
    </div>
  );
};

export default Landing;
