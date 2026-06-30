import React, { useState } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const InteractivePdfViewer = ({ fileUrl, searchQuery }) => {
  const [numPages, setNumPages] = useState(null);
  const [useNative, setUseNative] = useState(false);
  const [pageWidth, setPageWidth] = useState(520);

  function highlightPattern(text, pattern) {
    if (!pattern || !text) return text;
    try {
      const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const splitText = text.split(new RegExp(`(${escapedPattern})`, 'gi'));
      return splitText.map((part, index) =>
        part.toLowerCase() === pattern.toLowerCase() ? (
          <mark key={index} className="bg-yellow-300 text-black font-extrabold px-1 rounded shadow-[1px_1px_0px_0px_#000] border border-black animate-pulse">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  }

  if (useNative) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="bg-card-yellow border-b-2 border-black px-4 py-1.5 text-xs font-bold flex justify-between items-center shrink-0">
          <span>Native Browser PDF Viewer</span>
          <button onClick={() => setUseNative(false)} className="text-[10px] bg-white hover:bg-gray-100 px-2.5 py-1 rounded-full border border-black shadow-brutalist-xs">
            Switch to Interactive Highlight Mode
          </button>
        </div>
        <iframe
          src={`${fileUrl}#toolbar=0${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`}
          className="w-full flex-1 border-none"
          title="Original PDF Preview"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 dark:bg-gray-800 overflow-hidden">
      <div className="bg-card-yellow border-b-2 border-black px-4 py-1.5 text-xs font-bold flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <span>Interactive PDF Highlight Engine</span>
          {searchQuery && (
            <span className="bg-white text-black px-2 py-0.5 rounded-full border border-black font-mono text-[10px]">
              Highlighting: "{searchQuery}"
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPageWidth(w => Math.max(300, w - 50))} className="p-1 bg-white hover:bg-gray-100 border border-black rounded shadow-brutalist-xs text-xs" title="Zoom Out">-</button>
          <span className="font-mono text-[10px] bg-white px-2 py-0.5 border border-black rounded">{pageWidth}px</span>
          <button onClick={() => setPageWidth(w => Math.min(900, w + 50))} className="p-1 bg-white hover:bg-gray-100 border border-black rounded shadow-brutalist-xs text-xs" title="Zoom In">+</button>
          <button onClick={() => setUseNative(true)} className="text-[10px] bg-white hover:bg-gray-100 px-2.5 py-1 rounded-full border border-black shadow-brutalist-xs ml-2">
            Native Mode
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center gap-6">
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-black shadow-brutalist mt-10">
              <div className="w-8 h-8 border-4 border-black border-t-primary rounded-full animate-spin mb-3"></div>
              <span className="font-mono font-bold text-xs">Rendering PDF Layout...</span>
            </div>
          }
          error={
            <div className="p-6 bg-white border-2 border-black rounded-3xl text-center">
              <p className="text-xs font-bold text-red-600 mb-2">Could not render custom PDF view.</p>
              <button onClick={() => setUseNative(true)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full border border-black shadow-retro">
                Open Native Viewer
              </button>
            </div>
          }
        >
          {Array.from(new Array(numPages || 1), (el, index) => (
            <div key={`page_${index + 1}`} className="bg-white border-2 border-black shadow-brutalist rounded-xl overflow-hidden mb-4">
              <Page
                pageNumber={index + 1}
                width={pageWidth}
                customTextRenderer={({ str }) => highlightPattern(str, searchQuery)}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
};

export default InteractivePdfViewer;
