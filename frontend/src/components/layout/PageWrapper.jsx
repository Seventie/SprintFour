import Navbar from './Navbar';

const PageWrapper = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center antialiased bg-aura-cream dark:bg-background-dark text-gray-900 dark:text-gray-100 selection:bg-primary selection:text-white overflow-x-hidden">
      <Navbar />
      {children}
    </div>
  );
};

export default PageWrapper;
