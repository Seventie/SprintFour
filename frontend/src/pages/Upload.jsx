import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { UploadCloud, File, AlertCircle, FolderPlus, X, FileText, Shield } from 'lucide-react';
import axios from 'axios';
import { useReview } from '../context/ReviewContext';

const STAGES = [
  { label: 'Parsing Documents', icon: 'description' },
  { label: 'Detecting PII Entities', icon: 'search' },
  { label: 'Classifying Confidence', icon: 'psychology' },
  { label: 'Generating Report', icon: 'analytics' },
];

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { dispatch } = useReview();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles) => {
    const allowed = ['.txt', '.pdf', '.docx'];
    const valid = newFiles.filter(f => allowed.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (valid.length < newFiles.length) {
      setError(`${newFiles.length - valid.length} file(s) skipped — only TXT, PDF, DOCX supported.`);
      setTimeout(() => setError(null), 4000);
    }
    setFiles(prev => [...prev, ...valid]);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const getFileIcon = (name) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return 'picture_as_pdf';
    if (lower.endsWith('.docx')) return 'article';
    return 'description';
  };

  const getFileTypeBadge = (name) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return { label: 'PDF', color: 'bg-red-50 text-red-600 border-red-200' };
    if (lower.endsWith('.docx')) return { label: 'DOCX', color: 'bg-blue-50 text-blue-600 border-blue-200' };
    return { label: 'TXT', color: 'bg-gray-50 text-gray-600 border-gray-200' };
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadStage(0);
    setError(null);

    // Simulate progressive stage updates
    const stageInterval = setInterval(() => {
      setUploadStage(prev => {
        if (prev < STAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(stageInterval);
      setUploadStage(STAGES.length - 1);
      
      // Brief pause to show final stage
      await new Promise(r => setTimeout(r, 600));
      
      dispatch({ type: 'LOAD_SESSION', payload: response.data });
      navigate('/review');
    } catch (err) {
      clearInterval(stageInterval);
      console.error(err);
      setIsUploading(false);
      setError('Upload failed. Make sure the backend is running on port 8000.');
    }
  };

  return (
    <PageWrapper>
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-3xl mt-16 mb-20">
        
        {/* Processing Overlay */}
        {isUploading && (
          <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-in" style={{opacity: 1}}>
            <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center mb-8 shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-2 tracking-tight">Analyzing Documents</h2>
            <p className="text-sm text-gray-500 mb-10">Running PII detection engine...</p>
            
            <div className="w-80 space-y-3">
              {STAGES.map((stage, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                    i < uploadStage ? 'bg-emerald-50 border border-emerald-200' :
                    i === uploadStage ? 'bg-gray-50 border border-gray-200 progress-pulse' :
                    'bg-white border border-gray-100 opacity-40'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    i < uploadStage ? 'bg-emerald-500' :
                    i === uploadStage ? 'bg-black' : 'bg-gray-200'
                  }`}>
                    {i < uploadStage ? (
                      <span className="material-symbols-outlined text-white text-[14px]">check</span>
                    ) : i === uploadStage ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" style={{animation: 'spin 0.8s linear infinite'}}></div>
                    ) : (
                      <span className="material-symbols-outlined text-gray-400 text-[14px]">{stage.icon}</span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${i <= uploadStage ? 'text-[#1a1a1a]' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10 animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3 text-[#1a1a1a]">
            Upload Documents
          </h1>
          <p className="text-base text-gray-500 max-w-lg mx-auto">
            Drag and drop files or browse to begin PII detection and redaction analysis.
          </p>
        </div>

        {/* Drop Zone */}
        <div 
          className={`w-full p-12 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 animate-fade-in-up delay-100 ${
            isDragging 
              ? 'border-black bg-gray-50 scale-[1.01] shadow-lg' 
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
          }`}
          style={{opacity: 1}}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 ${isDragging ? 'bg-black' : 'bg-gray-100'}`}>
            <UploadCloud className={`w-7 h-7 transition-colors duration-300 ${isDragging ? 'text-white' : 'text-gray-400'}`} />
          </div>
          <p className="text-lg font-semibold mb-1 text-[#1a1a1a]">
            {isDragging ? 'Drop files here' : 'Drag and drop documents'}
          </p>
          <p className="text-xs text-gray-400 mb-6 uppercase tracking-wider font-medium">
            PDF · DOCX · TXT — Max 50MB per file
          </p>
          
          <div className="flex gap-3">
            <input 
              ref={fileInputRef}
              type="file" 
              multiple 
              id="file-upload" 
              className="hidden" 
              onChange={handleFileChange}
              accept=".txt,.pdf,.docx"
            />
            <label 
              htmlFor="file-upload"
              className="px-6 py-2.5 bg-white text-[#1a1a1a] border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <File className="w-4 h-4" /> Browse Files
            </label>

            <input 
              type="file" 
              webkitdirectory="true" 
              directory="true" 
              multiple
              id="folder-upload" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <label 
              htmlFor="folder-upload"
              className="px-6 py-2.5 bg-white text-[#1a1a1a] border border-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" /> Browse Folder
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2 animate-slide-up" style={{opacity: 1}}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* File Queue */}
        {files.length > 0 && (
          <div className="w-full mt-8 animate-fade-in-up" style={{opacity: 1}}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Queue ({files.length} {files.length === 1 ? 'file' : 'files'})
              </h3>
              <button 
                onClick={() => setFiles([])}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
            
            <ul className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
              {files.map((file, idx) => {
                const badge = getFileTypeBadge(file.name);
                return (
                  <li 
                    key={idx} 
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 group"
                  >
                    <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-gray-500 text-[18px]">{getFileIcon(file.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm text-[#1a1a1a] truncate block">{file.name}</span>
                      <span className="text-[10px] text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <button 
                      onClick={() => removeFile(idx)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
            
            <div className="flex justify-center">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-10 py-3.5 bg-[#121212] text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                {isUploading ? 'Analyzing...' : 'Start Redaction Analysis'}
              </button>
            </div>
          </div>
        )}
        
        {/* Privacy Notice */}
        <div className="mt-10 flex items-center justify-center gap-2.5 text-xs text-gray-400 max-w-md mx-auto text-center animate-fade-in-up delay-300" style={{opacity: 1}}>
          <AlertCircle className="w-4 h-4 shrink-0 opacity-60" />
          <p>All processing happens within this session. No data is stored persistently or transmitted externally.</p>
        </div>
      </main>
    </PageWrapper>
  );
};

export default Upload;
