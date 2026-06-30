import { useState } from 'react';
import { ReviewProvider, useReview } from '../context/ReviewContext';
import HighlightSpan from '../components/review/HighlightSpan';
import axios from 'axios';

const ReviewWorkspace = () => {
  const { state, dispatch } = useReview();
  const [activeDetection, setActiveDetection] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { activeDocId, documents, detections, sidebarOpen } = state;
  const activeDoc = documents.find(d => d.doc_id === activeDocId) || documents[0];
  const activeDetections = detections[activeDocId] || [];

  const missedCount = activeDetections.filter(d => d.status === 'missed').length;
  const redactedCount = activeDetections.filter(d => d.status === 'redacted').length;
  const totalDetections = activeDetections.length;
  
  // Progress calculation
  const progressPercent = totalDetections > 0 ? Math.round(((totalDetections - missedCount) / totalDetections) * 100) : 100;
  
  // Derived threat level based on missed PII
  const threatLevel = missedCount > 0 ? 'Elevated' : 'Secured';
  
  const handleExport = async () => {
    if (missedCount > 0 || isExporting) return;
    
    setIsExporting(true);
    
    try {
      const response = await axios.post(`http://localhost:8000/api/export/${activeDocId}`, {
        format: 'txt',
        confirmed_detections: activeDetections.filter(d => d.status === 'redacted' || d.status === 'added')
      }, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `redacted_${activeDoc?.filename || 'document.txt'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export document. Make sure the backend is running.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = (status) => {
    if (!activeDetection) return;
    dispatch({ 
      type: 'UPDATE_DETECTION_STATUS', 
      payload: { docId: activeDocId, detectionId: activeDetection.id, status } 
    });
    setActiveDetection(null);
  };

  // Document Viewer Text Rendering Logic
  const plainText = activeDoc?.content || "No document loaded.";
  
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
    <div className="h-screen overflow-hidden flex">
      {/* LEFT PANE: Light Mode Surface (Input/System) */}
      <div className="pane-left w-1/2 h-full flex flex-row bg-white text-black border-r border-gray-200 relative z-10 transition-colors duration-300">
        
        {/* SideNavBar */}
        <nav 
          className={`bg-white text-black border-r border-gray-200 flex flex-col h-full overflow-y-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-20 shrink-0 ${sidebarOpen ? 'w-[280px]' : 'w-[80px]'}`}
          id="sidebar"
        >
          {/* Header */}
          <div className="p-6 flex items-center gap-4 border-b border-gray-200 h-16 shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#121212] shrink-0"></div>
            {sidebarOpen && (
              <div className="flex-1 overflow-hidden whitespace-nowrap animate-fade-in-up">
                <h1 className="font-bold text-black tracking-tighter text-lg">P2 REDACTOR</h1>
              </div>
            )}
            <button 
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
              className="interactive-hover p-2 hover:bg-gray-100 rounded transition-colors duration-300 shrink-0 text-black ml-auto"
            >
              <span className="material-symbols-outlined text-[20px]">{sidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>
          </div>
          
          {/* CTA */}
          <div className="p-6 pb-0">
            <button className="interactive-hover w-full bg-black text-white py-3 rounded-full font-mono text-xs hover:bg-gray-800 transition-all duration-300 uppercase flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">add</span>
              {sidebarOpen && <span>New Analysis</span>}
            </button>
          </div>
          
          {/* File List */}
          <div className="px-4 mt-6 mb-2">
            <h3 className={`text-xs font-bold text-gray-400 tracking-widest uppercase font-mono ${sidebarOpen ? '' : 'text-center'}`}>
              {sidebarOpen ? 'WORKSPACE FILES' : 'FILES'}
            </h3>
          </div>
          <ul className="flex-1 py-2 overflow-y-auto space-y-1 px-2">
            {documents.map((doc) => {
              const docDets = detections[doc.doc_id] || [];
              const missed = docDets.filter(d => d.status === 'missed').length;
              
              return (
                <li key={doc.doc_id}>
                  <button 
                    onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
                    className={`interactive-hover w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-300 text-left ${activeDocId === doc.doc_id ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <span className="material-symbols-outlined shrink-0 text-[20px]">{doc.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}</span>
                    {sidebarOpen && (
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="truncate font-medium text-sm">{doc.filename}</div>
                        <div className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${activeDocId === doc.doc_id ? (missed > 0 ? 'text-red-400' : 'text-green-400') : (missed > 0 ? 'text-red-500' : 'text-green-600')}`}>
                          {missed > 0 ? `${missed} PENDING` : 'SECURED'}
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Document Viewer (Main Content Left) */}
        <main 
          className="flex-1 flex flex-col h-full bg-white transition-all duration-300 min-w-0" 
          id="main-content-left"
          onClick={() => activeDetection && setActiveDetection(null)}
        >
          {/* Header for Viewer */}
          <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs text-gray-500 uppercase">FILE: {activeDoc?.filename || 'UNKNOWN.TXT'}</span>
            </div>
            <div className="flex items-center gap-2 border border-gray-200 p-1 rounded-full">
              <button className="interactive-hover p-1 text-gray-500 hover:text-black transition-colors">
                <span className="material-symbols-outlined text-[18px]">remove</span>
              </button>
              <span className="font-mono text-xs px-2 text-gray-500">120%</span>
              <button className="interactive-hover p-1 text-gray-500 hover:text-black transition-colors">
                <span className="material-symbols-outlined text-[18px]">add</span>
              </button>
            </div>
          </header>
          
          {/* Document Canvas */}
          <div className="flex-1 overflow-auto p-8 bg-gray-50 flex justify-center items-start pt-12">
            <div className="w-[700px] bg-white border border-gray-200 shadow-2xl p-16 relative">
              <div className="absolute top-8 right-8 border border-gray-200 text-gray-500 font-mono text-[10px] px-3 py-1 uppercase rounded-full">Confidential</div>
              <h2 className="text-2xl font-bold mb-10 text-black tracking-tight">DOCUMENT 01</h2>
              <div className="space-y-6 font-sans text-lg text-gray-600 leading-relaxed">
                {renderText()}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* RIGHT PANE: Dark Mode Surface (Output/Results) */}
      <div className="pane-right w-1/2 h-full bg-[#111111] text-white flex flex-col z-0">
        
        {/* TopAppBar */}
        <header className="bg-transparent text-white flex justify-between items-center w-full px-8 h-16 shrink-0 mt-4">
          <div className="flex items-center gap-6">
            <nav className="flex gap-6">
              <a href="#" className="interactive-hover text-white font-semibold text-sm transition-all duration-200">Viewer</a>
              <a href="#" className="interactive-hover text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200">Compare</a>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="h-6 w-[1px] bg-[#2C2C2E]"></div>
            <button 
              onClick={handleExport}
              disabled={missedCount > 0 || isExporting}
              className="interactive-hover bg-white text-black px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? 'Exporting...' : 'Execute Redaction'}
            </button>
          </div>
        </header>
        
        {/* Analytics Hub Content */}
        <div className="flex-1 p-12 overflow-y-auto flex flex-col justify-center max-w-2xl mx-auto w-full">
          
          {/* Default Analytics View */}
          {!activeDetection ? (
            <>
              <div className="mb-12 text-center animate-fade-in-up">
                <h2 className="text-[3rem] font-bold mb-4 text-white tracking-tighter leading-none">ANALYSIS<br/>OVERVIEW</h2>
                <p className="text-lg text-gray-400">Real-time scan metrics for {activeDoc?.filename}</p>
              </div>
              
              <div className="space-y-8 animate-fade-in-up delay-100 w-full">
                {/* Progress */}
                <div className="bg-black rounded-2xl p-8 flex flex-col justify-between border border-[#2C2C2E]">
                  <div className="flex justify-between items-end mb-4">
                    <div className="text-sm text-gray-400 font-medium">Redaction Progress</div>
                    <div className="text-4xl font-bold text-white tracking-tight">{progressPercent}%</div>
                  </div>
                  <div className="w-full h-2 bg-[#2C2C2E] rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-8">
                  {/* Stat Card 2 */}
                  <div className="bg-black rounded-2xl p-8 flex flex-col justify-between border border-[#2C2C2E]">
                    <div className="text-sm text-gray-400 font-medium mb-4">Entities Detected</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-4xl font-bold text-white tracking-tight">{totalDetections}</div>
                      {missedCount > 0 && <div className="text-sm font-semibold text-red-500">{missedCount} missed</div>}
                    </div>
                  </div>
                  
                  {/* Stat Card 3 */}
                  <div className="bg-black rounded-2xl p-8 border border-[#2C2C2E]">
                    <div className="flex justify-between items-center mb-6">
                      <div className="text-sm text-gray-400 font-medium">Threat Level</div>
                      <div className={`text-[10px] font-bold px-3 py-1 uppercase rounded-full tracking-wider ${threatLevel === 'Elevated' ? 'bg-[#f9362c] text-white' : 'bg-white text-black'}`}>
                        {threatLevel}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">PII Exposure Risk</span>
                        <span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded">HIGH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Inspection View (When a highlight is clicked) */
            <div className="animate-fade-in-up w-full">
              <div className="mb-8">
                <button 
                  onClick={() => setActiveDetection(null)}
                  className="interactive-hover text-sm text-gray-400 hover:text-white flex items-center gap-2 mb-8 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Back to Overview
                </button>
                <h2 className="text-[2.5rem] font-bold mb-2 text-white tracking-tighter leading-none">INSPECTION</h2>
                <p className="text-sm text-gray-400 uppercase tracking-widest font-mono">Entity ID: {activeDetection.id}</p>
              </div>

              <div className="bg-black rounded-2xl p-8 border border-[#2C2C2E] space-y-6">
                <div>
                  <div className="text-xs text-gray-500 font-mono uppercase mb-2">Detected String</div>
                  <div className="text-xl font-medium text-white bg-[#1a1a1a] p-4 rounded-lg border border-[#2C2C2E]">
                    "{activeDetection.text}"
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-gray-500 font-mono uppercase mb-2">Classification</div>
                    <div className="text-sm font-bold text-white px-3 py-1 bg-[#2C2C2E] inline-block rounded">
                      {activeDetection.type}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 font-mono uppercase mb-2">Confidence</div>
                    <div className="text-sm font-bold text-white">
                      {(activeDetection.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 font-mono uppercase mb-2">Reasoning</div>
                  <div className="text-sm text-gray-300">
                    {activeDetection.reason}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#2C2C2E] flex gap-4">
                  {activeDetection.status === 'missed' && (
                    <>
                      <button 
                        onClick={() => handleAction('redacted')}
                        className="interactive-hover flex-1 bg-white text-black py-3 rounded-full font-semibold text-sm hover:bg-gray-200 transition-colors"
                      >
                        Accept Redaction
                      </button>
                      <button 
                        onClick={() => handleAction('dismissed')}
                        className="interactive-hover flex-1 bg-transparent text-white border border-[#2C2C2E] py-3 rounded-full font-semibold text-sm hover:bg-[#1a1a1a] transition-colors"
                      >
                        Not PII
                      </button>
                    </>
                  )}
                  
                  {activeDetection.status === 'redacted' && (
                    <button 
                      onClick={() => handleAction('missed')}
                      className="interactive-hover w-full bg-transparent text-white border border-[#2C2C2E] py-3 rounded-full font-semibold text-sm hover:bg-[#1a1a1a] transition-colors"
                    >
                      Undo Redaction
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const Review = () => {
  return (
    <ReviewProvider>
      <ReviewWorkspace />
    </ReviewProvider>
  );
};

export default Review;
