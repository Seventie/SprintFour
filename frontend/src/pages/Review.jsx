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

  const handleAction = useCallback((status) => {
    if (!activeDetection) return;

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
  }, [activeDetection, activeDocId, dispatch]);

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
    <div className="h-screen overflow-hidden flex bg-aura-cream dark:bg-background-dark font-sans selection:bg-primary selection:text-white">

      {/* LEFT: Sidebar */}
      <nav className={`bg-white dark:bg-card-dark border-r-2 border-black flex flex-col h-full transition-all duration-300 shrink-0 z-20 pane-left ${sidebarOpen ? 'w-[250px]' : 'w-[70px]'}`}>
        <div className="p-4 flex items-center gap-3 border-b-2 border-black h-16 shrink-0 bg-card-yellow">
          <div className="w-8 h-8 rounded-xl bg-primary border-2 border-black shrink-0 flex items-center justify-center shadow-retro">
            <span className="material-symbols-outlined text-white text-[16px]">shield</span>
          </div>
          {sidebarOpen && <h1 className="font-display font-bold text-black tracking-tight text-xl">Conseal<span className="text-primary font-hand text-2xl">.</span></h1>}
          <button onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })} className="p-1.5 hover:bg-white/50 border border-black rounded-lg transition-colors ml-auto shrink-0 shadow-[2px_2px_0px_0px_#000]">
            <span className="material-symbols-outlined text-black text-[18px]">{sidebarOpen ? 'menu_open' : 'menu'}</span>
          </button>
        </div>

        <div className="p-4 border-b-2 border-black bg-white dark:bg-card-dark">
          <button onClick={() => { dispatch({ type: 'CLEAR_SESSION' }); navigate('/upload'); }} className="w-full bg-primary text-white py-2.5 rounded-full border-2 border-black font-bold text-xs hover:shadow-retro hover:-translate-y-0.5 transition-all flex items-center justify-center gap-1.5 shadow-brutalist-sm">
            <span className="material-symbols-outlined text-[16px] font-bold">add</span>
            {sidebarOpen && <span>New Analysis</span>}
          </button>
        </div>

        {sidebarOpen && <div className="px-4 mt-3 mb-1"><span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase font-mono">WORKSPACE FILES</span></div>}
        <ul className="flex-1 py-2 overflow-y-auto px-3 space-y-1.5">
          {documents.map((doc) => {
            const docDets = detections[doc.doc_id] || [];
            const missed = docDets.filter(d => d.status === 'missed').length;
            return (
              <li key={doc.doc_id}>
                <button
                  onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 text-left border-2 ${activeDocId === doc.doc_id ? 'bg-card-purple text-black border-black shadow-retro' : 'border-transparent text-gray-700 dark:text-gray-300 hover:border-black hover:bg-white'}`}
                >
                  <span className="material-symbols-outlined shrink-0 text-[18px] text-black dark:text-white">
                    {doc.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-bold text-xs text-black dark:text-white">{doc.filename}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${missed > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
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
      <main className="flex-[1.7] h-full flex flex-col min-w-0 bg-white dark:bg-card-dark border-r-2 border-black">
        {/* Viewer Header */}
        <header className="h-16 border-b-2 border-black flex items-center justify-between px-6 shrink-0 bg-card-yellow">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-base text-black">{activeDoc?.filename}</span>
            <span className="text-xs font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-black uppercase">{activeDoc?.file_type}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-black uppercase tracking-wider bg-white/60 px-3 py-1 rounded-full border border-black">
              {reviewedCount}/{totalDetections} reviewed
            </span>
            <button onClick={handleMarkSelection} className="text-xs bg-white hover:bg-card-orange text-black px-4 py-2 rounded-full transition-all flex items-center gap-1.5 font-bold border-2 border-black shadow-retro-white">
              <span className="material-symbols-outlined text-[16px] font-bold">add_circle</span>
              Mark Selection as PII
            </button>
          </div>
        </header>

        {/* Document Canvas */}
        <div ref={viewerRef} className="flex-1 overflow-auto p-8 bg-aura-cream dark:bg-background-dark flex justify-center items-start pt-10" onClick={() => { setActiveDetection(null); setExplanation(null); }}>
          <div className="w-[700px] bg-white dark:bg-card-dark border-2 border-black shadow-brutalist rounded-3xl p-14 relative doc-paper">
            <div className="absolute top-6 right-6 border-2 border-black bg-card-purple text-black font-bold text-[10px] px-3 py-1 uppercase rounded-full tracking-widest shadow-[2px_2px_0px_0px_#000]">Confidential</div>
            <div className="font-sans text-base text-gray-900 dark:text-gray-100 leading-[2.2] whitespace-pre-wrap">
              {renderText()}
            </div>
          </div>
        </div>

        {/* Bottom Status Strip */}
        <div className="h-14 border-t-2 border-black flex items-center px-6 bg-white dark:bg-card-dark shrink-0 gap-6">
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-black dark:text-white">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-black bg-primary inline-block"></span> {redactedCount} secured</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-black bg-red-500 inline-block"></span> {missedCount} pending</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-black bg-secondary inline-block"></span> {fpCount} uncertain</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full border border-black bg-gray-400 inline-block"></span> {dismissedCount} safe</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-32 h-3 bg-gray-200 border border-black rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-primary' : 'bg-secondary'}`} style={{ width: `${progressPercent}%` }}></div>
            </div>
            <span className="text-xs font-bold text-black dark:text-white">{progressPercent}%</span>
          </div>
        </div>
      </main>

      {/* RIGHT: Reasoning & Triage Panel */}
      <aside className="pane-right flex-1 h-full bg-card-purple flex flex-col z-0 overflow-hidden border-l-2 border-black">
        {/* Panel Header */}
        <header className="h-16 flex items-center justify-between px-5 border-b-2 border-black shrink-0 bg-card-blue">
          <span className="text-xs font-bold text-black uppercase tracking-widest font-mono">Reasoning & Triage</span>
          <div className="flex items-center gap-2">
            <button onClick={handleUndo} disabled={history.length === 0} className="text-xs bg-white hover:bg-gray-100 text-black border border-black px-3 py-1.5 rounded-full transition-colors disabled:opacity-40 flex items-center gap-1 font-bold shadow-[2px_2px_0px_0px_#000]">
              <span className="material-symbols-outlined text-[16px]">undo</span>
            </button>
            <button onClick={handleExport} disabled={missedCount > 0} className="bg-secondary text-black px-4 py-1.5 rounded-full border-2 border-black font-bold text-xs hover:shadow-retro transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-brutalist-sm">
              {missedCount > 0 ? `${missedCount} pending` : 'Export Clean →'}
            </button>
          </div>
        </header>

        {/* Reasoning Content — Compact & Simple */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">

          {/* Loading state */}
          {isExplaining && (
            <div className="flex flex-col items-center justify-center h-48 bg-white border-2 border-black rounded-3xl p-6 shadow-brutalist-sm">
              <div className="w-8 h-8 border-4 border-black border-t-primary rounded-full mb-3 animate-spin"></div>
              <span className="text-xs font-bold text-black uppercase tracking-wider font-mono">Analyzing Entity...</span>
            </div>
          )}

          {/* Item Explanation View */}
          {!isExplaining && explanation && (
            <div className="space-y-4 animate-slide-up">
              {/* Selected text card */}
              <div className="bg-white border-2 border-black rounded-3xl p-4 shadow-brutalist-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Target Entity</span>
                  {explanation.is_detection && explanation.detection && (
                    <span className="text-xs font-bold text-white bg-primary px-3 py-0.5 rounded-full border border-black">
                      {explanation.detection.type} · {(explanation.detection.confidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div className="font-mono text-sm font-bold text-black break-all bg-card-yellow p-3 rounded-2xl border border-black">
                  &ldquo;{explanation.selected_text}&rdquo;
                </div>
              </div>

              {/* Concise Reasoning */}
              <div className="bg-white border-2 border-black rounded-3xl p-4 shadow-brutalist-sm">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5 font-mono">
                  {explanation.is_detection ? 'Redaction Rationale' : 'Keep Rationale'}
                </span>
                <p className="text-xs font-bold text-gray-800 leading-relaxed">{explanation.explanation}</p>
                <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase">
                  <span>{explanation.source === 'ai' ? 'Groq AI Reasoning' : 'Rule Heuristic'}</span>
                  <button onClick={() => setExplanation(null)} className="text-primary underline">Close</button>
                </div>
              </div>

              {/* Compact Actions: Redact vs Anonymize vs Dismiss */}
              {explanation.is_detection && activeDetection && (
                <div className="space-y-2 pt-1">
                  {activeDetection.status === 'missed' || activeDetection.status === 'false_positive' ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleAction('redacted', 'redact')} className="flex-1 bg-primary text-white py-2.5 rounded-full font-bold text-xs hover:shadow-retro transition-all border-2 border-black flex items-center justify-center gap-1 shadow-brutalist-sm">
                          <span className="material-symbols-outlined text-[16px]">ink_eraser</span> Redact (Blackout)
                        </button>
                        <button onClick={() => handleAction('redacted', 'anonymize')} className="flex-1 bg-secondary text-black py-2.5 rounded-full font-bold text-xs hover:shadow-retro transition-all border-2 border-black flex items-center justify-center gap-1 shadow-brutalist-sm">
                          <span className="material-symbols-outlined text-[16px]">masks</span> Anonymize (Synthetic)
                        </button>
                      </div>
                      <button onClick={() => handleAction('dismissed')} className="w-full bg-white text-black py-2 rounded-full font-bold text-xs hover:bg-gray-100 transition-all border-2 border-black flex items-center justify-center gap-1.5 shadow-brutalist-sm">
                        <span className="material-symbols-outlined text-[16px]">close</span> Dismiss (Keep Safe)
                      </button>
                    </div>
                  ) : activeDetection.status === 'redacted' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center text-xs font-bold text-emerald-700 bg-emerald-50 py-2 rounded-2xl border border-emerald-300">
                        Mode: {activeDetection.action_mode === 'anonymize' ? 'Synthetic Anonymization' : 'Blackout Redaction'}
                      </div>
                      <button onClick={() => handleAction('missed')} className="w-full bg-white text-black py-2.5 rounded-full font-bold text-xs hover:bg-gray-100 transition-all border-2 border-black flex items-center justify-center gap-1.5 shadow-brutalist-sm">
                        <span className="material-symbols-outlined text-[16px]">undo</span> Undo Action
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction('redacted', 'redact')} className="flex-1 bg-primary text-white py-2.5 rounded-full font-bold text-xs hover:shadow-retro transition-all border-2 border-black flex items-center justify-center gap-1 shadow-brutalist-sm">
                        <span className="material-symbols-outlined text-[16px]">ink_eraser</span> Redact
                      </button>
                      <button onClick={() => handleAction('redacted', 'anonymize')} className="flex-1 bg-secondary text-black py-2.5 rounded-full font-bold text-xs hover:shadow-retro transition-all border-2 border-black flex items-center justify-center gap-1 shadow-brutalist-sm">
                        <span className="material-symbols-outlined text-[16px]">masks</span> Anonymize
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Default Overview — Ultra Compact & Clean */}
          {!isExplaining && !explanation && (
            <div className="space-y-4 animate-fade-in">

              {/* Progress Summary Card */}
              <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-brutalist-sm">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-black uppercase tracking-widest font-mono">Triage Progress</span>
                  <span className="text-2xl font-display font-bold text-black">{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 border border-black rounded-full overflow-hidden mb-4">
                  <div className={`h-full rounded-full transition-all duration-700 ${progressPercent === 100 ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${progressPercent}%` }}></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card-yellow p-3 rounded-2xl border-2 border-black text-center">
                    <div className="text-xs font-bold text-gray-700 uppercase">Secured</div>
                    <div className="text-xl font-display font-bold text-black">{redactedCount}</div>
                  </div>
                  <div className="bg-card-orange p-3 rounded-2xl border-2 border-black text-center">
                    <div className="text-xs font-bold text-gray-700 uppercase">Pending</div>
                    <div className="text-xl font-display font-bold text-black">{missedCount}</div>
                  </div>
                </div>
              </div>

              {/* Compact Attention List (Max 5 items) */}
              {attentionItems.length > 0 ? (
                <div className="bg-white border-2 border-black rounded-3xl p-4 shadow-brutalist-sm space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-600 uppercase tracking-widest font-mono">
                      Needs Review ({attentionItems.length})
                    </span>
                    <button onClick={goToNextItem} className="text-[11px] font-bold text-primary underline">
                      Next Tab →
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {attentionItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleDetectionClick(item)}
                        className="group flex items-center justify-between p-3 rounded-2xl border-2 border-black bg-aura-cream hover:bg-card-yellow transition-all cursor-pointer shadow-brutalist-xs"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold text-white bg-primary px-2 py-0.5 rounded-full border border-black">{item.type}</span>
                            <span className="text-[10px] font-mono font-bold text-black">{(item.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <span className="text-xs font-bold text-black truncate block">&ldquo;{item.text}&rdquo;</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: item.id, status: 'redacted', actionMode: 'redact' } }); axios.patch(`http://localhost:8000/api/detection/${item.id}`, { status: 'redacted', action_mode: 'redact' }).catch(() => {}); }}
                            className="w-7 h-7 rounded-xl bg-primary text-white border border-black flex items-center justify-center hover:scale-110 transition-transform"
                            title="Redact (Blackout)"
                          >
                            <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: item.id, status: 'redacted', actionMode: 'anonymize' } }); axios.patch(`http://localhost:8000/api/detection/${item.id}`, { status: 'redacted', action_mode: 'anonymize' }).catch(() => {}); }}
                            className="w-7 h-7 rounded-xl bg-secondary text-black border border-black flex items-center justify-center hover:scale-110 transition-transform"
                            title="Anonymize (Synthetic)"
                          >
                            <span className="material-symbols-outlined text-[15px]">masks</span>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); dispatch({ type: 'UPDATE_DETECTION_STATUS', payload: { docId: activeDocId, detectionId: item.id, status: 'dismissed' } }); axios.patch(`http://localhost:8000/api/detection/${item.id}`, { status: 'dismissed' }).catch(() => {}); }}
                            className="w-7 h-7 rounded-xl bg-white text-black border border-black flex items-center justify-center hover:scale-110 transition-transform"
                            title="Dismiss"
                          >
                            <span className="material-symbols-outlined text-[15px]">close</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {attentionItems.length > 5 && (
                    <div className="text-center text-xs font-bold text-gray-500 pt-1">
                      +{attentionItems.length - 5} more pending items
                    </div>
                  )}

                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="w-full mt-2 bg-primary text-white py-2.5 rounded-full font-bold text-xs uppercase tracking-wider border-2 border-black shadow-retro hover:shadow-retro-hover transition-all"
                  >
                    Bulk Accept All Above 85%
                  </button>
                </div>
              ) : (
                <div className="bg-white border-2 border-black rounded-3xl p-6 text-center shadow-brutalist-sm">
                  <div className="w-12 h-12 rounded-2xl bg-secondary border-2 border-black flex items-center justify-center mx-auto mb-3 shadow-retro">
                    <span className="material-symbols-outlined text-black text-[24px]">verified</span>
                  </div>
                  <h3 className="text-base font-display font-bold text-black mb-1">All Items Secured</h3>
                  <p className="text-xs font-bold text-gray-600">
                    Click any word in the document to ask AI why it was kept or redacted.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Bulk Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 border-2 border-black w-80 shadow-retro animate-scale-in">
            <h3 className="text-lg font-display font-bold text-black mb-1">Bulk Accept</h3>
            <p className="text-xs font-bold text-gray-600 mb-5">Accept pending items by confidence threshold:</p>
            <div className="space-y-2">
              {[0.85, 0.70, 0.50].map(t => (
                <button key={t} onClick={() => handleBulkAccept(t)} className="w-full text-left px-4 py-3 bg-card-yellow hover:bg-secondary rounded-2xl text-xs font-bold transition-all border-2 border-black flex justify-between items-center shadow-brutalist-xs">
                  <span>≥ {(t * 100).toFixed(0)}% Confidence</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded-full border border-black">{activeDetections.filter(d => d.status === 'missed' && d.confidence >= t).length}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowBulkModal(false)} className="w-full mt-4 py-2 text-xs font-bold text-gray-600 hover:text-black">Cancel</button>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-6 py-3 rounded-full shadow-retro border-2 border-black flex items-center gap-4 z-50 font-bold text-xs animate-slide-up">
          <span>{undoToast.text}</span>
          <button onClick={handleUndo} className="text-primary underline">UNDO</button>
        </div>
      )}
    </div>
  );
};

export default Review;
