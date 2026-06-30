import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { UploadCloud, File, AlertCircle, FolderPlus, X, Shield, Sparkles } from 'lucide-react';
import axios from 'axios';
import { useReview } from '../context/ReviewContext';

const STAGES = [
  { label: 'Parsing Documents', icon: 'description' },
  { label: 'Tokenizing with spaCy NLP', icon: 'search' },
  { label: 'Aligning Word Boundaries', icon: 'psychology' },
  { label: 'Generating Redaction Workspace', icon: 'analytics' },
];

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [fileModes, setFileModes] = useState({});
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
    if (lower.endsWith('.pdf')) return { label: 'PDF', color: 'bg-card-orange text-black border-black' };
    if (lower.endsWith('.docx')) return { label: 'DOCX', color: 'bg-card-blue text-black border-black' };
    return { label: 'TXT', color: 'bg-card-purple text-black border-black' };
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    setUploadStage(0);
    setError(null);

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
    formData.append('file_modes', JSON.stringify(fileModes));

    try {
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(stageInterval);
      setUploadStage(STAGES.length - 1);
      
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
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-4xl mt-12 mb-20">
        
        {/* Processing Overlay */}
        {isUploading && (
          <div className="fixed inset-0 bg-aura-cream/95 dark:bg-background-dark/95 backdrop-blur-md z-50 flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-primary border-2 border-black flex items-center justify-center mb-8 shadow-brutalist animate-bounce">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-display font-bold text-black dark:text-white mb-2 tracking-tight">Anonymizing Documents</h2>
            <p className="text-lg font-hand text-primary mb-10">Splitting tokens & applying spaCy boundary alignment...</p>
            
            <div className="w-96 space-y-4">
              {STAGES.map((stage, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 border-black transition-all duration-500 ${
                    i < uploadStage ? 'bg-card-yellow shadow-retro' :
                    i === uploadStage ? 'bg-white dark:bg-card-dark shadow-brutalist scale-105' :
                    'bg-white/40 dark:bg-card-dark/40 border-gray-400 opacity-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center shrink-0 ${
                    i < uploadStage ? 'bg-primary text-white' :
                    i === uploadStage ? 'bg-secondary text-black animate-spin' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {i < uploadStage ? (
                      <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    ) : i === uploadStage ? (
                      <Sparkles className="w-4 h-4" />
                    ) : (
                      <span className="material-symbols-outlined text-[16px]">{stage.icon}</span>
                    )}
                  </div>
                  <span className="text-base font-bold text-black dark:text-white">
                    {stage.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border-2 border-black bg-card-purple mb-4 shadow-brutalist-sm">
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Workspace Ingestion</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight mb-3 text-black dark:text-white">
            Upload Documents
          </h1>
          <p className="text-xl font-hand text-primary max-w-lg mx-auto">
            Drop files to divide tokens with spaCy & detect sensitive data.
          </p>
        </div>

        {/* Drop Zone */}
        <div 
          className={`w-full p-14 border-2 border-black rounded-[3rem] flex flex-col items-center justify-center transition-all duration-300 ${
            isDragging 
              ? 'bg-card-orange scale-[1.02] shadow-brutalist-hover' 
              : 'bg-card-yellow hover:shadow-brutalist shadow-retro'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-20 h-20 bg-white rounded-3xl border-2 border-black shadow-retro flex items-center justify-center mb-6">
            <UploadCloud className="w-10 h-10 text-black" />
          </div>
          <p className="text-2xl font-display font-bold mb-2 text-black">
            {isDragging ? 'Drop files right here!' : 'Drag and drop documents here'}
          </p>
          <p className="text-xs font-bold text-gray-800 mb-8 uppercase tracking-widest">
            Supports PDF · DOCX · TXT (Max 50MB per file)
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
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
              className="px-8 py-3.5 bg-white text-black border-2 border-black rounded-full font-bold text-sm shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-2"
            >
              <File className="w-5 h-5" /> Browse Files
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
              className="px-8 py-3.5 bg-card-blue text-black border-2 border-black rounded-full font-bold text-sm shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-2"
            >
              <FolderPlus className="w-5 h-5" /> Browse Folder
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="w-full mt-6 px-6 py-4 bg-red-100 border-2 border-black rounded-2xl shadow-retro text-red-900 font-bold text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            {error}
          </div>
        )}

        {/* File Queue */}
        {files.length > 0 && (
          <div className="w-full mt-10 bg-white dark:bg-card-dark p-8 border-2 border-black rounded-3xl shadow-brutalist">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                <span className="bg-secondary px-2.5 py-0.5 rounded-full border border-black text-black">{files.length}</span> Ready for Redaction
              </h3>
              <button 
                onClick={() => setFiles([])}
                className="text-xs text-red-600 font-bold uppercase tracking-wider hover:underline"
              >
                Clear All
              </button>
            </div>
            
            <ul className="space-y-3 mb-8 max-h-60 overflow-y-auto pr-2">
              {files.map((file, idx) => {
                const badge = getFileTypeBadge(file.name);
                const currentMode = fileModes[idx] || 'redact';
                return (
                  <li 
                    key={idx} 
                    className="flex flex-wrap items-center gap-3 p-4 bg-aura-cream dark:bg-background-dark rounded-2xl border-2 border-black shadow-retro-white group"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl border border-black flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-black text-[22px]">{getFileIcon(file.name)}</span>
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <span className="font-bold text-base text-black dark:text-white truncate block">{file.name}</span>
                      <span className="text-xs font-medium text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-white rounded-xl border-2 border-black p-0.5 shadow-brutalist-xs">
                        <button
                          type="button"
                          onClick={() => setFileModes(prev => ({ ...prev, [idx]: 'redact' }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${currentMode === 'redact' ? 'bg-primary text-white shadow-sm' : 'text-gray-600 hover:text-black'}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">ink_eraser</span> Redact
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileModes(prev => ({ ...prev, [idx]: 'anonymize' }))}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${currentMode === 'anonymize' ? 'bg-secondary text-black shadow-sm' : 'text-gray-600 hover:text-black'}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">masks</span> Anonymize
                        </button>
                      </div>
                      <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border-2 ${badge.color}`}>
                        {badge.label}
                      </span>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            
            <div className="flex justify-center">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-12 py-4 bg-primary text-white text-lg rounded-full border-2 border-black font-bold shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                <Shield className="w-5 h-5" />
                {isUploading ? 'Analyzing...' : 'Start Redaction Analysis'}
              </button>
            </div>
          </div>
        )}
      </main>
    </PageWrapper>
  );
};

export default Upload;
