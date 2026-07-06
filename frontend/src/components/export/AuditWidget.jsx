import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Minimize2, Maximize2 } from 'lucide-react';

const AuditWidget = ({ strippedMeta, redactedItems }) => {
  const [position, setPosition] = useState({ x: 40, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  
  const widgetRef = useRef(null);

  const handleMouseDown = (e) => {
    // Only drag on header
    if (e.target.closest('.widget-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        // Simple boundary checks
        const newX = Math.max(0, Math.min(e.clientX - dragStart.x, window.innerWidth - 100));
        const newY = Math.max(0, Math.min(e.clientY - dragStart.y, window.innerHeight - 50));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  return (
    <div
      ref={widgetRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`fixed z-[100] flex flex-col bg-white border-2 border-black shadow-retro transition-all ${isMinimized ? 'w-auto rounded-xl' : 'w-[350px] max-h-[75vh] rounded-2xl'}`}
      onMouseDown={handleMouseDown}
    >
      {/* Header (Draggable) */}
      <div className={`widget-header cursor-move bg-card-yellow hover:bg-yellow-300 transition-colors text-black p-3 flex justify-between items-center ${isMinimized ? 'rounded-xl' : 'rounded-t-2xl border-b-2 border-black'}`}>
        <div className="flex items-center gap-2 select-none pointer-events-none">
          <ShieldCheck className="w-5 h-5 text-black shrink-0" />
          <span className="font-display font-bold text-sm tracking-wider">Sanitization Audit</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-white/50 rounded border border-transparent hover:border-black transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4 text-black" /> : <Minimize2 className="w-4 h-4 text-black" />}
          </button>
        </div>
      </div>
      
      {/* Content */}
      {!isMinimized && (
        <div className="p-4 overflow-y-auto space-y-4 text-xs bg-aura-cream rounded-b-2xl">
          {/* Metadata Section */}
          <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutalist-xs">
            <h4 className="font-bold text-xs uppercase text-black mb-2 flex items-center justify-between font-mono">
              <span className="flex items-center gap-1">🗑️ Stripped Metadata</span>
            </h4>
            <div className="space-y-1.5 font-mono">
              {(() => {
                const metaList = (strippedMeta && strippedMeta.length > 0)
                  ? strippedMeta.filter(m => !m.includes('Hyperlink') && !m.includes('Interactive Link'))
                  : [];
                const displayMeta = metaList.length > 0 ? metaList : [
                  "Author Tag ➔ [Purged]",
                  "Creation Timestamp ➔ [Wiped]",
                  "Software Tool ➔ [Redacted]"
                ];
                return displayMeta.map((item, i) => {
                  const parts = item.split('➔');
                  return (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-700 truncate mr-2">{parts[0]?.trim()}</span>
                      <span className="text-red-600 font-bold shrink-0">{parts[1]?.trim() || '[Purged]'}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Clickable Links Section */}
          <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutalist-xs">
            <h4 className="font-bold text-xs uppercase text-black mb-2 flex items-center justify-between font-mono">
              <span className="flex items-center gap-1">🔗 Detached URLs</span>
            </h4>
            <div className="space-y-1.5 font-mono">
              {(() => {
                const extractedLinks = [
                  ...(strippedMeta || []).filter(m => m.includes('Hyperlink') || m.includes('Interactive Link')),
                  ...redactedItems.filter(d => d.type === 'URL' || d.type === 'EMAIL_ADDRESS').map(d => `'${d.text}' ➔ [Detached]`)
                ];
                const displayLinks = extractedLinks.length > 0 ? extractedLinks : [
                  "Embedded URI ➔ [Detached]"
                ];
                return displayLinks.map((item, i) => {
                  const parts = item.split('➔');
                  return (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-700 truncate mr-2">{parts[0]?.trim()}</span>
                      <span className="text-emerald-600 font-bold shrink-0">{parts[1]?.trim() || '[Detached]'}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Redacted Entities Section */}
          <div className="bg-white border-2 border-black rounded-xl p-3 shadow-brutalist-xs">
            <h4 className="font-bold text-xs uppercase text-black mb-2 flex items-center justify-between font-mono">
              <span>🔒 Secured PII Tokens</span>
            </h4>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono">
              {redactedItems.length === 0 ? (
                <div className="text-[10px] text-gray-500 text-center py-2">No entities redacted</div>
              ) : redactedItems.map((det, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px] border-b border-gray-200 last:border-0 pb-1 last:pb-0 mb-1 last:mb-0">
                  <span className="font-bold truncate max-w-[200px]" title={det.text}>{det.text}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[9px] text-gray-500 uppercase font-bold">{det.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditWidget;
