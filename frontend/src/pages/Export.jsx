import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReview } from '../context/ReviewContext';
import { Download, ChevronLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

/* --- Animated Donut Chart Component --- */
const DonutChart = ({ segments, size = 140, strokeWidth = 14 }) => {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumulativeOffset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-chart">
      {/* Background ring */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
      {/* Segments */}
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const fraction = seg.value / total;
        const dashLength = fraction * circumference;
        const gapLength = circumference - dashLength;
        const offset = cumulativeOffset;
        cumulativeOffset += fraction;
        return (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dashLength} ${gapLength}`}
            strokeDashoffset={-offset * circumference}
            strokeLinecap="round"
            className="donut-segment"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        );
      })}
      {/* Center text */}
      <text x={center} y={center - 6} textAnchor="middle" className="text-2xl font-bold fill-[#1a1a1a]" style={{fontSize: '28px', fontWeight: 800}}>
        {total}
      </text>
      <text x={center} y={center + 14} textAnchor="middle" className="fill-gray-400" style={{fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em'}}>
        detections
      </text>
    </svg>
  );
};

/* --- Safety Score Component --- */
const SafetyScore = ({ score }) => {
  const getGrade = (s) => {
    if (s >= 95) return { letter: 'A+', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
    if (s >= 85) return { letter: 'A', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' };
    if (s >= 70) return { letter: 'B', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' };
    return { letter: 'C', color: 'text-red-500', bg: 'bg-red-50 border-red-200' };
  };
  const grade = getGrade(score);

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${grade.bg}`}>
      <div className={`text-3xl font-black ${grade.color}`}>{grade.letter}</div>
      <div>
        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">Safety Score</div>
        <div className="text-[10px] text-gray-500">
          {score >= 95 ? 'All PII addressed — safe to share'
            : score >= 85 ? 'Most PII addressed'
            : score >= 70 ? 'Several items need attention'
            : 'Significant PII remains unaddressed'}
        </div>
      </div>
    </div>
  );
};

const Export = () => {
  const { state, dispatch } = useReview();
  const { documents, detections, activeDocId } = state;
  const navigate = useNavigate();

  const [isExporting, setIsExporting] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [textPreviewContent, setTextPreviewContent] = useState(null);
  const [strippedMeta, setStrippedMeta] = useState([]);
  const [showMetaDetails, setShowMetaDetails] = useState(false);

  useEffect(() => {
    if (documents.length === 0) navigate('/upload');
  }, [documents, navigate]);

  const activeDoc = documents.find(d => d.doc_id === activeDocId);
  const activeDetections = activeDoc ? (detections[activeDoc.doc_id] || []) : [];

  const redactedItems = activeDetections.filter(d => d.status === 'redacted' || d.status === 'added');
  const redactedCount = redactedItems.length;
  const missedCount = activeDetections.filter(d => d.status === 'missed').length;
  const dismissedCount = activeDetections.filter(d => d.status === 'dismissed').length;
  const flaggedCount = activeDetections.filter(d => d.status === 'flagged').length;
  const totalCount = activeDetections.length;

  // Safety score calculation
  const safetyScore = useMemo(() => {
    if (totalCount === 0) return 100;
    const addressed = redactedCount + dismissedCount;
    return Math.round((addressed / totalCount) * 100);
  }, [redactedCount, dismissedCount, totalCount]);

  // Type breakdown
  const typeBreakdown = useMemo(() => {
    const breakdown = {};
    redactedItems.forEach(d => { breakdown[d.type] = (breakdown[d.type] || 0) + 1; });
    return Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  }, [redactedItems]);

  // Confidence distribution
  const confDistribution = useMemo(() => {
    const high = redactedItems.filter(d => d.confidence >= 0.85).length;
    const medium = redactedItems.filter(d => d.confidence >= 0.5 && d.confidence < 0.85).length;
    const low = redactedItems.filter(d => d.confidence < 0.5).length;
    return { high, medium, low };
  }, [redactedItems]);

  // Donut chart data
  const donutSegments = useMemo(() => [
    { value: redactedCount, color: '#10b981', label: 'Redacted' },
    { value: dismissedCount, color: '#9ca3af', label: 'Dismissed' },
    { value: missedCount, color: '#ef4444', label: 'Pending' },
    { value: flaggedCount, color: '#a855f7', label: 'Flagged' },
  ], [redactedCount, dismissedCount, missedCount, flaggedCount]);

  // Max type count for bar scaling
  const maxTypeCount = typeBreakdown.length > 0 ? Math.max(...typeBreakdown.map(([, c]) => c)) : 1;

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
  }, [activeDocId, missedCount]);

  const handleDownload = async () => {
    if (!activeDoc || missedCount > 0) return;

    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.setAttribute('download', `redacted_${activeDoc.filename}`);
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
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `redacted_${activeDoc.filename}`);
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
    <div className="flex h-screen w-full overflow-hidden bg-[#f5f5f7] font-sans">

      {/* LEFT: Document Preview — bigger pane */}
      <div className="pane-left flex-[1.7] h-full flex flex-col bg-white border-r border-gray-200 relative">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 bg-white shrink-0 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1a1a1a] tracking-tight">Redacted Output</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                {activeDoc?.filename} · {activeDoc?.file_type?.toUpperCase()} · {redactedCount} entities removed
              </p>
            </div>
          </div>
          {missedCount === 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Cleared for Sharing</span>
            </div>
          )}
        </div>

        {/* Preview Area */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {missedCount > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <AlertTriangle className="w-10 h-10 mb-3 text-amber-400 opacity-50" />
              <p className="text-sm font-medium">Resolve all pending items to unlock preview</p>
              <button onClick={() => navigate('/review')} className="mt-4 px-4 py-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:opacity-90 transition-all shadow-sm">
                Return to Review
              </button>
            </div>
          ) : isLoadingPreview ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full mb-3" style={{animation: 'spin 0.8s linear infinite'}}></div>
              <p className="font-mono text-xs uppercase tracking-widest progress-pulse">Generating Redacted {activeDoc?.file_type?.toUpperCase()}...</p>
            </div>
          ) : activeDoc?.file_type === 'pdf' && previewUrl ? (
            /* PDF: show actual redacted PDF in iframe — full screen */
            <iframe
              src={`${previewUrl}#toolbar=0&navpanes=0`}
              className="w-full h-full border-none"
              title="Redacted PDF Preview"
            />
          ) : textPreviewContent ? (
            /* TXT/DOCX: show redacted text */
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto bg-white p-10 shadow-sm border border-gray-200 rounded-lg min-h-full">
                {activeDoc?.file_type === 'docx' && (
                  <div className="bg-blue-50 text-blue-600 text-[10px] text-center py-2 font-bold border-b border-blue-100 flex items-center justify-center gap-1.5 rounded-t-lg -mt-10 -mx-10 mb-8 uppercase tracking-wider">
                    <FileText className="w-3 h-3" /> Text Preview — Download for full DOCX formatting
                  </div>
                )}
                <pre className="text-[14px] text-[#1a1a1a] leading-[1.8] whitespace-pre-wrap font-sans">{textPreviewContent}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              No preview available
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Controls Panel */}
      <aside className="pane-right flex-1 h-full flex flex-col bg-[#f0eef5] overflow-hidden">
        {/* Header */}
        <div className="p-4 flex items-center gap-3 border-b border-[#ddd8e8] h-12 shrink-0">
          <button onClick={() => navigate('/review')} className="p-1.5 hover:bg-violet-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#6b5f8a]" />
          </button>
          <h1 className="font-bold tracking-tight text-[15px] text-[#333]">Export Hub</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Document List */}
          <div>
            <span className="text-[9px] font-bold text-[#8a7fb0] tracking-widest uppercase block mb-2">Documents</span>
            <div className="space-y-1">
              {documents.map((doc) => {
                const docDets = detections[doc.doc_id] || [];
                const missed = docDets.filter(d => d.status === 'missed').length;
                const redacted = docDets.filter(d => d.status === 'redacted' || d.status === 'added').length;
                return (
                  <button key={doc.doc_id} onClick={() => dispatch({ type: 'SET_ACTIVE_DOC', payload: doc.doc_id })}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left ${activeDocId === doc.doc_id ? 'bg-white border border-[#ddd8e8] shadow-sm' : 'hover:bg-white/50'}`}>
                    <span className="material-symbols-outlined text-[16px] text-[#8a7fb0]">
                      {doc.file_type === 'pdf' ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium text-xs text-[#333]">{doc.filename}</div>
                      <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${missed > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {missed > 0 ? `${missed} pending` : `${redacted} secured`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Status */}
          {activeDoc && (
            <>
              {/* Safety Score */}
              <SafetyScore score={safetyScore} />

              {/* Donut Chart */}
              <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm">
                <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-3">Detection Summary</span>
                <div className="flex items-center gap-4">
                  <DonutChart segments={donutSegments} size={120} strokeWidth={12} />
                  <div className="space-y-2 flex-1">
                    {donutSegments.filter(s => s.value > 0).map((seg, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{backgroundColor: seg.color}}></span>
                        <span className="text-[11px] text-gray-600 flex-1">{seg.label}</span>
                        <span className="text-[11px] font-bold text-[#333]">{seg.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-xl text-center border border-[#ddd8e8] shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xl font-bold text-emerald-600">{redactedCount}</div>
                  <div className="text-[8px] text-[#8a7fb0] uppercase font-bold tracking-wider mt-0.5">Redacted</div>
                </div>
                <div className="bg-white p-3 rounded-xl text-center border border-[#ddd8e8] shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xl font-bold text-gray-400">{dismissedCount}</div>
                  <div className="text-[8px] text-[#8a7fb0] uppercase font-bold tracking-wider mt-0.5">Dismissed</div>
                </div>
                <div className="bg-white p-3 rounded-xl text-center border border-[#ddd8e8] shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-xl font-bold text-[#333]">{totalCount}</div>
                  <div className="text-[8px] text-[#8a7fb0] uppercase font-bold tracking-wider mt-0.5">Total</div>
                </div>
              </div>

              {/* Type Breakdown with Bars */}
              {typeBreakdown.length > 0 && (
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm">
                  <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-3">Redaction by Type</span>
                  <div className="space-y-2.5">
                    {typeBreakdown.map(([type, count]) => (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-gray-600">{type}</span>
                          <span className="text-[10px] font-bold text-emerald-600">{count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-400 to-indigo-500 rounded-full transition-all duration-700"
                            style={{width: `${(count / maxTypeCount) * 100}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence Distribution */}
              {redactedCount > 0 && (
                <div className="bg-white border border-[#ddd8e8] rounded-xl p-4 shadow-sm">
                  <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-3">Confidence Distribution</span>
                  <div className="flex gap-2">
                    <div className="flex-1 text-center p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                      <div className="text-lg font-bold text-emerald-600">{confDistribution.high}</div>
                      <div className="text-[8px] text-emerald-500 font-bold uppercase">High</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="text-lg font-bold text-amber-600">{confDistribution.medium}</div>
                      <div className="text-[8px] text-amber-500 font-bold uppercase">Medium</div>
                    </div>
                    <div className="flex-1 text-center p-2 bg-red-50 rounded-lg border border-red-100">
                      <div className="text-lg font-bold text-red-500">{confDistribution.low}</div>
                      <div className="text-[8px] text-red-400 font-bold uppercase">Low</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata Stripping Report */}
              <div className="bg-white border border-[#ddd8e8] rounded-xl p-3 shadow-sm">
                <button
                  onClick={() => setShowMetaDetails(!showMetaDetails)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-violet-500" />
                    <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest">Metadata Protection</span>
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-gray-400">{showMetaDetails ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showMetaDetails && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                    {strippedMeta.length > 0 ? (
                      strippedMeta.map((field, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <EyeOff className="w-3 h-3 text-emerald-500" />
                          <span className="text-gray-600 capitalize">{field.replace(/_/g, ' ')}</span>
                          <span className="text-emerald-600 font-bold ml-auto">Stripped</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-500">
                        {activeDoc?.file_type === 'pdf' ? 'PDF metadata (author, creator, title) will be removed on export.'
                          : activeDoc?.file_type === 'docx' ? 'DOCX properties, comments, and tracked changes will be stripped.'
                          : 'Plain text files contain no metadata.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Output format note */}
              <div className="bg-white border border-[#ddd8e8] rounded-xl p-3 shadow-sm">
                <span className="text-[9px] text-[#8a7fb0] font-bold uppercase tracking-widest block mb-1">Output Format</span>
                <p className="text-[11px] text-gray-600">
                  {activeDoc.file_type === 'pdf'
                    ? '📄 Redacted PDF — PII replaced with black boxes. Metadata stripped. Original formatting preserved.'
                    : activeDoc.file_type === 'docx'
                    ? '📄 Redacted DOCX — PII replaced with [REDACTED]. Comments and metadata stripped.'
                    : '📄 Redacted TXT — PII replaced with [REDACTED] markers.'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Download Button — pinned to bottom */}
        {activeDoc && (
          <div className="p-5 pt-0">
            <button
              onClick={handleDownload}
              disabled={isExporting || missedCount > 0}
              className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all duration-300 shadow-sm ${
                downloadComplete
                  ? 'bg-emerald-500 text-white scale-[1.02] shadow-emerald-200 shadow-lg'
                  : missedCount > 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:opacity-90 hover:scale-[1.01] hover:shadow-lg'
              } disabled:hover:scale-100`}
            >
              {downloadComplete ? (
                <><CheckCircle className="w-4 h-4" /> Downloaded Successfully</>
              ) : (
                <><Download className="w-4 h-4" /> {isExporting ? 'Generating...' : missedCount > 0 ? 'Resolve Pending Items' : `Download Redacted ${activeDoc.file_type.toUpperCase()}`}</>
              )}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default Export;
