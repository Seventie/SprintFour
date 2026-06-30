import { useState } from 'react';
import { ReviewProvider } from '../context/ReviewContext';
import FileSidebar from '../components/review/FileSidebar';
import SummaryBar from '../components/review/SummaryBar';
import DocumentViewer from '../components/review/DocumentViewer';
import InspectionPanel from '../components/review/InspectionPanel';
import Navbar from '../components/layout/Navbar';

const ReviewWorkspace = () => {
  const [activeDetection, setActiveDetection] = useState(null);

  return (
    <div className="h-screen w-full flex flex-col bg-system-bg overflow-hidden">
      {/* Mini top nav for workspace (not full landing navbar) */}
      <div className="h-14 bg-brand-black text-white px-4 flex items-center shrink-0">
        <span className="font-sans font-bold text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-redaction-primary inline-block"></span> 
          Conseal Workspace
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <FileSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <SummaryBar />
          
          <div className="flex-1 flex overflow-hidden">
            <DocumentViewer 
              activeDetection={activeDetection} 
              setActiveDetection={setActiveDetection} 
            />
            <InspectionPanel 
              activeDetection={activeDetection} 
              setActiveDetection={setActiveDetection}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const Review = () => {
  return (
    <ReviewProvider>
      <ReviewWorkspace />
    </ReviewProvider>
  );
};

export default Review;
