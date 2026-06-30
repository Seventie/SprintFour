import { Link } from 'react-router-dom';
import { ArrowRight, Shield, FileText, Eye, Download, CheckCircle2, Sparkles, Zap } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center antialiased bg-aura-cream dark:bg-background-dark text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <Navbar />

      {/* Hero Header */}
      <header className="relative pt-16 pb-20 lg:pt-24 lg:pb-32 flex flex-col items-center text-center w-full max-w-6xl px-4">
        {/* Decorative elements */}
        <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 border-black bg-white dark:bg-card-dark mb-8 shadow-brutalist-sm hover:shadow-retro transition-all cursor-default">
          <Sparkles className="w-4 h-4 text-primary animate-spin-slow" />
          <span className="text-xs font-bold tracking-widest text-gray-800 dark:text-gray-200 uppercase">Dual-Layer AI + Heuristic Protection</span>
        </div>

        <h1 className="max-w-4xl mx-auto px-4 mb-6">
          <div className="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-gray-900 dark:text-white leading-[1.1] mb-2 tracking-tight">
            Anonymize documents <span className="text-primary italic">safely</span>
          </div>
          <div className="text-5xl md:text-7xl lg:text-8xl font-hand text-gray-900 dark:text-primary transform -rotate-2 mt-4 block">
            with total clarity.
          </div>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed px-4 font-medium">
          Automatically detect and redact sensitive PII before sharing with AI or third parties. Understand every decision. Fix every mistake at volume.
        </p>

        {/* Audience pills */}
        <p className="text-xl md:text-2xl font-hand text-primary mb-4">
          Built for teams who can't afford a mistake.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-12 px-4">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card-blue border-2 border-black rounded-full shadow-brutalist-sm hover:-translate-y-1 transition-all cursor-default">
            <FileText className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Legal & Contracts</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card-yellow border-2 border-black rounded-full shadow-brutalist-sm hover:-translate-y-1 transition-all cursor-default">
            <Shield className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Healthcare Records</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card-orange border-2 border-black rounded-full shadow-brutalist-sm hover:-translate-y-1 transition-all cursor-default">
            <Zap className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Enterprise AI Prep</span>
          </div>
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-card-purple border-2 border-black rounded-full shadow-brutalist-sm hover:-translate-y-1 transition-all cursor-default">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Zero Data Leakage</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center w-full max-w-md px-4">
          <Link 
            to="/upload" 
            className="bg-primary text-white text-lg px-10 py-4 rounded-full border-2 border-black font-bold shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all duration-200 flex items-center justify-center gap-3"
          >
            Open Redaction Workspace
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* How It Works Section */}
      <section id="how-it-works" className="w-full max-w-6xl px-6 pb-28">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gray-900 dark:text-white">
            How Conseal Works
          </h2>
          <p className="font-hand text-xl text-primary">Simple, fast, and completely transparent.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              color: "bg-card-purple", 
              icon: <FileText className="w-7 h-7 text-black" />, 
              title: '1. Instant Analysis', 
              desc: 'Upload PDF, DOCX, or TXT documents. Our dual-layer engine combines spaCy NLP models with heuristic safety nets to find every trace of PII.' 
            },
            { 
              color: "bg-card-yellow", 
              icon: <Eye className="w-7 h-7 text-black" />, 
              title: '2. Explain & Triage', 
              desc: 'Click any word to ask "Why this? Why not that?". Review detections at lightning speed with keyboard shortcuts and built-in fatigue guards.' 
            },
            { 
              color: "bg-card-orange", 
              icon: <Download className="w-7 h-7 text-black" />, 
              title: '3. Export Sanitized', 
              desc: 'Download a clean, permanently redacted file. All author and creator metadata is automatically stripped for total privacy.' 
            },
          ].map((step, i) => (
            <div 
              key={i} 
              className={`${step.color} rounded-3xl p-8 border-2 border-black shadow-brutalist hover:shadow-brutalist-hover hover:-translate-y-1.5 transition-all duration-200 flex flex-col justify-between`}
            >
              <div>
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 border-2 border-black shadow-retro">
                  {step.icon}
                </div>
                <h3 className="font-display font-bold text-2xl text-black mb-3">{step.title}</h3>
                <p className="text-sm font-medium text-gray-800 leading-relaxed">{step.desc}</p>
              </div>
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
