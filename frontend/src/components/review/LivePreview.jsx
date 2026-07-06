import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ExportDocViewer from '../export/ExportDocViewer';

const LivePreview = ({ activeDoc, detections, exportMode, searchQuery, onSearchQueryChange }) => {
  const [blob, setBlob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Use a stringified version of detections to avoid infinite loops from changing array references
  const detectionsStr = JSON.stringify(detections);

  useEffect(() => {
    if (!activeDoc) return;

    let isMounted = true;
    const fetchLivePreview = async () => {
      setIsLoading(true);
      try {
        const payloadDetections = [...detections];
        if (searchQuery && searchQuery.trim()) {
          payloadDetections.push({
            id: 'search_query_highlight',
            text: searchQuery,
            char_start: -1,
            char_end: -1,
            type: 'SEARCH_QUERY',
            confidence: 1,
            status: 'redacted',
            action_mode: 'highlight_red',
            reason: 'User Selection'
          });
        }

        const resp = await axios.post('http://localhost:8000/api/export', {
          doc_id: activeDoc.doc_id,
          filename: activeDoc.filename,
          detections: payloadDetections,
          content: activeDoc?.content || activeDoc?.plain_text || '',
          export_mode: exportMode || 'redact',
        }, { responseType: 'blob' });

        if (isMounted) {
          const fileType = activeDoc?.file_type?.toLowerCase() || (activeDoc?.filename || '').split('.').pop().toLowerCase();
          const mimeType = fileType === 'pdf' ? 'application/pdf' : resp.data.type || 'application/octet-stream';
          const newBlob = new Blob([resp.data], { type: mimeType });
          setBlob(newBlob);
        }
      } catch (err) {
        console.error('Live Preview failed:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(fetchLivePreview, 750); // Debounce by 750ms
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [activeDoc, detectionsStr, exportMode, searchQuery]);

  useEffect(() => {
    // Listen for text selection within the viewer to highlight on the left
    const handleMouseUp = () => {
      if (containerRef.current && containerRef.current.contains(document.activeElement || window.getSelection().anchorNode)) {
        const text = window.getSelection().toString().trim();
        if (text && text.length > 2 && onSearchQueryChange) {
          onSearchQueryChange(text);
        }
      }
    };
    
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [onSearchQueryChange]);

  return (
    <div className="w-full h-full flex flex-col relative" ref={containerRef}>
      <div className="bg-card-purple border-b-2 border-black px-4 py-2 flex items-center justify-between z-10 shrink-0 shadow-brutalist-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs uppercase tracking-wider text-white">Live Redacted Preview</span>
          {isLoading && <span className="flex h-2 w-2 relative ml-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>}
        </div>
        {searchQuery && (
          <span className="bg-white text-black font-mono text-[10px] px-2 py-0.5 rounded-full border border-black truncate max-w-[200px]">
            Selected: "{searchQuery}"
          </span>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative bg-white">
        {isLoading && !blob ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm z-20">
            <div className="w-10 h-10 border-4 border-black border-t-primary rounded-full animate-spin mb-4 shadow-[2px_2px_0px_0px_#000]"></div>
            <span className="font-mono font-bold text-xs uppercase tracking-widest text-black">Generating Preview...</span>
          </div>
        ) : null}

        {blob && (
          <div className={`w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            <ExportDocViewer blob={blob} fileType={activeDoc?.file_type} filename={activeDoc?.filename} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePreview;
