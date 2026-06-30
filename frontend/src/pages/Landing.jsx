import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';

const Landing = () => {
  return (
    <div className="min-h-screen flex flex-col items-center antialiased bg-white text-brand-black selection:bg-redaction-primary selection:text-white">
      {/* Navigation Bar */}
      <header className="w-full max-w-[800px] mt-8 px-4 animate-fade-in-up z-50">
        <div className="bg-white/80 backdrop-blur-md rounded-full flex items-center justify-between px-6 py-4 shadow-sm border border-brand-border/50">
          <Link to="/" aria-label="Conseal Home" className="flex items-center gap-2 font-bold text-xl tracking-tight transition-transform hover:scale-105 duration-300">
            <ShieldAlert className="w-6 h-6 text-brand-black fill-brand-black/10" />
            Conseal
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/upload" className="relative text-brand-black hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">Workspace</Link>
            <a href="#how-it-works" className="relative text-brand-black hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">How it works</a>
            <a href="#github" className="relative text-brand-black hover:text-black transition-colors after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-black after:transition-all hover:after:w-full duration-300">GitHub</a>
          </nav>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 w-full max-w-4xl mt-20 mb-24">
        {/* Hero Icon/Logo Graphic */}
        <div className="relative w-24 h-24 mb-10 flex items-center justify-center animate-float">
          {/* Shadow/Background Layers for 3D effect */}
          <div className="absolute inset-0 bg-red-100 rounded-2xl transform translate-y-[-10px] scale-90 opacity-60"></div>
          <div className="absolute inset-0 bg-red-200 rounded-2xl transform translate-y-[-5px] scale-95 opacity-80"></div>
          {/* Main Red Icon */}
          <div className="relative w-20 h-20 bg-redaction-primary rounded-2xl flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-10 h-10 text-white" />
          </div>
        </div>
        
        {/* Headline */}
        <h1 className="text-[3.5rem] md:text-[5rem] font-bold leading-[1.05] tracking-tighter mb-6 text-[#1a1a1a] animate-fade-in-up">
          Anonymize documents<br />
          safely and securely.
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl text-brand-gray mb-10 max-w-2xl font-normal leading-relaxed animate-fade-in-up delay-100">
          Redact or label personally identifying information (PII) automatically.<br className="hidden sm:block" />
          Ensure zero leaks before sharing with AI tools.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto animate-fade-in-up delay-200">
          <Link to="/upload" className="w-full sm:w-auto px-8 py-3.5 bg-brand-black text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-300 hover:scale-105 flex items-center justify-center">
            Open Workspace
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-3.5 bg-white text-brand-black border border-brand-border rounded-full font-semibold text-sm hover:bg-gray-50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2">
            See how it works
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>

      {/* Trusted By Logos */}
      <section className="w-full max-w-[1000px] px-4 pb-16 mt-auto animate-fade-in-up delay-300">
        <p className="text-center text-sm text-gray-400 font-medium mb-8 uppercase tracking-widest">
          Built for the SprintFour Hackathon
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
          {/* We keep the logos as requested or use placeholders, let's keep the user's provided ones as design elements */}
          <img alt="Metalab Logo" className="h-6 object-contain transition-transform duration-300 hover:-translate-y-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB8vRpPs6Wvf0XWPAO-1CNyVK401oDAIwbIwn9rvlWLy_fHiibU4Sa13J991Y2O6a8TeOkZTfavFfOYveS1tzQ0xLKu55Zx8EtYY4Ec0qpzh2NzSr-fIiVnqQbaKslaOin5uvffAQnkhW2x7FLBhI3wBZ1gXdE4x8Opjs_VleHqth4zIu5VNnvSwinaVpKVgoID5GgTOnBHIrgYNeJXOb6nssCm3rE2k9LFPKJvCDgWp9rmd-QXUUtwuBsM4rmTRqtPtqXZ0M8cdF9w" />
          <img alt="Figma Logo" className="h-7 object-contain transition-transform duration-300 hover:-translate-y-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDcMo2jrvmjiZM9ElbTHeFAQ4pmCEh4HBkFaBheKqrdrpsqE6uk_gHH9Clbn_3OVMJL_HyUxC02XC-2SbwvR-lxjjCt155OdxWKijLiPGkxIUJvmrDD7ydpQVg9csBk9C61PlKs0GWAYwb_b_3WZUqMQT5IaAiDxSNBcA3D-Vd9EmUcr4bPLUHGxE349WsH2qu7q-WgyPRgum0YOad9pN2T_OIJ7qLBCGs42QoQp8NVQZrMtfU_GO5PYjlCNkyRAqmtCl_59O4tg73k" />
          <img alt="Pentagram Logo" className="h-6 object-contain transition-transform duration-300 hover:-translate-y-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCiwPQXTl4uuAhKHZrUccHA3XzVdcBAN-VurSjpy8qHFGfXtjhvRYsyOphXVvB8XhGWivCRMNmw-lmHtsSjNQFxEsBjpMhToTAesKFLwn2RlYKmaaoKFtIStR-z4cMBKcktBuYW1L4DXvGZ69Ul9WRrPr6O5HcCsfAA28Bv2NUUrXtahLgxLfW9wnw68icMuuGXSJpInqswk6TbANRXcKkzdW5D0Oo21zyykOiT1ak2Ie2NOQRfZs-Npy6V0afVytv8OgRxhHs0l0Vu" />
          <img alt="Google Logo" className="h-7 object-contain transition-transform duration-300 hover:-translate-y-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAohH9pgfYVZnyHn7XomBbjD7BYat8tTmi75OQRoRBbHPyqnLT6E7mDX6xFBrL342mL34lm7QdFtYqDntQmW9rU11K4jKtyuzUKvPvVcctqvYTcjyBXhW-mzT6j0WPfDzb10qBed5cE_7qvg6NTl7L1svR02H21Xw9f2oDsVAVWVw2ygrKs66IiAmYQGRJlGXxc1h1cQrwJBThrrAWikPGhAe1xM8rc8y_ut_8WeNjD2oFDW61Fneq7pOfDJHdak8EdyiqMOWQkZlZA" />
          <img alt="Spotify Logo" className="h-7 object-contain transition-transform duration-300 hover:-translate-y-1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCypUhF2noWVr8-ujeu5sE8aPqX5lzIewPfAzEikoGDL9hJKnsyZCwPCjhecGh_ln0YD0NeEtK7t31QWRohSI8hQNOAqpBGjBHHuYUbd1hzJ3anL16iNcCKm-nbM1BUz5_4n9FwcwUdzzmkQh0owtjeHlF_9xizrLPoF1-G5-ASZF2Gz3BkxIQlPUNtKwIW7f_xprFU46Tld5mgwhvGpx2nABDGBQxaDz21SEESdKMN5BsyyUPht5IVl_ucg-WoVOkWnzcc-vB5Q0Wl" />
        </div>
      </section>
    </div>
  );
};

export default Landing;
