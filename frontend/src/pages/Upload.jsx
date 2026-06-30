import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import axios from 'axios';

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      // Setup backend call (mocking endpoint logic for now as backend route is a stub)
      await axios.post('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setIsUploading(false);
      navigate('/review');
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      alert('Make sure backend is running on port 8000');
    }
  };

  return (
    <PageWrapper>
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-3xl mt-10 mb-20 animate-fade-in-up">
        <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">Workspace Initialization</h1>
        <p className="text-brand-gray font-sans mb-8">Upload documents (TXT, DOCX, PDF) to begin redaction analysis.</p>

        <div 
          className={`w-full p-12 border-2 border-dashed rounded-none flex flex-col items-center justify-center transition-all duration-300 ${
            isDragging ? 'border-redaction-primary bg-redaction-primary/5' : 'border-outline-variant bg-white'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <UploadCloud className={`w-12 h-12 mb-4 ${isDragging ? 'text-redaction-primary' : 'text-brand-gray'}`} />
          <p className="text-lg font-medium mb-1 font-sans">Drag and drop documents here</p>
          <p className="text-sm text-text-muted font-mono mb-6">LIMIT: 50MB PER FILE</p>
          
          <input 
            type="file" 
            multiple 
            id="file-upload" 
            className="hidden" 
            onChange={handleFileChange}
            accept=".txt,.pdf,.docx"
          />
          <label 
            htmlFor="file-upload"
            className="px-6 py-2 bg-brand-black text-white font-mono text-sm uppercase tracking-wider cursor-pointer hover:bg-redaction-primary transition-colors duration-300"
          >
            Browse Files
          </label>
        </div>

        {files.length > 0 && (
          <div className="w-full mt-8 animate-fade-in-up">
            <h3 className="font-mono text-sm font-semibold uppercase tracking-wider mb-4 border-b border-brand-border pb-2">Queue ({files.length})</h3>
            <ul className="space-y-3 mb-6">
              {files.map((file, idx) => (
                <li key={idx} className="flex items-center gap-3 p-3 bg-white border border-brand-border">
                  <File className="w-5 h-5 text-brand-gray" />
                  <span className="font-sans text-sm flex-1 truncate">{file.name}</span>
                  <span className="font-mono text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
            
            <div className="flex justify-end">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-8 py-3 bg-brand-black text-white font-mono text-sm uppercase tracking-wider hover:bg-redaction-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Analyzing...' : 'Start Redaction'}
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex items-start gap-3 p-4 bg-surface-container border-l-4 border-outline-variant text-sm text-on-surface-variant font-sans w-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>Data Privacy Guarantee: All processing happens entirely within this workspace session. No data is stored persistently.</p>
        </div>
      </main>
    </PageWrapper>
  );
};

export default Upload;
