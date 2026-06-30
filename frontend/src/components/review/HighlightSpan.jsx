import { useState, forwardRef } from 'react';

const HighlightSpan = forwardRef(({ detection, onClick, isActive }, ref) => {
  const { type, confidence, status, text, reason, source } = detection;
  const [isHovered, setIsHovered] = useState(false);

  const confPercent = (confidence * 100).toFixed(0);

  let baseStyles = '';
  let displayText = text;
  let statusLabel = '';
  let statusColor = '';

  if (status === 'redacted' || status === 'added') {
    baseStyles = 'detection-redacted bg-[#2d2640] text-violet-200 px-1.5 py-0.5 rounded font-mono text-[0.85em] border border-violet-400/30';
    displayText = `[${type}]`;
    statusLabel = 'REDACTED';
    statusColor = 'bg-emerald-500';
  } else if (status === 'missed') {
    baseStyles = 'detection-missed bg-red-50 text-red-700 border-b-2 border-red-400 px-0.5 rounded-sm';
    statusLabel = 'NEEDS REVIEW';
    statusColor = 'bg-red-500';
  } else if (status === 'false_positive') {
    baseStyles = 'detection-fp bg-amber-50 text-amber-700 border-b-2 border-dashed border-amber-400 px-0.5 rounded-sm';
    statusLabel = 'FALSE POSITIVE?';
    statusColor = 'bg-amber-500';
  } else if (status === 'flagged') {
    baseStyles = 'detection-flagged bg-purple-50 text-purple-700 border-b-2 border-dashed border-purple-400 px-0.5 rounded-sm';
    statusLabel = 'FLAGGED';
    statusColor = 'bg-purple-500';
  } else if (status === 'dismissed') {
    baseStyles = 'detection-dismissed text-gray-400 line-through px-0.5';
    statusLabel = 'DISMISSED';
    statusColor = 'bg-gray-400';
  } else {
    baseStyles = 'bg-gray-100 text-gray-600 border-b border-dashed border-gray-400 px-0.5 rounded-sm';
    statusLabel = (status || 'UNKNOWN').toUpperCase();
    statusColor = 'bg-gray-500';
  }

  const confColor = confidence >= 0.85 ? 'text-emerald-500' : confidence >= 0.5 ? 'text-amber-500' : 'text-red-500';
  const confBarColor = confidence >= 0.85 ? 'bg-emerald-400' : confidence >= 0.5 ? 'bg-amber-400' : 'bg-red-400';
  const sourceLabel = source === 'dual' ? 'Model + Heuristic' : source === 'heuristic' ? 'Heuristic' : source === 'manual' ? 'Manual' : 'NLP Model';

  return (
    <span
      ref={ref}
      className="tooltip-container inline relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        onClick={(e) => { e.stopPropagation(); onClick(detection); }}
        className={`relative cursor-pointer detection-span ${baseStyles} ${isActive ? 'ring-2 ring-violet-500 ring-offset-1 z-10 detection-active' : ''}`}
      >
        {displayText}
      </span>

      {/* Hover Tooltip — glassmorphism style */}
      {isHovered && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-scale-in" style={{opacity: 1}}>
          <span className="block bg-white/95 backdrop-blur-xl text-[#1a1a1a] rounded-xl shadow-2xl border border-gray-200/80 p-3.5 min-w-[240px] max-w-[320px]">
            {/* Header */}
            <span className="flex items-center justify-between mb-2.5">
              <span className="text-[9px] font-bold tracking-wider uppercase bg-violet-100 text-violet-700 px-2 py-0.5 rounded">{type}</span>
              <span className={`text-[8px] font-bold tracking-wider uppercase text-white px-2 py-0.5 rounded ${statusColor}`}>{statusLabel}</span>
            </span>

            {/* Original text for redacted */}
            {(status === 'redacted' || status === 'added') && (
              <span className="block text-[11px] text-gray-500 bg-gray-50 px-2.5 py-2 rounded-lg mb-2.5 font-mono break-all border border-gray-100">
                &quot;{text}&quot;
              </span>
            )}

            {/* Confidence */}
            <span className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-gray-400">Confidence</span>
              <span className={`font-bold font-mono ${confColor}`}>{confPercent}%</span>
            </span>
            <span className="block w-full h-1.5 bg-gray-100 rounded-full mb-2.5 overflow-hidden">
              <span className={`block h-full rounded-full transition-all duration-500 ${confBarColor}`} style={{width: `${confPercent}%`}}></span>
            </span>

            {/* Source */}
            <span className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[9px] text-gray-400">Detected by:</span>
              <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100">{sourceLabel}</span>
            </span>

            {/* Reason */}
            <span className="block text-[11px] text-gray-500 leading-relaxed whitespace-normal">{reason}</span>
          </span>
          <span className="block w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></span>
        </span>
      )}
    </span>
  );
});

HighlightSpan.displayName = 'HighlightSpan';

export default HighlightSpan;
