import { useReview } from '../../context/ReviewContext';
import { Undo2, ArrowRight } from 'lucide-react';

const SummaryBar = () => {
  const { state, dispatch } = useReview();
  const { activeDocId, detections, history } = state;
  const activeDetections = detections[activeDocId] || [];

  const missedCount = activeDetections.filter(d => d.status === 'missed').length;
  const fpCount = activeDetections.filter(d => d.status === 'false_positive').length;
  const redactedCount = activeDetections.filter(d => d.status === 'redacted').length;

  const canExport = missedCount === 0;

  return (
    <div className="h-16 bg-white border-b border-brand-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-6">
        <h2 className="font-mono text-sm font-semibold">legal_contract.pdf</h2>
        <div className="flex items-center gap-4 font-mono text-xs uppercase text-brand-gray">
          <span className={missedCount > 0 ? 'text-red-600 font-bold' : ''}>🔴 {missedCount} Missed</span>
          <span>🟡 {fpCount} Uncertain</span>
          <span>✅ {redactedCount} Accepted</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={history.length === 0}
          className="flex items-center gap-2 font-mono text-xs uppercase disabled:opacity-30 hover:text-redaction-primary transition-colors"
        >
          <Undo2 className="w-4 h-4" /> Undo
        </button>

        <button 
          disabled={!canExport}
          className={`flex items-center gap-2 px-6 py-2 font-mono text-xs uppercase tracking-wider transition-colors ${
            canExport 
              ? 'bg-brand-black text-white hover:bg-redaction-primary' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
          title={!canExport ? `Resolve ${missedCount} missed items first` : ''}
        >
          Confirm & Export <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SummaryBar;
