import { getStatusColors } from '../../utils/statusColors';
import { useReview } from '../../context/ReviewContext';

const HighlightSpan = ({ detection, onClick, isActive }) => {
  const { type, confidence, status, text } = detection;
  const colors = getStatusColors(status);
  
  return (
    <mark 
      onClick={(e) => {
        e.stopPropagation();
        onClick(detection);
      }}
      title={`${type} (${(confidence * 100).toFixed(0)}%)`}
      className={`relative px-1 mx-0.5 rounded-sm cursor-pointer border-b-2 font-mono text-sm ${colors} ${isActive ? 'ring-2 ring-brand-black z-10' : ''}`}
    >
      {status === 'redacted' ? `[${type}]` : text}
    </mark>
  );
};

export default HighlightSpan;
