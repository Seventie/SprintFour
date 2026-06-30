import Navbar from './Navbar';

const PageWrapper = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center antialiased bg-system-bg text-brand-black selection:bg-redaction-primary selection:text-white">
      <Navbar />
      {children}
    </div>
  );
};

export default PageWrapper;
