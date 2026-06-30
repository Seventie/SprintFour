import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReview } from '../context/ReviewContext';
import { Download, ChevronLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const Export = () => {
  const { state, dispatch } = useReview();
  const { documents, detections, activeDocId } = state;
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [textPreviewContent, setTextPreviewContent] = useState(null);
  useEffect(() => {
    if (documents.length === 0) navigate('/upload');
  }, [documents, navigate]);

  const activeDoc = documents.find(d => d.doc_id === activeDocId);
  const activeDetections = activeDoc ? (detections[activeDoc.doc_id] || []) : [];
  const exportMode = activeDoc?.default_action_mode || 'redact';

  const redactedItems = activeDetections.filter(d => d.status === 'redacted' || d.status === 'added');
  const redactedCount = redactedItems.length;
  const missedCount = activeDetections.filter(d => d.status === 'missed').length;
  const dismissedCount = activeDetections.filter(d => d.status === 'dismissed').length;
  const totalCount = activeDetections.length;

  // Safety score calculation with Grade and Label
  const safetyScore = useMemo(() => {
    if (totalCount === 0 || missedCount === 0) {
      return { grade: 'A+', label: 'Cleared for Export', score: 100 };
    }
    const addressed = redactedCount + dismissedCount;
    const pct = Math.round((addressed / totalCount) * 100);
    if (pct >= 90) return { grade: 'A', label: 'High Security', score: pct };
    if (pct >= 70) return { grade: 'B', label: 'Review Pending Items', score: pct };
    return { grade: 'C', label: 'Action Required', score: pct };
  }, [redactedCount, dismissedCount, totalCount, missedCount]);

  // Fetch redacted preview from backend
  useEffect(() => {
    if (!activeDoc || missedCount > 0) return;

    const fetchPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const resp = await axios.post('http://localhost:8000/api/export', {
          doc_id: activeDoc.doc_id,
          filename: activeDoc.filename,
          detections: activeDetections,
          content: activeDoc?.content || activeDoc?.plain_text || '',
          export_mode: exportMode,
        }, { responseType: 'blob' });

        // Read stripped metadata header
        const metaHeader = resp.headers['x-stripped-metadata'];
        if (metaHeader) {
          try { setStrippedMeta(JSON.parse(metaHeader)); } catch (e) { /* ignore */ }
        }

        const isPdf = activeDoc.file_type === 'pdf';

        if (isPdf) {
          const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
          setPreviewUrl(url);
          setTextPreviewContent(null);
        } else {
          const text = await resp.data.text();
          setTextPreviewContent(text);
          const url = window.URL.createObjectURL(new Blob([resp.data]));
          setPreviewUrl(url);
        }
      } catch (err) {
        console.error('Preview failed:', err);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    fetchPreview();
    return () => { if (previewUrl) window.URL.revokeObjectURL(previewUrl); };
  }, [activeDocId, missedCount, exportMode]);

  const handleDownload = async () => {
    if (!activeDoc || missedCount > 0) return;

    const prefix = exportMode === 'anonymize' ? 'anonymized_' : 'redacted_';

    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.setAttribute('download', `${prefix}${activeDoc.filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
      return;
    }

    setIsExporting(true);
    try {
      const resp = await axios.post('http://localhost:8000/api/export', {
        doc_id: activeDoc.doc_id,
        filename: activeDoc.filename,
        detections: activeDetections,
        content: activeDoc?.content || activeDoc?.plain_text || '',
        export_mode: exportMode,
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${prefix}${activeDoc.filename}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadComplete(true);
      setTimeout(() => setDownloadComplete(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Export failed. Ensure backend is running.');
    } finally {
      setIsExporting(false);
    }
  };

  if (documents.length === 0) return null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-aura-cream dark:bg-background-dark font-sans selection:bg-primary selection:text-white">

      {/* LEFT: Document Preview */}
      <div className="pane-left flex-[1.7] h-full flex flex-col bg-white dark:bg-card-dark border-r-2 border-black relative">
        {/* Header */}
        <div className="p-5 border-b-2 border-black bg-card-yellow shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border-2 border-black flex items-center justify-center shadow-retro">
              <ShieldCheck className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-black tracking-tight">Redacted Output</h2>
              <p className="text-xs text-black font-bold uppercase tracking-widest font-mono">
                {activeDoc?.filename} · {activeDoc?.file_type?.toUpperCase()} · {redactedCount} entities secured
              </p>
            </div>
          </div>
          {missedCount === 0 && (
            <div className="flex items-center gap-2 bg-secondary text-black px-4 py-2 rounded-full border-2 border-black shadow-brutalist-sm">
              <CheckCircle className="w-4 h-4 text-black" />
              <span className="text-xs font-bold uppercase tracking-widest">Cleared for Sharing</span>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-aura-cream dark:bg-background-dark">
          {missedCount > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-black dark:text-white">
              <div className="w-16 h-16 bg-card-orange rounded-3xl border-2 border-black shadow-retro flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-black" />
              </div>
              <p className="text-xl font-display font-bold">Resolve all pending items to unlock preview</p>
              <button onClick={() => navigate('/review')} className="mt-6 px-8 py-3 bg-primary text-white rounded-full border-2 border-black text-sm font-bold hover:shadow-retro transition-all shadow-brutalist-sm">
                Return to Review
              </button>
            </div>
          ) : isLoadingPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-black">
              <div className="w-10 h-10 border-4 border-black border-t-primary rounded-full mb-4 animate-spin"></div>
              <p className="font-hand text-xl text-primary">Generating Redacted {activeDoc?.file_type?.toUpperCase()}...</p>
            </div>
          ) : activeDoc?.file_type === 'pdf' && previewUrl ? (
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title="Redacted PDF Preview"
            />
          ) : textPreviewContent ? (
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto bg-white dark:bg-card-dark p-12 shadow-brutalist border-2 border-black rounded-3xl min-h-full">
                {activeDoc?.file_type === 'docx' && (
                  <div className="bg-card-blue text-black text-xs text-center py-3 font-bold border-b-2 border-black flex items-center justify-center gap-2 rounded-t-3xl -mt-12 -mx-12 mb-8 uppercase tracking-wider">
                    <FileText className="w-4 h-4" /> Text Preview — Download for full DOCX formatting
                  </div>
                )}
                <pre className="text-base text-gray-900 dark:text-gray-100 leading-[2.2] whitespace-pre-wrap font-sans">{textPreviewContent}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center font-hand text-2xl text-gray-400">
              No preview available
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Compact Export Controls */}
      <aside className="pane-right flex-1 h-full flex flex-col bg-card-purple overflow-hidden border-l-2 border-black">
        {/* Header */}
        <div className="p-5 flex items-center gap-3 border-b-2 border-black h-16 shrink-0 bg-card-blue">
          <button onClick={() => navigate('/review')} className="p-2 bg-white hover:bg-gray-100 border border-black rounded-xl transition-colors shadow-[2px_2px_0px_0px_#000]">
            <ChevronLeft className="w-5 h-5 text-black" />
          </button>
          <h1 className="font-display font-bold text-lg text-black">Export Hub</h1>
        </div>

        {/* Compact Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Document Selector */}
          {documents.length > 1 && (
            <div>
              <span className="text-xs font-bold text-black tracking-widest uppercase block mb-2 font-mono">Workspace Files</span>
              <div className="space-y-2">
                {documents.map((doc) => {
                  const docDets = detections[doc.doc_id] || [];
                  const missed = docDets.filter(d => d.status === 'missed').length;
                  return (
                    <button key={doc.doc_id} onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-bold text-xs border-2 ${activeDocId === doc.doc_id ? 'bg-white border-black shadow-retro text-black' : 'border-transparent hover:border-black text-gray-700'}`}>
                      <span className="truncate">{doc.filename}</span>
                      <span className={`px-2 py-0.5 rounded-full border border-black text-[10px] uppercase ${missed > 0 ? 'bg-red-500 text-white' : 'bg-secondary text-black'}`}>
                        {missed > 0 ? `${missed} pending` : 'Ready'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeDoc && (
            <>
              {/* Compact Grade & Safety Card */}
              <div className="bg-white border-2 border-black rounded-3xl p-6 text-center shadow-brutalist-sm">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-card-yellow border-2 border-black flex items-center justify-center shadow-retro mb-3">
                  <span className="text-2xl font-display font-bold text-black">{safetyScore.grade}</span>
                </div>
                <h3 className="text-xl font-display font-bold text-black">{safetyScore.label}</h3>
                <p className="text-xs font-bold text-gray-600 mt-1">
                  {missedCount === 0 ? 'All confidential entities secured with spaCy token precision.' : `${missedCount} items still need review before safe export.`}
                </p>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card-yellow p-4 rounded-3xl text-center border-2 border-black shadow-retro">
                  <div className="text-3xl font-display font-bold text-black">{redactedCount}</div>
                  <div className="text-[10px] text-black uppercase font-bold tracking-widest mt-1">Secured Entities</div>
                </div>
                <div className="bg-white p-4 rounded-3xl text-center border-2 border-black shadow-retro">
                  <div className="text-3xl font-display font-bold text-black">{dismissedCount}</div>
                  <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mt-1">Dismissed Safe</div>
                </div>
              </div>

              {/* Compact Guarantee Checklist */}
              <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-brutalist-sm space-y-3">
                <span className="text-xs font-bold text-black uppercase tracking-widest block font-mono">Export Guarantees</span>
                <div className="space-y-2 text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-black" />
                    </div>
                    <span>spaCy Word-Boundary Protection</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-black" />
                    </div>
                    <span>Document Metadata & Author Stripped</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-black" />
                    </div>
                    <span>Original {activeDoc.file_type.toUpperCase()} Formatting Maintained</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Download Action */}
        {activeDoc && (
          <div className="p-6 pt-0">
            <button
              onClick={handleDownload}
              disabled={isExporting || missedCount > 0}
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-full font-bold text-base uppercase tracking-wider transition-all duration-300 border-2 border-black shadow-retro ${
                downloadComplete
                  ? 'bg-secondary text-black scale-[1.02]'
                  : missedCount > 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:shadow-retro-hover hover:-translate-y-1'
              }`}
            >
              {downloadComplete ? (
                <><CheckCircle className="w-5 h-5" /> Download Complete</>
              ) : (
                <><Download className="w-5 h-5" /> {isExporting ? 'Generating...' : missedCount > 0 ? 'Resolve Pending Items' : `Download ${exportMode === 'anonymize' ? 'Anonymized' : 'Redacted'} ${activeDoc.file_type.toUpperCase()}`}</>
              )}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Export;
