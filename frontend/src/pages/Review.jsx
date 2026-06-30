import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReview } from '../context/ReviewContext';
import HighlightSpan from '../components/review/HighlightSpan';
import axios from 'axios';

const Review = () => {
  const { state, dispatch } = useReview();
  const navigate = useNavigate();
  const [activeDetection, setActiveDetection] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [undoToast, setUndoToast] = useState(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [rapidCount, setRapidCount] = useState(0);
  const [showFatigueGuard, setShowFatigueGuard] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(0);
  const viewerRef = useRef(null);
  const detectionRefs = useRef({});

  const { activeDocId, documents, detections, sidebarOpen, history } = state;

  useEffect(() => {
    if (documents.length === 0) navigate('/upload');
  }, [documents, navigate]);

  const activeDoc = documents.find(d => d.doc_id === activeDocId) || documents[0];
  const activeDetections = activeDocId ? (detections[activeDocId] || []) : [];

  const missedCount = activeDetections.filter(d => d.status === 'missed').length;
  const redactedCount = activeDetections.filter(d => d.status === 'redacted' || d.status === 'added').length;
  const fpCount = activeDetections.filter(d => d.status === 'false_positive').length;
  const dismissedCount = activeDetections.filter(d => d.status === 'dismissed').length;
  const totalDetections = activeDetections.length;
  const reviewedCount = totalDetections - missedCount - fpCount;
  const progressPercent = totalDetections > 0 ? Math.round(((totalDetections - missedCount) / totalDetections) * 100) : 100;

  // Problem 3: items needing attention — sorted by severity
  const attentionItems = activeDetections
    .filter(d => d.status === 'missed' || d.status === 'false_positive')
    .sort((a, b) => {
      // Missed first (dangerous), then false_positive
      if (a.status === 'missed' && b.status !== 'missed') return -1;
      if (a.status !== 'missed' && b.status === 'missed') return 1;
      // Within missed: HIGH confidence first (tool was sure but wrong = most dangerous)
      if (a.status === 'missed' && b.status === 'missed') return b.confidence - a.confidence;
      // Within false_positive: LOW confidence first (most likely actually false)
      return a.confidence - b.confidence;
    });

  // Type stats
  const typeStats = {};
  activeDetections.forEach(d => {
    if (!typeStats[d.type]) typeStats[d.type] = { total: 0, redacted: 0, missed: 0 };
    typeStats[d.type].total++;
    if (d.status === 'redacted' || d.status === 'added') typeStats[d.type].redacted++;
    if (d.status === 'missed') typeStats[d.type].missed++;
  });

  // Risk level badge colors
  const riskColors = {
    high: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    low: { bg: 'bg-sky-50 border-sky-200', text: 'text-sky-700', dot: 'bg-sky-500' },
    none: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    unknown: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', dot: 'bg-gray-500' },
  };

  // --- Auto-scroll to detection in document ---
  const scrollToDetection = useCallback((detId) => {
    const el = detectionRefs.current[detId];
    if (el && viewerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // --- Undo handler (defined BEFORE useEffect that references it) ---
  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' });
    setUndoToast(null);
  }, [dispatch]);

  // --- Click-to-explain: ANY word in the document ---
  const handleWordClick = async (word, charStart, charEnd) => {
    setActiveDetection(null);
    setExplanation(null);
    setIsExplaining(true);

    try {
      const resp = await axios.post('http://localhost:8000/api/explain', {
        doc_id: activeDocId,
        selected_text: word,
        char_start: charStart,
        char_end: charEnd,
        content: activeDoc?.content || activeDoc?.plain_text || '',
        detections: activeDetections,
      });
      setExplanation(resp.data);
      if (resp.data.is_detection && resp.data.detection) {
        setActiveDetection(resp.data.detection);
      }
    } catch (err) {
      setExplanation({
        selected_text: word,
        is_detection: false,
        explanation: 'Could not reach the explanation service. Make sure the backend is running.',
        risk_level: 'unknown',
        source: 'error',
      });
    } finally {
      setIsExplaining(false);
    }
  };

  // Click on a HighlightSpan detection
  const handleDetectionClick = useCallback((det) => {
    setActiveDetection(det);
    setExplanation({
      selected_text: det.text,
      is_detection: true,
      detection: det,
      explanation: det.reason,
      risk_level: det.confidence >= 0.85 ? 'high' : det.confidence >= 0.5 ? 'medium' : 'low',
      source: det.source || 'model',
    });
    scrollToDetection(det.id);
  }, [scrollToDetection]);

  // --- Problem 3: Fatigue guard for rapid accepts ---
  const checkFatigueGuard = useCallback(() => {
    const now = Date.now();
    const timeSinceLast = now - lastActionTime;
    // If user has done 6+ actions in rapid succession (< 1.5s each), show guard
    if (timeSinceLast < 1500 && rapidCount >= 5) {
      setShowFatigueGuard(true);
      setRapidCount(0);
      return true;
    }
    if (timeSinceLast < 1500) {
      setRapidCount(prev => prev + 1);
    } else {
      setRapidCount(1);
    }
    setLastActionTime(now);
    return false;
  }, [lastActionTime, rapidCount]);

  const handleAction = useCallback((status) => {
    if (!activeDetection) return;
    // Fatigue guard check
    if (checkFatigueGuard()) return;

    axios.patch(`http://localhost:8000/api/detection/${activeDetection.id}`, {
      status,
      doc_id: activeDocId,
      detection: activeDetection,
    }).catch(() => {});
    dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: activeDetection.id, status } });
    setUndoToast({ text: `"${activeDetection.text}" → ${status}` });
    setTimeout(() => setUndoToast(null), 5000);
    setActiveDetection(null);
    setExplanation(null);
  }, [activeDetection, activeDocId, checkFatigueGuard, dispatch]);

  // Navigate to next unreviewed item
  const goToNextItem = useCallback(() => {
    if (attentionItems.length === 0) return;
    const idx = reviewIdx % attentionItems.length;
    const item = attentionItems[idx];
    handleDetectionClick(item);
    setReviewIdx(idx + 1);
  }, [attentionItems, reviewIdx, handleDetectionClick]);

  // Keyboard shortcuts — Problem 3: let Sam work fast
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Enter' && activeDetection && (activeDetection.status === 'missed' || activeDetection.status === 'false_positive')) {
        e.preventDefault();
        handleAction('redacted');
        setTimeout(() => goToNextItem(), 100);
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && activeDetection && (activeDetection.status === 'missed' || activeDetection.status === 'false_positive')) {
        e.preventDefault();
        handleAction('dismissed');
        setTimeout(() => goToNextItem(), 100);
      }
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        goToNextItem();
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDetection, goToNextItem, handleAction, handleUndo]);

  const handleBulkAccept = (threshold) => {
    dispatch({ type: 'BULK_ACCEPT', payload: { docId: activeDocId, threshold } });
    setShowBulkModal(false);
  };

  const handleExport = () => {
    if (missedCount > 0) return;
    navigate('/export');
  };

  // Manual text selection → mark as PII
  const handleMarkSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !activeDoc) return;
    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 2) return;
    const content = activeDoc.content || '';
    const charStart = content.indexOf(selectedText);
    if (charStart === -1) return;

    const newDet = {
      id: `det_manual_${Date.now()}`,
      text: selectedText,
      char_start: charStart,
      char_end: charStart + selectedText.length,
      type: 'CUSTOM',
      confidence: 1.0,
      status: 'redacted',
      reason: 'Manually marked as PII by reviewer',
      source: 'manual',
    };
    dispatch({ type: 'ADD_DETECTION', payload: { docId: activeDocId, detection: newDet } });
    axios.post(`http://localhost:8000/api/detection/${activeDocId}`, {
      text: selectedText, char_start: charStart, char_end: charStart + selectedText.length,
      type: 'CUSTOM', reason: 'Manually marked as PII by reviewer',
    }).catch(() => {});
    selection.removeAllRanges();
  };

  // --- Word-level text rendering ---
  const plainText = activeDoc?.content || '';

  const renderText = () => {
    const sorted = [...activeDetections].sort((a, b) => a.char_start - b.char_start);
    let lastIndex = 0;
    const elements = [];

    sorted.forEach((det, idx) => {
      if (det.char_start > lastIndex) {
        const segment = plainText.substring(lastIndex, det.char_start);
        elements.push(...renderPlainSegment(segment, lastIndex, `seg-${idx}`));
      }
      elements.push(
        <HighlightSpan
          key={det.id}
          detection={det}
          isActive={activeDetection?.id === det.id}
          onClick={handleDetectionClick}
          ref={(el) => { detectionRefs.current[det.id] = el; }}
        />
      );
      lastIndex = det.char_end;
    });

    if (lastIndex < plainText.length) {
      const segment = plainText.substring(lastIndex);
      elements.push(...renderPlainSegment(segment, lastIndex, 'seg-end'));
    }
    return elements;
  };

  const renderPlainSegment = (segment, baseOffset, keyPrefix) => {
    const parts = segment.split(/(\s+)/);
    const elements = [];
    let offset = baseOffset;

    parts.forEach((part, i) => {
      if (/^\s+$/.test(part)) {
        elements.push(<span key={`${keyPrefix}-ws-${i}`}>{part}</span>);
      } else if (part.length > 0) {
        const wordStart = offset;
        const wordEnd = offset + part.length;
        elements.push(
          <span
            key={`${keyPrefix}-w-${i}`}
            className="word-span"
            onClick={(e) => {
              e.stopPropagation();
              handleWordClick(part, wordStart, wordEnd);
            }}
            title="Click to inspect"
          >
            {part}
          </span>
        );
      }
      offset += part.length;
    });
    return elements;
  };

  if (documents.length === 0) return null;

  return (
    <div className="h-screen overflow-hidden flex bg-[#f5f5f7]">

      {/* LEFT: Sidebar */}
      <nav className={`bg-white border-r border-gray-200 flex flex-col h-full transition-all duration-300 shrink-0 z-20 pane-left ${sidebarOpen ? 'w-[240px]' : 'w-[64px]'}`}>
        <div className="p-4 flex items-center gap-3 border-b border-gray-100 h-14 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shrink-0 flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-white text-[13px]">shield</span>
          </div>
          {sidebarOpen && <h1 className="font-bold text-[#1a1a1a] tracking-tight text-[15px]">Conseal</h1>}
          <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-auto shrink-0">
            <span className="material-symbols-outlined text-gray-400 text-[16px]">{sidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
        </div>

        <div className="p-3">
          <button onClick={() => { dispatch({ type: 'CLEAR_SESSION' }); navigate('/upload'); }} className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2 rounded-xl font-medium text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <span className="material-symbols-outlined text-[14px]">add</span>
            {sidebarOpen && <span>New Analysis</span>}
          </button>
        </div>

        {sidebarOpen && <div className="px-4 mt-2 mb-1"><span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase font-mono">FILES</span></div>}
        <ul className="flex-1 py-1 overflow-y-auto px-2 space-y-0.5">
          {documents.map((doc) => {
            const docDets = detections[doc.doc_id] || [];
            const missed = docDets.filter(d => d.status === 'missed').length;
            return (
              <li key={doc.doc_id}>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-left ${activeDocId === doc.doc_id ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  <span className="material-symbols-outlined shrink-0 text-[16px]">
                    {doc.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-xs">{doc.filename}</div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${missed > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {missed > 0 ? `${missed} pending` : '✓ secured'}
                      </div>
                    </div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* CENTER: Document Viewer */}
      <main className="flex-[1.7] h-full flex flex-col min-w-0 bg-white border-r border-gray-200">
        {/* Viewer Header */}
        <header className="h-12 border-b border-gray-100 flex items-center justify-between px-5 shrink-0 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-gray-400 uppercase tracking-wider">{activeDoc?.filename}</span>
            <span className="text-[9px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded uppercase">{activeDoc?.file_type}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Review progress indicator */}
            <span className="text-[10px] font-mono text-gray-400">
              {reviewedCount}/{totalDetections} reviewed
            </span>
            <button onClick={handleMarkSelection} className="text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 font-medium border border-gray-200">
              <span className="material-symbols-outlined text-[13px]">add_circle</span>
              Mark Selection as PII
            </button>
          </div>
        </header>

        {/* Document Canvas */}
        <div ref={viewerRef} className="flex-1 overflow-auto p-6 bg-[#fafafa] flex justify-center items-start pt-8" onClick={() => { setActiveDetection(null); setExplanation(null); }}>
          <div className="w-[660px] bg-white border border-gray-200/80 shadow-lg rounded-lg p-12 relative doc-paper">
            <div className="absolute top-5 right-5 border border-gray-200 text-gray-300 font-mono text-[8px] px-2.5 py-0.5 uppercase rounded-full tracking-widest">Confidential</div>
            <div className="font-sans text-[14.5px] text-gray-700 leading-[2] whitespace-pre-wrap">
              {renderText()}
            </div>
          </div>
        </div>

        {/* Bottom Status Strip */}
        <div className="h-10 border-t border-gray-100 flex items-center px-5 bg-white shrink-0 gap-4">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> {redactedCount} secured</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span> {missedCount} pending</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> {fpCount} uncertain</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block"></span> {dismissedCount} safe</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-emerald-400' : 'bg-violet-500'}`} style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="text-[10px] font-bold text-gray-400">{progressPercent}%</span>
          </div>
        </div>
      </main>

      {/* RIGHT: Reasoning Panel */}
      <aside className="pane-right flex-1 h-full bg-[#f0eef5] flex flex-col z-0 overflow-hidden">
        {/* Panel Header */}
        <header className="h-12 flex items-center justify-between px-5 border-b border-[#ddd8e8] shrink-0">
          <span className="text-[11px] font-bold text-[#6b5f8a] uppercase tracking-wider font-mono">Reasoning Panel</span>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={history.length === 0} className="text-[11px] text-[#8a7fb0] hover:text-[#4a3f6b] px-2 py-1 rounded-lg transition-colors disabled:opacity-30 flex items-center gap-1 font-medium">
              <span className="material-symbols-outlined text-[14px]">undo</span> Undo
            </button>
            <button onClick={handleExport} disabled={missedCount > 0} className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white px-4 py-1.5 rounded-xl font-semibold text-[11px] hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm" title={missedCount > 0 ? `Resolve ${missedCount} items` : 'Export'}>
              {missedCount > 0 ? `${missedCount} pending` : 'Export'}
            </button>
          </div>
        </header>

        {/* Reasoning Content */}
        <div className="flex-1 p-5 overflow-y-auto">

          {/* Loading state */}
          {isExplaining && (
            <div className="flex flex-col items-center justify-center h-40 animate-fade-in" style={{opacity:1}}>
              <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full mb-3" style={{animation:'spin 0.8s linear infinite'}}></div>
              <span className="text-xs text-[#8a7fb0] font-medium">Analyzing...</span>
            </div>
          )}

          {/* Explanation View */}
          {!isExplaining && explanation && (
            <div className="animate-slide-up space-y-4" style={{opacity:1}}>
              {/* What was selected */}
              <div>
                <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-1.5">Selected Text</span>
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-3.5 font-mono text-sm text-[#1a1a1a] break-all shadow-sm">
                  &ldquo;{explanation.selected_text}&rdquo;
                </div>
              </div>

              {/* Risk Badge */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${riskColors[explanation.risk_level]?.bg || riskColors.unknown.bg}`}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${riskColors[explanation.risk_level]?.dot || riskColors.unknown.dot}`}></span>
                <span className={`text-xs font-bold uppercase tracking-wider ${riskColors[explanation.risk_level]?.text || riskColors.unknown.text}`}>
                  {explanation.risk_level === 'none' ? 'No Risk — Safe' : explanation.risk_level === 'high' ? 'High Risk — PII Detected' : explanation.risk_level === 'medium' ? 'Medium Risk — Needs Review' : explanation.risk_level === 'low' ? 'Low Risk — Likely Safe' : 'Unknown'}
                </span>
              </div>

              {/* Detection info if present */}
              {explanation.is_detection && explanation.detection && (
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-[#8a7fb0] uppercase tracking-widest">Classification</span>
                    <span className="text-[10px] font-bold text-white bg-violet-500 px-2.5 py-0.5 rounded-lg">{explanation.detection.type}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-gray-400">Confidence</span>
                      <span className={`font-bold font-mono ${explanation.detection.confidence >= 0.85 ? 'text-emerald-600' : explanation.detection.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                        {(explanation.detection.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${explanation.detection.confidence >= 0.85 ? 'bg-emerald-400' : explanation.detection.confidence >= 0.5 ? 'bg-amber-400' : 'bg-red-400'}`} style={{width: `${explanation.detection.confidence * 100}%`}}></div>
                    </div>
                  </div>
                  {explanation.detection.source && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider">Detected by</span>
                      <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                        {explanation.detection.source === 'dual' ? 'Model + Heuristic' : explanation.detection.source === 'heuristic' ? 'Heuristic Pattern' : explanation.detection.source === 'manual' ? 'Manual' : 'NLP Model'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* The explanation */}
              <div>
                <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-1.5">
                  {explanation.is_detection ? 'Why was this redacted?' : 'Why was this kept?'}
                </span>
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm">
                  <p className="text-[13px] text-[#333] leading-relaxed">{explanation.explanation}</p>
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[12px] text-gray-400">{explanation.source === 'ai' ? 'smart_toy' : 'rule'}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wider">
                      {explanation.source === 'ai' ? 'AI-powered reasoning (Groq)' : explanation.source === 'error' ? 'Service unavailable' : 'Rule-based reasoning'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions — only for detections */}
              {explanation.is_detection && activeDetection && (
                <div className="space-y-2 pt-2">
                  <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-1">Actions</span>
                  {activeDetection.status === 'missed' && (
                    <>
                      <button onClick={() => handleAction('redacted')} className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2.5 rounded-xl font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.01]">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Accept Redaction
                      </button>
                      <button onClick={() => handleAction('dismissed')} className="w-full bg-white text-gray-600 border border-gray-200 py-2.5 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">close</span> Not PII — Dismiss
                      </button>
                    </>
                  )}
                  {activeDetection.status === 'false_positive' && (
                    <>
                      <button onClick={() => handleAction('redacted')} className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2.5 rounded-xl font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.01]">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span> Actually PII — Redact
                      </button>
                      <button onClick={() => handleAction('dismissed')} className="w-full bg-white text-gray-600 border border-gray-200 py-2.5 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">close</span> Confirm Safe
                      </button>
                    </>
                  )}
                  {activeDetection.status === 'redacted' && (
                    <button onClick={() => handleAction('missed')} className="w-full bg-white text-gray-600 border border-gray-200 py-2.5 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">undo</span> Undo Redaction
                    </button>
                  )}
                  {activeDetection.status === 'dismissed' && (
                    <button onClick={() => handleAction('redacted')} className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-2.5 rounded-xl font-semibold text-xs hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Re-activate — Redact
                    </button>
                  )}
                  {activeDetection.status !== 'flagged' && activeDetection.status !== 'dismissed' && (
                    <button onClick={() => handleAction('flagged')} className="w-full bg-white text-purple-600 border border-purple-200 py-2.5 rounded-xl font-semibold text-xs hover:bg-purple-50 transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[16px]">flag</span> Flag for Later
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Default overview */}
          {!isExplaining && !explanation && (
            <div className="animate-fade-in" style={{opacity:1}}>

              {/* PROBLEM 3: Attention Queue — for Sam working fast */}
              {attentionItems.length > 0 ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-red"></span>
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{attentionItems.length} Need{attentionItems.length === 1 ? 's' : ''} Attention</span>
                    </div>
                    <button onClick={goToNextItem} className="text-[10px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 transition-colors">
                      Review Next <span className="kbd">Tab</span>
                    </button>
                  </div>

                  {/* Scrollable attention list with inline actions */}
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {attentionItems.slice(0, 15).map((item) => (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer attention-item ${item.status === 'missed' ? 'bg-red-50/60 border-red-200 hover:bg-red-50' : 'bg-amber-50/60 border-amber-200 hover:bg-amber-50'}`}
                        onClick={() => handleDetectionClick(item)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${item.status === 'missed' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                              {item.status === 'missed' ? 'REVIEW' : 'FALSE POS?'}
                            </span>
                            <span className="text-[9px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{item.type}</span>
                            <span className={`text-[9px] font-mono font-bold ${item.confidence >= 0.85 ? 'text-emerald-600' : item.confidence >= 0.5 ? 'text-amber-600' : 'text-red-600'}`}>
                              {(item.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-700 font-medium truncate block">"{item.text}"</span>
                        </div>
                        {/* Quick inline actions — appear on hover */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: item.id, status: 'redacted' } }); axios.patch(`http://localhost:8000/api/detection/${item.id}`, { status: 'redacted' }).catch(() => {}); }}
                            className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center transition-colors"
                            title="Accept (Enter)"
                          >
                            <span className="material-symbols-outlined text-emerald-700 text-[14px]">check</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: item.id, status: 'dismissed' } }); axios.patch(`http://localhost:8000/api/detection/${item.id}`, { status: 'dismissed' }).catch(() => {}); }}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            title="Dismiss (Delete)"
                          >
                            <span className="material-symbols-outlined text-gray-500 text-[14px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {attentionItems.length > 15 && (
                      <div className="text-center text-[10px] text-gray-400 py-1">+{attentionItems.length - 15} more items</div>
                    )}
                  </div>

                  {/* Keyboard hints */}
                  <div className="flex items-center justify-center gap-3 mt-3 py-2 border-t border-[#ddd8e8]">
                    <span className="flex items-center gap-1 text-[9px] text-gray-400"><span className="kbd">Enter</span> Accept</span>
                    <span className="flex items-center gap-1 text-[9px] text-gray-400"><span className="kbd">Del</span> Dismiss</span>
                    <span className="flex items-center gap-1 text-[9px] text-gray-400"><span className="kbd">Tab</span> Next</span>
                    <span className="flex items-center gap-1 text-[9px] text-gray-400"><span className="kbd">⌘Z</span> Undo</span>
                  </div>
                </div>
              ) : (
                /* All clear — show the click-to-explain prompt */
                <div className="text-center py-6 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                    <span className="material-symbols-outlined text-emerald-500 text-[28px]">verified</span>
                  </div>
                  <h3 className="text-base font-bold text-[#333] mb-1">All items reviewed</h3>
                  <p className="text-xs text-[#8a7fb0] max-w-[200px] mx-auto leading-relaxed">
                    Click any word to verify, or proceed to export.
                  </p>
                </div>
              )}

              {/* Click any word hint */}
              {attentionItems.length > 0 && (
                <div className="flex items-center gap-2 bg-violet-50/60 border border-violet-200 rounded-xl p-3 mb-3">
                  <span className="material-symbols-outlined text-violet-400 text-[18px]">touch_app</span>
                  <span className="text-[11px] text-violet-700">Click any word in the document to ask <strong>"why this?"</strong> or <strong>"why not that?"</strong></span>
                </div>
              )}

              {/* Quick Stats */}
              <div className="space-y-2">
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest">Review Progress</span>
                    <span className="text-xl font-bold text-[#333]">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-emerald-400' : 'bg-violet-500'}`} style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white border border-[#ddd8e8] rounded-xl p-3 shadow-sm">
                    <div className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest mb-1">Secured</div>
                    <div className="text-xl font-bold text-emerald-600">{redactedCount}</div>
                  </div>
                  <div className="bg-white border border-[#ddd8e8] rounded-xl p-3 shadow-sm">
                    <div className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest mb-1">Pending</div>
                    <div className={`text-xl font-bold ${missedCount > 0 ? 'text-red-500' : 'text-gray-300'}`}>{missedCount}</div>
                  </div>
                </div>

                {/* Type breakdown */}
                {Object.keys(typeStats).length > 0 && (
                  <div className="bg-white border border-[#ddd8e8] rounded-xl p-3 shadow-sm">
                    <div className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest mb-2">By Type</div>
                    <div className="space-y-1.5">
                      {Object.entries(typeStats).map(([type, s]) => (
                        <div key={type} className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-gray-500 w-24 truncate">{type}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{width: `${s.total > 0 ? (s.redacted / s.total) * 100 : 0}%`}}></div>
                          </div>
                          <span className="text-[10px] font-bold"><span className="text-emerald-600">{s.redacted}</span><span className="text-gray-300">/{s.total}</span></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bulk accept */}
                {missedCount > 0 && (
                  <button onClick={() => setShowBulkModal(true)} className="w-full bg-white border border-[#ddd8e8] text-[#6b5f8a] py-2.5 rounded-xl font-medium text-[11px] hover:bg-violet-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">done_all</span> Bulk Accept High Confidence
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Fatigue Guard Modal — Problem 3 */}
      {showFatigueGuard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" style={{opacity:1}}>
          <div className="bg-white rounded-2xl p-6 border border-amber-200 w-96 shadow-2xl animate-scale-in" style={{opacity:1}}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
                <span className="material-symbols-outlined text-amber-600 text-[24px]">speed</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1a1a1a]">Slow down a moment</h3>
                <p className="text-[11px] text-gray-500">You've been reviewing very quickly</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              You've made several rapid decisions in a row. Mistakes are most likely to slip through when you're on autopilot.
              <br /><br />
              <strong>Take a breath</strong> — the next items may need closer attention.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="flex items-center gap-2 text-[11px] text-amber-700">
                <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                <span>The most dangerous mistakes are the ones that look right at first glance.</span>
              </div>
            </div>
            <button
              onClick={() => setShowFatigueGuard(false)}
              className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-all shadow-sm"
            >
              I understand — continue reviewing
            </button>
          </div>
        </div>
      )}

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" style={{opacity:1}}>
          <div className="bg-white rounded-2xl p-6 border border-gray-200 w-80 shadow-2xl animate-scale-in" style={{opacity:1}}>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-1">Bulk Accept</h3>
            <p className="text-xs text-gray-500 mb-5">Accept all pending items above a confidence threshold:</p>
            <div className="space-y-2">
              {[0.85, 0.70, 0.50].map(t => (
                <button key={t} onClick={() => handleBulkAccept(t)} className="w-full text-left px-4 py-2.5 bg-gray-50 hover:bg-violet-50 rounded-xl text-sm transition-colors flex justify-between items-center border border-gray-200">
                  <span>≥ {(t * 100).toFixed(0)}%</span>
                  <span className="text-xs text-gray-400">{activeDetections.filter(d => d.status === 'missed' && d.confidence >= t).length} items</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowBulkModal(false)} className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-[#1a1a1a] px-5 py-3 rounded-2xl shadow-2xl border border-gray-200 flex items-center gap-4 z-50 animate-slide-up" style={{opacity:1}}>
          <span className="text-sm">{undoToast.text}</span>
          <button onClick={handleUndo} className="text-violet-600 hover:text-violet-800 font-bold text-sm transition-colors">UNDO</button>
        </div>
      )}
    </div>
  );
};

export default Review;
