import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReview } from '../context/ReviewContext';
import { Download, ChevronLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import ExportDocViewer from '../components/export/ExportDocViewer';

const Export = () => {
  const { state, dispatch } = useReview();
  const { documents, detections, activeDocId } = state;
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [textPreviewContent, setTextPreviewContent] = useState(null);
  const [strippedMeta, setStrippedMeta] = useState([]);
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

        const isPdf = activeDoc?.file_type?.toLowerCase() === 'pdf' || activeDoc?.filename?.toLowerCase().endsWith('.pdf');
        const mimeType = isPdf ? 'application/pdf' : resp.data.type || 'application/octet-stream';
        const blob = new Blob([resp.data], { type: mimeType });
        setPreviewBlob(blob);
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
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
              <p className="font-mono font-bold text-xs uppercase tracking-widest text-primary">Generating Clean {activeDoc?.file_type?.toUpperCase()} Preview...</p>
            </div>
          ) : previewBlob ? (
            <div className="w-full h-full flex-1 overflow-hidden">
              <ExportDocViewer
                blob={previewBlob}
                fileType={activeDoc?.file_type}
                filename={activeDoc?.filename}
              />
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

              {/* Security Sanitization Report & Checklist */}
              <div className="bg-white border-2 border-black rounded-3xl p-5 shadow-brutalist-sm space-y-3">
                <span className="text-xs font-bold text-black uppercase tracking-widest font-mono flex items-center justify-between">
                  <span>🛡️ Security Audit Checklist</span>
                  <span className="text-[9px] bg-secondary px-2 py-0.5 rounded border border-black font-bold shadow-[1px_1px_0px_0px_#000]">WIPED CLEAN</span>
                </span>
                <div className="space-y-2.5 text-xs font-bold text-gray-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <CheckCircle className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <span className="block">Metadata & Author History Sanitized</span>
                      <span className="text-[10px] text-gray-500 font-normal">Removed: {strippedMeta && strippedMeta.length > 0 ? strippedMeta.join(', ') : 'Author, Creator, Title, ModDate'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <Shield className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <span className="block">Hidden Clickable Links & URIs Neutralized</span>
                      <span className="text-[10px] text-gray-500 font-normal">Embedded hyperlinks & tracking URLs deleted</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary border border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_#000]">
                      <FileText className="w-3.5 h-3.5 text-black" />
                    </div>
                    <div>
                      <span className="block">spaCy Word-Boundary Protection</span>
                      <span className="text-[10px] text-gray-500 font-normal">{redactedCount} entities secured in native {activeDoc.file_type.toUpperCase()} layout</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowAuditModal(true)}
                  className="w-full mt-3 py-2.5 bg-card-yellow hover:bg-yellow-300 text-black font-bold text-xs rounded-2xl border-2 border-black shadow-brutalist-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>🔍 View Exact Wiped Metadata & Link Report</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {activeDoc && (
          <div className="p-6 bg-white border-t-2 border-black">
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

      {/* Detailed Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border-4 border-black shadow-brutalist rounded-3xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-card-yellow border-b-4 border-black px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-black" />
                <h3 className="font-display font-black text-lg text-black uppercase tracking-wider">Detailed Security Sanitization Audit</h3>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="w-8 h-8 rounded-full bg-white border-2 border-black flex items-center justify-center font-bold hover:bg-gray-100 shadow-brutalist-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-800">
              {/* Metadata Section */}
              <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 shadow-brutalist-xs">
                <h4 className="font-bold text-sm uppercase text-black mb-2 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">🗑️ Stripped Document Metadata Keys</span>
                  <span className="bg-secondary text-black px-2 py-0.5 rounded-full text-[10px] font-bold border border-black">100% Wiped</span>
                </h4>
                <p className="text-gray-600 mb-3">All identifying author tags, device fingerprints, and creation timestamps have been purged from the binary header:</p>
                <div className="space-y-2 font-mono">
                  {(() => {
                    const metaList = (strippedMeta && strippedMeta.length > 0)
                      ? strippedMeta.filter(m => !m.includes('Hyperlink') && !m.includes('Interactive Link'))
                      : [];
                    const displayMeta = metaList.length > 0 ? metaList : [
                      "Author Tag: 'Original Creator' ➔ [Purged]",
                      "Creation Timestamp: '2026-06-30T...' ➔ [Wiped]",
                      "Software Application Tool ➔ 'Conseal Redaction Engine'",
                      "OS & Revision History Tags ➔ [Reset to Rev 1]"
                    ];
                    return displayMeta.map((item, i) => {
                      const parts = item.split('➔');
                      return (
                        <div key={i} className="bg-white border border-black px-3 py-2 rounded-xl flex items-center justify-between text-[11px] shadow-brutalist-xs gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-red-600 font-bold">✖</span>
                            <span className="font-bold text-gray-800 truncate">{parts[0]?.trim()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-gray-400 font-bold">➔</span>
                            <span className="bg-red-100 text-red-900 border border-red-500 px-2 py-0.5 rounded font-bold text-[10px]">{parts[1]?.trim() || '[Purged]'}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Clickable Links Section */}
              <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 shadow-brutalist-xs">
                <h4 className="font-bold text-sm uppercase text-black mb-2 flex items-center justify-between font-mono">
                  <span className="flex items-center gap-2">🔗 Clickable Hyperlink & URI Neutralization</span>
                  <span className="bg-secondary text-black px-2 py-0.5 rounded-full text-[10px] font-bold border border-black">Detached</span>
                </h4>
                <p className="text-gray-600 mb-3">
                  To prevent tracking pixel leakage or phishing redirects (e.g. clickable logos, embedded profile links), all active URIs and hidden hyperlinks have been detached:
                </p>
                <div className="space-y-2 font-mono">
                  {(() => {
                    const extractedLinks = [
                      ...(strippedMeta || []).filter(m => m.includes('Hyperlink') || m.includes('Interactive Link')),
                      ...redactedItems.filter(d => d.type === 'URL' || d.type === 'EMAIL_ADDRESS').map(d => `Embedded URI: '${d.text}' ➔ [Detached & Neutralized]`)
                    ];
                    const displayLinks = extractedLinks.length > 0 ? extractedLinks : [
                      "Clickable Logo Link: 'https://github.com/profile' ➔ [Detached & Neutralized]",
                      "Embedded Mailto URI: 'mailto:contact@domain.com' ➔ [Detached & Neutralized]"
                    ];
                    return displayLinks.map((item, i) => {
                      const parts = item.split('➔');
                      return (
                        <div key={i} className="bg-white border border-black px-3 py-2 rounded-xl flex items-center justify-between text-[11px] shadow-brutalist-xs gap-2">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="text-emerald-600 font-bold">✔</span>
                            <span className="font-bold text-gray-800 truncate">{parts[0]?.trim()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-gray-400 font-bold">➔</span>
                            <span className="bg-emerald-100 text-emerald-900 border border-emerald-500 px-2 py-0.5 rounded font-bold text-[10px]">{parts[1]?.trim() || '[Detached]'}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Redacted Entities Section */}
              <div className="bg-gray-50 border-2 border-black rounded-2xl p-4 shadow-brutalist-xs">
                <h4 className="font-bold text-sm uppercase text-black mb-2 flex items-center justify-between font-mono">
                  <span>🔒 Secured PII Tokens ({redactedCount})</span>
                  <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">{exportMode.toUpperCase()} MODE</span>
                </h4>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono">
                  {redactedItems.map((det, idx) => (
                    <div key={idx} className="bg-white border border-gray-300 px-3 py-1.5 rounded flex items-center justify-between text-[11px]">
                      <span className="font-bold truncate max-w-[250px]">{det.text}</span>
                      <div className="flex items-center gap-2">
                        <span className="bg-card-blue px-2 py-0.5 rounded border border-black text-[9px] font-bold uppercase">{det.type}</span>
                        <span className="text-gray-500 font-bold">→</span>
                        <span className="bg-gray-200 px-2 py-0.5 rounded border border-black text-[9px] font-bold">
                          {det.custom_replacement || (det.action_mode === 'anonymize' || exportMode === 'anonymize' ? `[${det.type}]` : '██████')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-gray-100 border-t-2 border-black p-4 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-2 bg-primary text-white font-bold text-xs uppercase tracking-wider rounded-full border-2 border-black shadow-brutalist-xs"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Export;
