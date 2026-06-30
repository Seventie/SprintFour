import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { UploadCloud, File, AlertCircle, FolderPlus } from 'lucide-react';
import axios from 'axios';
import { useReview } from '../context/ReviewContext';

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();
  const { dispatch } = useReview();

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
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)]);
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
      const response = await axios.post('http://localhost:8000/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Load backend data into context
      dispatch({ type: 'LOAD_SESSION', payload: response.data });
      setIsUploading(false);
      navigate('/review');
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      alert('Upload failed. Make sure backend is running on port 8000 and accepting the files.');
    }
  };

  return (
    <PageWrapper>
      <main className="flex-1 flex flex-col items-center justify-center px-4 w-full max-w-3xl mt-20 mb-24 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-[#1a1a1a]">Workspace Initialization</h1>
        <p className="text-lg text-brand-gray mb-10 max-w-xl text-center">
          Upload documents or folders (TXT, DOCX, PDF) to begin redaction analysis.
        </p>

        <div 
          className={`w-full p-16 border-2 border-dashed rounded-[32px] flex flex-col items-center justify-center transition-all duration-300 ${
            isDragging ? 'border-[#121212] bg-[#f9fafb]' : 'border-[#e5e7eb] bg-white hover:border-[#121212]/50 hover:bg-[#f9fafb]/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-[#f1f5f9] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <UploadCloud className={`w-8 h-8 ${isDragging ? 'text-[#121212]' : 'text-brand-gray'}`} />
          </div>
          <p className="text-xl font-semibold mb-2 text-[#1a1a1a]">Drag and drop documents here</p>
          <p className="text-sm text-gray-500 mb-8">LIMIT: 50MB PER FILE</p>
          
          <div className="flex gap-4">
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
              className="px-8 py-3.5 bg-white text-[#121212] border border-[#e5e7eb] rounded-full font-semibold text-sm hover:bg-gray-50 transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm flex items-center gap-2"
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
              className="px-8 py-3.5 bg-white text-[#121212] border border-[#e5e7eb] rounded-full font-semibold text-sm hover:bg-gray-50 transition-all duration-300 hover:scale-105 cursor-pointer shadow-sm flex items-center gap-2"
            >
              <FolderPlus className="w-4 h-4" /> Browse Folder
            </label>
          </div>
        </div>

        {files.length > 0 && (
          <div className="w-full mt-10 animate-fade-in-up">
            <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-widest text-center">Queue ({files.length})</h3>
            <ul className="space-y-3 mb-8 max-w-xl mx-auto max-h-64 overflow-y-auto px-2">
              {files.map((file, idx) => (
                <li key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-[#e5e7eb]">
                  <div className="w-10 h-10 bg-[#f1f5f9] rounded-xl flex items-center justify-center shrink-0">
                    <File className="w-5 h-5 text-[#121212]" />
                  </div>
                  <span className="font-medium text-sm flex-1 truncate text-[#1a1a1a]">{file.name}</span>
                  <span className="text-xs text-gray-400 font-medium shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                </li>
              ))}
            </ul>
            
            <div className="flex justify-center">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="px-8 py-3.5 bg-[#121212] text-white rounded-full font-semibold text-sm hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isUploading ? 'Analyzing...' : 'Start Redaction'}
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-12 flex items-start justify-center gap-3 text-sm text-gray-500 max-w-md mx-auto text-center">
          <AlertCircle className="w-5 h-5 shrink-0 opacity-70" />
          <p>Data Privacy Guarantee: All processing happens entirely within this workspace session. No data is stored persistently.</p>
        </div>
      </main>
    </PageWrapper>
  );
};

export default Upload;
