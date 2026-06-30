
const HighlightSpan = ({ detection, onClick, isActive }) => {
  const { type, confidence, status, text } = detection;
  
  let styles = "";
  let displayText = text;

  if (status === 'redacted' || status === 'added') {
    styles = "bg-black text-white px-2 py-0.5 rounded font-mono text-sm inline-block";
    displayText = `[${type}]`;
  } else if (status === 'missed') {
    styles = "interactive-hover cursor-caret border-b-2 border-dashed border-[#f9362c] hover:border-black text-[#f9362c] transition-colors bg-[#f9362c]/10 px-1 rounded-sm";
  } else if (status === 'false_positive') {
    styles = "interactive-hover cursor-caret border-b border-dashed border-amber-400 hover:border-black text-amber-600 transition-colors";
  } else {
    styles = "interactive-hover cursor-caret border-b border-dashed border-gray-400 hover:border-black text-black transition-colors";
  }

  return (
    <span 
      onClick={(e) => {
        e.stopPropagation();
        onClick(detection);
      }}
      title={`${type} (${(confidence * 100).toFixed(0)}%)`}
      className={`relative mx-0.5 cursor-pointer ${styles} ${isActive ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : ''}`}
    >
      {displayText}
    </span>
  );
};

export default HighlightSpan;
