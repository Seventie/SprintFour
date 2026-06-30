import { useReview } from '../../context/ReviewContext';
import { getStatusColors } from '../../utils/statusColors';
import { Shield, X, Check, Flag } from 'lucide-react';

const InspectionPanel = ({ activeDetection, setActiveDetection }) => {
  const { state, dispatch } = useReview();
  const { activeDocId } = state;

  if (!activeDetection) {
    return (
      <div className="w-80 bg-surface-dark text-white border-l border-border-dark flex flex-col p-6 items-center justify-center">
        <Shield className="w-12 h-12 text-outline mb-4 opacity-50" />
        <p className="font-mono text-sm text-text-muted text-center uppercase">Select a highlight to inspect detection details.</p>
      </div>
    );
  }

  const { id, type, confidence, text, reason, status } = activeDetection;
  const confPercent = (confidence * 100).toFixed(0);

  const handleStatusChange = (newStatus) => {
    dispatch({ 
      type: 'UPDATE_DETECTION_STATUS', 
      payload: { docId: activeDocId, detectionId: id, status: newStatus } 
    });
    // Immediately update local active state so UI doesn't bounce
    setActiveDetection({ ...activeDetection, status: newStatus });
  };

  return (
    <div className="w-80 bg-surface-dark text-white border-l border-border-dark flex flex-col h-full overflow-y-auto">
      <div className="p-6 border-b border-border-dark flex items-start justify-between">
        <div>
          <span className="font-mono text-xs text-text-muted tracking-wider uppercase mb-1 block">DETECTION_ID: {id.substring(0,6)}</span>
          <h2 className="font-sans font-bold text-xl">{type}</h2>
        </div>
        <button onClick={() => setActiveDetection(null)} className="text-text-muted hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 flex-1 space-y-8">
        <div>
          <div className="flex justify-between font-mono text-sm mb-2 uppercase">
            <span className="text-text-muted">Confidence</span>
            <span className={confidence > 0.8 ? 'text-green-400' : 'text-amber-400'}>{confPercent}%</span>
          </div>
          <div className="h-1 bg-border-dark w-full">
            <div className={`h-full ${confidence > 0.8 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${confPercent}%` }}></div>
          </div>
        </div>

        <div>
          <span className="font-mono text-xs text-text-muted tracking-wider uppercase mb-2 block">System Reason</span>
          <p className="font-sans text-sm text-gray-300 leading-relaxed border-l-2 border-outline pl-3">{reason}</p>
        </div>

        <div>
          <span className="font-mono text-xs text-text-muted tracking-wider uppercase mb-2 block">Source Text</span>
          <div className="bg-black/50 p-4 font-mono text-sm break-all rounded-sm border border-border-dark">
            {text}
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <span className="font-mono text-xs text-text-muted tracking-wider uppercase block">Actions</span>
          
          {status !== 'redacted' && (
            <button onClick={() => handleStatusChange('redacted')} className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 font-mono text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors">
              <Check className="w-4 h-4" /> Confirm Redaction
            </button>
          )}
          
          {status !== 'dismissed' && status !== 'false_positive' && (
            <button onClick={() => handleStatusChange('dismissed')} className="w-full flex items-center justify-center gap-2 border border-border-dark py-3 font-mono text-sm uppercase tracking-wider hover:bg-border-dark transition-colors">
              <X className="w-4 h-4" /> Ignore
            </button>
          )}

          {status !== 'flagged' && (
            <button onClick={() => handleStatusChange('flagged')} className="w-full flex items-center justify-center gap-2 border border-border-dark py-3 font-mono text-sm uppercase tracking-wider hover:bg-purple-900/30 transition-colors text-purple-400">
              <Flag className="w-4 h-4" /> Flag for Review
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionPanel;
