import { useState, forwardRef } from 'react';

const HighlightSpan = forwardRef(({ detection, onClick, isActive }, ref) => {
  const { type, confidence, status, text, reason, source } = detection;
  const [isHovered, setIsHovered] = useState(false);

  const confPercent = (confidence * 100).toFixed(0);

  let baseStyles = '';
  let displayText = text;
  let statusLabel = '';
  let statusColor = '';

  const ANONYMIZED_REPLACEMENTS = {
    "PERSON": "[John Doe]",
    "EMAIL_ADDRESS": "[user@domain.com]",
    "PHONE_NUMBER": "[555-0199]",
    "CREDIT_CARD": "[XXXX-XXXX-XXXX-1234]",
    "DATE_TIME": "[2026-01-01]",
    "IP_ADDRESS": "[192.0.2.1]",
    "LOCATION": "[City, Country]",
    "NRP": "[Protected Group]",
    "MEDICAL_LICENSE": "[MD-999999]",
    "URL": "[https://secure-domain.com]",
    "US_SSN": "[XXX-XX-0000]",
    "US_DRIVER_LICENSE": "[DL-XXXXX]",
  };

  if (status === 'redacted' || status === 'added') {
    const isAnon = detection.action_mode === 'anonymize';
    baseStyles = isAnon
      ? 'detection-redacted bg-card-purple text-black px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-black shadow-[1px_1px_0px_0px_#000]'
      : 'detection-redacted bg-black text-secondary px-1.5 py-0.5 rounded font-mono font-bold text-xs border border-black shadow-[1px_1px_0px_0px_#000]';
    displayText = detection.custom_replacement || (isAnon ? (ANONYMIZED_REPLACEMENTS[type] || `[Anonymized ${type}]`) : `[REDACTED ${type}]`);
    statusLabel = isAnon ? 'ANONYMIZED' : 'REDACTED';
    statusColor = 'bg-emerald-500';
  } else if (status === 'missed') {
    baseStyles = 'detection-missed bg-red-200 text-red-900 border-b-2 border-red-600 font-bold px-1 rounded-sm';
    statusLabel = 'NEEDS REVIEW';
    statusColor = 'bg-red-500';
  } else if (status === 'false_positive') {
    baseStyles = 'detection-fp bg-amber-200 text-amber-900 border-b-2 border-dashed border-amber-600 font-bold px-1 rounded-sm';
    statusLabel = 'FALSE POSITIVE?';
    statusColor = 'bg-amber-500';
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

      {/* Hover Tooltip — Cyber-Brutalism style */}
      {isHovered && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none animate-scale-in">
          <span className="block bg-white text-black rounded-2xl shadow-brutalist border-2 border-black p-3.5 min-w-[250px] max-w-[320px]">
            {/* Header */}
            <span className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold uppercase bg-primary text-white px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000]">{type}</span>
              <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border border-black shadow-[1px_1px_0px_0px_#000] ${status === 'redacted' || status === 'added' ? 'bg-secondary text-black' : 'bg-red-500 text-white'}`}>{statusLabel}</span>
            </span>

            {/* Original text for redacted */}
            {(status === 'redacted' || status === 'added') && (
              <span className="block text-[11px] text-black bg-card-yellow px-2.5 py-1.5 rounded-xl mb-2 font-mono font-bold break-all border border-black shadow-brutalist-xs">
                &quot;{text}&quot;
              </span>
            )}

            {/* Confidence */}
            <span className="flex items-center justify-between text-xs mb-1 font-bold">
              <span className="text-gray-600">AI Confidence</span>
              <span className="font-mono">{confPercent}%</span>
            </span>
            <span className="block w-full h-2 bg-gray-100 rounded-full mb-2.5 overflow-hidden border border-black">
              <span className={`block h-full rounded-full transition-all duration-500 ${confidence >= 0.85 ? 'bg-secondary' : 'bg-primary'}`} style={{width: `${confPercent}%`}}></span>
            </span>

            {/* Reason */}
            <span className="block text-[11px] font-bold text-gray-800 leading-snug whitespace-normal bg-aura-cream p-2 rounded-xl border border-black">{reason}</span>
          </span>
          <span className="block w-0 h-0 mx-auto border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black"></span>
        </span>
      )}
    </span>
  );
});

HighlightSpan.displayName = 'HighlightSpan';

export default HighlightSpan;
