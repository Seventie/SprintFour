import { useReview } from '../../context/ReviewContext';
import { FileText, ChevronLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';

const FileSidebar = () => {
  const { state, dispatch } = useReview();
  const { documents, activeDocId, sidebarOpen, detections } = state;

  const getDocStatusIcon = (docId) => {
    const docDetections = detections[docId] || [];
    const missed = docDetections.filter(d => d.status === 'missed').length;
    if (missed > 0) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  return (
    <div className={`bg-surface border-r border-brand-border flex flex-col transition-all duration-300 ${sidebarOpen ? 'w-72' : 'w-16'}`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-brand-border shrink-0">
        {sidebarOpen && <span className="font-mono text-sm font-semibold uppercase tracking-wider">Documents</span>}
        <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="p-2 hover:bg-surface-dim rounded-sm transition-colors mx-auto">
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        {documents.map(doc => (
          <button 
            key={doc.doc_id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
            className={`w-full flex items-center gap-3 px-4 py-3 border-l-4 transition-colors ${
              activeDocId === doc.doc_id 
                ? 'border-redaction-primary bg-redaction-primary/5' 
                : 'border-transparent hover:bg-surface-dim'
            }`}
            title={doc.filename}
          >
            <FileText className="w-5 h-5 text-brand-gray shrink-0" />
            {sidebarOpen && (
              <>
                <span className="font-sans text-sm truncate flex-1 text-left">{doc.filename}</span>
                {getDocStatusIcon(doc.doc_id)}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FileSidebar;
