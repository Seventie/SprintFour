import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PageWrapper from '../components/layout/PageWrapper';
import { UploadCloud, File, AlertCircle, FolderPlus, X, Shield, Sparkles, Plus, Settings } from 'lucide-react';
import axios from 'axios';
import { useReview } from '../context/ReviewContext';

const POLICY_DEFAULTS = {
  healthcare: ['person', 'full_name', 'date_of_birth', 'national_id_number', 'address', 'phone_number', 'email', 'sensitive_date'],
  finance: ['person', 'bank_account', 'account_number', 'routing_number', 'iban', 'payment_card', 'card_number', 'card_expiry', 'card_cvv', 'tax_id', 'tax_number'],
  government_legal: ['person', 'full_name', 'government_id', 'national_id_number', 'passport_number', 'drivers_license_number', 'license_number', 'address', 'sensitive_date'],
  tech_credentials: ['username', 'password', 'secret', 'api_key', 'access_token', 'recovery_code', 'ip_address', 'account_id', 'sensitive_account_id'],
  mixed_general: ['person', 'full_name', 'email', 'phone_number', 'address', 'date_of_birth'],
  education: ['person', 'full_name', 'date_of_birth', 'email', 'phone_number', 'student_id', 'address'],
  hr_employment: ['person', 'full_name', 'employee_id', 'ssn', 'bank_account', 'phone_number', 'email', 'salary', 'performance_rating'],
  insurance: ['person', 'full_name', 'policy_number', 'claim_number', 'date_of_birth', 'address', 'phone_number', 'email', 'medical_condition']
};

const Upload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState([]);
  
  const [selectedPolicy, setSelectedPolicy] = useState('mixed_general');
  const [customLabels, setCustomLabels] = useState([...POLICY_DEFAULTS['mixed_general']]);
  const [newLabel, setNewLabel] = useState("");
  const [defaultMode, setDefaultMode] = useState('redact');

  const [localFolderPath, setLocalFolderPath] = useState("");

  const [isUploading, setIsUploading] = useState(false);
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
    const allowed = ['.txt', '.pdf', '.docx', '.csv'];
    const valid = newFiles.filter(f => allowed.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (valid.length < newFiles.length) {
      setError(`${newFiles.length - valid.length} file(s) skipped — only TXT, PDF, DOCX, CSV supported.`);
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
    if (lower.endsWith('.csv')) return 'table_chart';
    return 'description';
  };

  const selectPolicy = (polId) => {
    setSelectedPolicy(polId);
    setCustomLabels([...POLICY_DEFAULTS[polId]]);
  };

  const removeLabel = (lbl) => {
    setCustomLabels(prev => prev.filter(l => l !== lbl));
  };

  const addLabel = () => {
    if (newLabel.trim() && !customLabels.includes(newLabel.trim())) {
      setCustomLabels([...customLabels, newLabel.trim()]);
      setNewLabel("");
    }
  };

  const handleUpload = async () => {
    if (files.length === 0 && !localFolderPath.trim()) {
      setError("Please add files or specify a local folder path.");
      return;
    }
    
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('policy', selectedPolicy);
    formData.append('custom_labels', JSON.stringify(customLabels));
    formData.append('default_action_mode', defaultMode);

    try {
      let url = 'http://localhost:8000/api/batch/upload';
      if (localFolderPath.trim()) {
        url = 'http://localhost:8000/api/batch/upload_local';
        formData.append('folder_path', localFolderPath.trim());
      } else {
        files.forEach((file) => {
          formData.append('files', file);
        });
      }

      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      dispatch({ type: 'BATCH_STARTED', payload: response.data.documents });
      navigate('/review');
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      setError(err.response?.data?.detail || 'Batch upload failed. Check the folder path or backend connection.');
    }
  };

  return (
    <PageWrapper>
      <main className="flex-1 flex flex-col px-8 w-full max-w-[1700px] mx-auto mt-8 mb-20">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border-2 border-black bg-card-purple mb-4 shadow-brutalist-sm">
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Workspace Ingestion</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight mb-2 text-black dark:text-white">
            Upload Documents
          </h1>
          <p className="text-lg font-hand text-primary max-w-lg mx-auto">
            Drop files to divide tokens with spaCy & detect sensitive data.
          </p>
        </div>

        {error && (
          <div className="w-full mb-6 px-6 py-4 bg-red-100 border-2 border-black rounded-2xl shadow-retro text-red-900 font-bold text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            {error}
          </div>
        )}

        {/* 3-Column Horizontal Grid */}
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT COLUMN: Input & Upload (3 cols) */}
          <div className="xl:col-span-3 flex flex-col gap-6">
            <div 
              className={`w-full flex-1 p-8 border-2 border-black rounded-[2rem] flex flex-col items-center justify-center transition-all duration-300 ${
                isDragging 
                  ? 'bg-card-orange scale-[1.02] shadow-brutalist-hover' 
                  : 'bg-card-yellow hover:shadow-brutalist shadow-retro'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="w-16 h-16 bg-white rounded-2xl border-2 border-black shadow-retro flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-black" />
              </div>
              <p className="text-lg font-display font-bold mb-2 text-black text-center leading-tight">
                {isDragging ? 'Drop files right here!' : 'Drag & drop documents'}
              </p>
              <p className="text-[10px] font-bold text-gray-800 mb-6 uppercase tracking-widest text-center">
                PDF · DOCX · CSV · TXT
              </p>
              
              <input 
                ref={fileInputRef}
                type="file" 
                multiple 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".txt,.pdf,.docx,.csv"
              />
              <label 
                htmlFor="file-upload"
                className="px-6 py-3 bg-white text-black border-2 border-black rounded-full font-bold text-sm shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-2"
              >
                <File className="w-5 h-5" /> Browse
              </label>
            </div>

            {/* Local Folder Input */}
            <div className="w-full p-5 bg-card-blue/30 border-2 border-black rounded-[2rem] shadow-retro">
              <label className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-white flex items-center gap-2 mb-3">
                <FolderPlus className="w-4 h-4" /> Local Folder Path
              </label>
              <input 
                type="text" 
                value={localFolderPath}
                onChange={(e) => setLocalFolderPath(e.target.value)}
                placeholder="e.g. C:\Data"
                className="w-full px-4 py-2 border-2 border-black rounded-xl font-mono text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* MIDDLE COLUMN: Files & Action (5 cols) */}
          <div className="xl:col-span-5 flex flex-col gap-6">
            
            {/* File List */}
            <div className="flex-1 bg-white dark:bg-card-dark border-2 border-black rounded-[2rem] shadow-brutalist p-6 flex flex-col min-h-[300px] max-h-[400px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-black dark:text-white uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-secondary px-2 py-0.5 rounded-full border border-black text-black">{files.length}</span> Uploaded
                </h3>
                {files.length > 0 && (
                  <button 
                    onClick={() => setFiles([])}
                    className="text-[10px] text-red-600 font-bold uppercase tracking-wider hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {files.length === 0 ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 font-bold text-xs text-center">
                    <File className="w-8 h-8 mb-2 opacity-50" />
                    No files uploaded
                  </div>
                ) : (
                  files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-aura-cream dark:bg-background-dark rounded-xl border-2 border-black shadow-retro-white">
                      <div className="w-6 h-6 bg-white rounded-md border border-black flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-black text-[14px]">{getFileIcon(file.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs text-black dark:text-white truncate block">{file.name}</span>
                        <span className="text-[9px] font-medium text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <button 
                        onClick={() => removeFile(idx)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-4">
              <div className="flex bg-white rounded-2xl border-2 border-black p-1 shadow-brutalist-sm">
                <button
                  onClick={() => setDefaultMode('redact')}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                    defaultMode === 'redact' 
                      ? 'bg-primary text-white shadow-retro border-2 border-black' 
                      : 'text-gray-500 hover:text-black border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">ink_eraser</span>
                  Redact
                </button>
                <button
                  onClick={() => setDefaultMode('anonymize')}
                  className={`flex-1 py-2.5 rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 ${
                    defaultMode === 'anonymize' 
                      ? 'bg-secondary text-black shadow-retro border-2 border-black' 
                      : 'text-gray-500 hover:text-black border-2 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">masks</span>
                  Anonymize
                </button>
              </div>

              <button 
                onClick={handleUpload}
                disabled={isUploading || (files.length === 0 && !localFolderPath.trim())}
                className="w-full py-4 bg-primary text-white text-lg rounded-full border-2 border-black font-bold shadow-retro hover:shadow-retro-hover hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Shield className="w-5 h-5" />
                {isUploading ? 'Initializing...' : 'Start Engine'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Policy Engine (4 cols) */}
          <div className="xl:col-span-4 bg-white dark:bg-card-dark rounded-[2rem] border-2 border-black shadow-brutalist p-8 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-6">
              <Settings className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-display font-bold text-black dark:text-white">Policy Engine</h2>
            </div>
            
            <div className="flex-1 flex flex-col gap-6">
              {/* Policy Presets */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-white block">
                  Base Template
                </label>
                <div className="relative">
                  <select 
                    value={selectedPolicy}
                    onChange={(e) => selectPolicy(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-black font-bold text-sm bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer pr-10 shadow-retro-sm"
                  >
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="government_legal">Gov / Legal</option>
                    <option value="tech_credentials">Tech Secrets</option>
                    <option value="mixed_general">General / Mixed</option>
                    <option value="education">Education</option>
                    <option value="hr_employment">HR / Employment</option>
                    <option value="insurance">Insurance</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </div>
                </div>
              </div>

              {/* Custom Rules */}
              <div className="flex flex-col flex-1">
                <label className="text-[11px] font-bold uppercase tracking-widest text-black dark:text-white block mb-2">
                  Active Detection Rules
                </label>
                <div className="flex-1 bg-card-yellow/30 border-2 border-black rounded-xl p-5 shadow-inner flex flex-col">
                  <div className="flex flex-wrap gap-2 mb-4 overflow-y-auto max-h-[150px]">
                    {customLabels.map(lbl => (
                      <span key={lbl} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border-2 border-black rounded-lg text-xs font-bold text-black shadow-sm">
                        {lbl}
                        <button onClick={() => removeLabel(lbl)} className="hover:text-red-600 ml-1">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {customLabels.length === 0 && (
                      <span className="text-xs font-bold text-gray-400 italic">No rules active.</span>
                    )}
                  </div>

                  <div className="mt-auto">
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                        placeholder="Add rule..."
                        className="flex-1 px-3 py-2 border-2 border-black rounded-xl font-mono text-xs bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button 
                        onClick={addLabel}
                        className="px-3 py-2 bg-black text-white rounded-xl border-2 border-black font-bold flex items-center gap-1 hover:bg-gray-800 shrink-0 text-xs"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-black/10">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest w-full mb-1">Quick Add:</span>
                      {['person', 'email', 'phone_number', 'credit_card', 'ip_address', 'password', 'api_key', 'address', 'organization', 'ssn']
                        .filter(tag => !customLabels.includes(tag))
                        .map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            if (!customLabels.includes(tag)) {
                              setCustomLabels([...customLabels, tag]);
                            }
                          }}
                          className="text-[9px] font-mono font-bold bg-white hover:bg-primary hover:text-white border border-black px-2 py-0.5 rounded-lg transition-colors text-black shadow-sm"
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </PageWrapper>
  );
};

export default Upload;
