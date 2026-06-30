import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import * as XLSX from 'xlsx';

const ExportDocViewer = ({ blob, fileType, filename }) => {
  const docxContainerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [textContent, setTextContent] = useState('');
  const [pdfUrl, setPdfUrl] = useState(null);

  const cleanType = (fileType || '').toString().toLowerCase();
  const cleanName = (filename || '').toString().toLowerCase();
  const mimeType = (blob?.type || '').toLowerCase();

  const isPdf = cleanType === 'pdf' || cleanName.endsWith('.pdf') || mimeType.includes('pdf');
  const isDocx = cleanType === 'docx' || cleanName.endsWith('.docx') || mimeType.includes('wordprocessingml');
  const isExcel = cleanType === 'xlsx' || cleanType === 'xls' || cleanName.endsWith('.xlsx') || cleanName.endsWith('.xls') || mimeType.includes('spreadsheetml') || mimeType.includes('excel');
  const isCsv = cleanType === 'csv' || cleanName.endsWith('.csv') || mimeType.includes('csv');

  useEffect(() => {
    if (!blob) return;
    setLoading(true);
    setError(null);

    if (isPdf) {
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      setLoading(false);
      return () => URL.revokeObjectURL(url);
    } else if (isDocx) {
      // We set loading false so the DOM container mounts for docx.renderAsync
      setLoading(false);
    } else if (isExcel || isCsv) {
      blob.arrayBuffer().then((buffer) => {
        try {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const parsedSheets = workbook.SheetNames.map((name) => {
            const worksheet = workbook.Sheets[name];
            const html = XLSX.utils.sheet_to_html(worksheet, { id: 'spreadsheet-table' });
            return { name, html };
          });
          setSheets(parsedSheets);
          setActiveSheetIdx(0);
          setLoading(false);
        } catch (err) {
          console.error('Spreadsheet parse error:', err);
          setError('Failed to parse spreadsheet file.');
          setLoading(false);
        }
      });
    } else {
      blob.text().then((txt) => {
        setTextContent(txt);
        setLoading(false);
      }).catch(() => {
        setError('Failed to read text preview.');
        setLoading(false);
      });
    }
  }, [blob, fileType, filename, isPdf, isDocx, isExcel, isCsv]);

  useEffect(() => {
    if (isDocx && !loading && docxContainerRef.current && blob) {
      docxContainerRef.current.innerHTML = '';
      docx.renderAsync(blob, docxContainerRef.current)
        .catch((err) => {
          console.error('DOCX render error:', err);
          setError('Failed to render DOCX preview.');
        });
    }
  }, [isDocx, loading, blob]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12">
        <div className="w-10 h-10 border-4 border-black border-t-primary rounded-full animate-spin mb-4"></div>
        <span className="font-mono font-bold text-xs uppercase tracking-widest text-black">Rendering Clean Document Preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border-2 border-black rounded-3xl text-center max-w-md mx-auto my-12 shadow-brutalist">
        <span className="material-symbols-outlined text-red-600 text-[32px] mb-2">error</span>
        <h4 className="font-bold text-sm text-red-900 mb-1">{error}</h4>
        <p className="text-xs text-red-700">The file has been processed cleanly and is ready for download.</p>
      </div>
    );
  }

  if (isPdf && pdfUrl) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-100">
        <div className="bg-card-blue border-b-2 border-black px-4 py-2 text-xs font-bold text-black flex justify-between items-center font-mono uppercase tracking-wider shrink-0">
          <span>📄 Native PDF Layout Render</span>
          <span className="bg-white px-2 py-0.5 rounded border border-black text-[10px]">Sanitized & Ready</span>
        </div>
        <object data={`${pdfUrl}#toolbar=0`} type="application/pdf" className="w-full flex-1 border-none min-h-[650px]">
          <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none min-h-[650px]" title="PDF Preview" />
        </object>
      </div>
    );
  }

  if (isDocx) {
    return (
      <div className="w-full h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 p-8 flex justify-center">
        <div className="max-w-4xl w-full bg-white shadow-brutalist border-2 border-black rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
          <div className="bg-card-blue border-b-2 border-black px-6 py-3 text-xs font-bold text-black flex justify-between items-center font-mono uppercase tracking-wider shrink-0">
            <span>📝 Microsoft Word Layout Preview</span>
            <span className="bg-white px-2 py-0.5 rounded border border-black text-[10px]">DOM Rendered</span>
          </div>
          <div ref={docxContainerRef} className="p-8 docx-preview-wrapper font-sans text-gray-900 overflow-x-auto flex-1"></div>
        </div>
      </div>
    );
  }

  if ((isExcel || isCsv) && sheets.length > 0) {
    return (
      <div className="w-full h-full overflow-y-auto bg-gray-100 dark:bg-gray-800 p-8 flex flex-col items-center">
        <div className="max-w-5xl w-full bg-white shadow-brutalist border-2 border-black rounded-3xl overflow-hidden flex flex-col">
          <div className="bg-card-blue border-b-2 border-black px-6 py-3 text-xs font-bold text-black flex justify-between items-center font-mono uppercase tracking-wider">
            <span>📊 Interactive Spreadsheet Grid</span>
            <div className="flex gap-1">
              {sheets.map((sheet, i) => (
                <button
                  key={sheet.name}
                  onClick={() => setActiveSheetIdx(i)}
                  className={`px-3 py-1 rounded-xl font-bold text-xs border border-black transition-all ${activeSheetIdx === i ? 'bg-primary text-white shadow-brutalist-xs' : 'bg-white text-black hover:bg-gray-100'}`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          </div>
          <div className="p-6 overflow-x-auto flex-1 spreadsheet-table-container">
            <style>{`
              .spreadsheet-table-container table {
                border-collapse: collapse;
                width: 100%;
                font-family: monospace;
                font-size: 12px;
              }
              .spreadsheet-table-container th, .spreadsheet-table-container td {
                border: 1px solid #000;
                padding: 6px 10px;
                text-align: left;
              }
              .spreadsheet-table-container tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .spreadsheet-table-container tr:hover {
                background-color: #fef08a;
              }
            `}</style>
            <div dangerouslySetInnerHTML={{ __html: sheets[activeSheetIdx]?.html || '' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-8 flex justify-center bg-gray-100">
      <div className="max-w-3xl w-full bg-white p-10 shadow-brutalist border-2 border-black rounded-3xl font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {textContent}
      </div>
    </div>
  );
};

export default ExportDocViewer;
