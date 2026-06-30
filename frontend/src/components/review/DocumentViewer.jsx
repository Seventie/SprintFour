import { useState } from 'react';
import { useReview } from '../../context/ReviewContext';
import HighlightSpan from './HighlightSpan';

const DocumentViewer = ({ setActiveDetection, activeDetection }) => {
  const { state } = useReview();
  const { activeDocId, detections } = state;
  const activeDetections = detections[activeDocId] || [];
  
  // Mock plain text for demo
  const plainText = "Arjun Sharma sent an email to arjun.s@law.in regarding the contract. Call him at 9876543210 for details.";
  
  // Simple renderer (for hackathon: splits text based on detections)
  const renderText = () => {
    let lastIndex = 0;
    const elements = [];
    
    const sorted = [...activeDetections].sort((a, b) => a.char_start - b.char_start);
    
    sorted.forEach((det, idx) => {
      if (det.char_start > lastIndex) {
        elements.push(<span key={`text-${idx}`}>{plainText.substring(lastIndex, det.char_start)}</span>);
      }
      
      elements.push(
        <HighlightSpan 
          key={det.id} 
          detection={det} 
          isActive={activeDetection?.id === det.id}
          onClick={setActiveDetection}
        />
      );
      lastIndex = det.char_end;
    });
    
    if (lastIndex < plainText.length) {
      elements.push(<span key={`text-end`}>{plainText.substring(lastIndex)}</span>);
    }
    
    return elements;
  };

  return (
    <div className="flex-1 bg-surface-bright overflow-y-auto p-8 font-sans text-brand-black leading-relaxed" onClick={() => setActiveDetection(null)}>
      <div className="max-w-3xl mx-auto bg-white p-12 shadow-sm border border-brand-border/50 min-h-[800px]">
        {renderText()}
      </div>
    </div>
  );
};

export default DocumentViewer;
