import React, { useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import { 
  Network, Database, Layout, Shield, Server, ArrowRight, ArrowDown, CheckCircle2,
  UploadCloud, Brain, FileText, SplitSquareHorizontal, Download, Activity, FileImage, Cpu, Settings, Keyboard
} from 'lucide-react';

const Architecture = () => {
  const [activeTab, setActiveTab] = useState('flow');

  return (
    <PageWrapper>
      <main className="flex-1 w-full px-8 py-8 mb-20 space-y-8">
        {/* Header & Tabs */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
          <section className="text-left space-y-2">
            <h1 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight">
              How It Works
            </h1>
            <p className="text-sm md:text-base text-gray-700 dark:text-gray-300 max-w-xl font-medium">
              Built to earn trust through explainability and handle the hard cases of document parsing.
            </p>
          </section>

          {/* Tab Navigation */}
          <div className="flex gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('flow')}
              className={`px-5 py-2.5 rounded-full border-2 border-black font-bold uppercase text-sm transition-all shadow-brutalist-sm hover:-translate-y-1 ${
                activeTab === 'flow' 
                  ? 'bg-primary text-black shadow-[4px_4px_0px_0px_#000]' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              System Flow Graph
            </button>
            <button 
              onClick={() => setActiveTab('criteria')}
              className={`px-5 py-2.5 rounded-full border-2 border-black font-bold uppercase text-sm transition-all shadow-brutalist-sm hover:-translate-y-1 ${
                activeTab === 'criteria' 
                  ? 'bg-secondary text-black shadow-[4px_4px_0px_0px_#000]' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Hackathon Criteria
            </button>
            <button 
              onClick={() => setActiveTab('hotkeys')}
              className={`px-5 py-2.5 rounded-full border-2 border-black font-bold uppercase text-sm transition-all shadow-brutalist-sm hover:-translate-y-1 ${
                activeTab === 'hotkeys' 
                  ? 'bg-card-yellow text-black shadow-[4px_4px_0px_0px_#000]' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Hotkeys (Speed)
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="mt-4">
          
          {/* TAB 1: FLOW GRAPH */}
          {activeTab === 'flow' && (
            <section className="bg-white dark:bg-card-dark rounded-3xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div className="flex items-center gap-3">
                  <Network className="w-8 h-8 text-primary" />
                  <h2 className="text-3xl font-display font-black uppercase">Detailed Flow Graph</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative py-4 items-stretch">
                
                {/* ROW 1 */}
                
                {/* Box 1 */}
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-primary p-2 border-2 border-black rounded-xl">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">1. Client Ingestion</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Drag & drop interface for immediate local file ingestion.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> Local MIME Validation (PDF/DOCX)</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> FormData Serialization</li>
                  </ul>
                </div>

                {/* Box 2 */}
                <div className="bg-gray-50 dark:bg-gray-800 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-primary p-2 border-2 border-black rounded-xl">
                      <Settings className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">2. Policy & Options</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">User defines processing scope and redaction behavior.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> Global Mode: Redact vs Anonymize</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" /> Industry Policies: Healthcare, Finance</li>
                  </ul>
                </div>

                {/* Box 3 */}
                <div className="bg-card-blue/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-card-blue p-2 border-2 border-black rounded-xl">
                      <Server className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">3. Parallel Worker Spawning</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">If 200 files are given, FastAPI dynamically spawns 5 parallel workers to process the queue asynchronously.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" /> Dynamic Thread Pool Execution</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" /> Non-blocking Batch Queueing</li>
                  </ul>
                </div>

                {/* Box 4 */}
                <div className="bg-card-blue/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-card-blue p-2 border-2 border-black rounded-xl">
                      <FileImage className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">4. Document Parsing</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Dedicated engines extract raw text streams.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" /> PyMuPDF Binary Block Extraction</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" /> python-docx XML Traversal</li>
                  </ul>
                </div>

                {/* ROW 1 ARROWS (Desktop) */}
                <div className="hidden lg:flex items-center justify-center absolute left-[25%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>
                <div className="hidden lg:flex items-center justify-center absolute left-[50%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>
                <div className="hidden lg:flex items-center justify-center absolute left-[75%] top-[25%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>

                {/* ROW 2 */}

                {/* Box 5 */}
                <div className="bg-card-purple/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-card-purple p-2 border-2 border-black rounded-xl">
                      <Brain className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">5. ML Pipeline Workflow</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Each parallel worker executes a strict NLP pipeline for its document chunk.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><ArrowRight className="w-3 h-3 text-purple-600 shrink-0" /> 1. Tokenization</li>
                    <li className="flex gap-2 items-start"><ArrowRight className="w-3 h-3 text-purple-600 shrink-0" /> 2. GLiNER Zero-Shot Model</li>
                    <li className="flex gap-2 items-start"><ArrowRight className="w-3 h-3 text-purple-600 shrink-0" /> 3. Heuristic Rule Fallbacks</li>
                  </ul>
                </div>

                {/* Box 6 */}
                <div className="bg-card-purple/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-card-purple p-2 border-2 border-black rounded-xl">
                      <Activity className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">6. Bi-Directional Sync</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Live preview dynamically syncs with parsed text.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" /> Debounced React API Polling</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" /> Active Focus Red Highlight tracking</li>
                  </ul>
                </div>

                {/* Box 7 */}
                <div className="bg-card-purple/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-card-purple p-2 border-2 border-black rounded-xl">
                      <Keyboard className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">7. Hotkeys & Context</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Keyboard-first workflow for rapid manual review.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" /> Arrow Keys / Spacebar to Accept/Reject</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-purple-600 shrink-0" /> Real-time ML Reason Tooltips on hover</li>
                  </ul>
                </div>

                {/* Box 8 */}
                <div className="bg-primary/20 border-2 border-black rounded-2xl p-5 shadow-brutalist relative z-10 flex flex-col hover:-translate-y-1 transition-transform h-full">
                  <div className="flex items-center justify-between mb-3">
                    <div className="bg-primary p-2 border-2 border-black rounded-xl">
                      <Shield className="w-6 h-6 text-black" />
                    </div>
                  </div>
                  <h3 className="font-black text-md uppercase mb-2">8. Surgical Export</h3>
                  <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">Non-destructive processing ensures safe data output.</p>
                  <ul className="text-[10px] space-y-2 mt-3 font-bold text-gray-700 dark:text-gray-200 flex-1">
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-orange-600 shrink-0" /> XML `&lt;w:shd&gt;` Run Splitting (DOCX)</li>
                    <li className="flex gap-2 items-start"><CheckCircle2 className="w-3 h-3 text-orange-600 shrink-0" /> PyMuPDF Coordinate Bounding Boxes</li>
                  </ul>
                </div>

                {/* ROW 2 ARROWS (Desktop) */}
                <div className="hidden lg:flex items-center justify-center absolute left-[25%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>
                <div className="hidden lg:flex items-center justify-center absolute left-[50%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>
                <div className="hidden lg:flex items-center justify-center absolute left-[75%] top-[75%] -translate-x-1/2 -translate-y-1/2 z-20">
                  <ArrowRight className="w-6 h-6 text-black bg-white rounded-full" />
                </div>

              </div>

              {/* PARALLEL WORKERS DEEP DIVE */}
              <div className="mt-16 border-t-2 border-dashed border-gray-300 dark:border-gray-700 pt-10">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-display font-black uppercase text-gray-900 dark:text-white">Architecture Deep Dive: Parallel ML Workers</h2>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-2">How we process 200+ files rapidly without blocking the main event loop.</p>
                </div>

                <div className="flex flex-col lg:flex-row items-stretch justify-between gap-8 relative">
                  
                  {/* Step 1: Dispatcher */}
                  <div className="w-full lg:w-1/4 bg-gray-50 dark:bg-gray-800 border-2 border-black rounded-2xl p-6 shadow-brutalist z-10 flex flex-col items-center text-center justify-center">
                    <Database className="w-10 h-10 mb-4 text-primary" />
                    <h4 className="font-black uppercase mb-2">FastAPI Dispatcher</h4>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Receives large batch (e.g., 200 files) and assigns chunks to the Async Thread Pool.</p>
                  </div>

                  {/* Desktop Connecting Line Left */}
                  <div className="hidden lg:block absolute left-[20%] top-1/2 w-[15%] border-t-2 border-dashed border-black z-0"></div>

                  {/* Step 2: Parallel Workers Stack */}
                  <div className="w-full lg:w-2/4 flex flex-col gap-3 relative z-10 bg-white dark:bg-card-dark p-6 border-2 border-black rounded-2xl shadow-brutalist">
                    <h4 className="font-black uppercase text-center mb-2">Thread Pool (5 Workers)</h4>
                    
                    {[1, 2, 3].map(workerNum => (
                      <div key={workerNum} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-2 justify-between bg-gray-50 dark:bg-gray-800/50">
                        <span className="text-[10px] font-black uppercase text-gray-500 w-16 text-center">Worker {workerNum}</span>
                        
                        <div className="flex items-center gap-2 flex-1 w-full">
                          <div className="flex-1 bg-white dark:bg-gray-900 border-2 border-black p-2 rounded-lg text-center shadow-[2px_2px_0px_0px_#000]">
                            <span className="block text-[10px] font-black text-purple-600">TOKENIZATION</span>
                            <span className="block text-[8px] font-bold text-gray-500 mt-0.5">spaCy en_core_web</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-black shrink-0" />
                          <div className="flex-1 bg-white dark:bg-gray-900 border-2 border-black p-2 rounded-lg text-center shadow-[2px_2px_0px_0px_#000]">
                            <span className="block text-[10px] font-black text-blue-600">INFERENCE</span>
                            <span className="block text-[8px] font-bold text-gray-500 mt-0.5">GLiNER Zero-Shot</span>
                          </div>
                          <ArrowRight className="w-4 h-4 text-black shrink-0" />
                          <div className="flex-1 bg-white dark:bg-gray-900 border-2 border-black p-2 rounded-lg text-center shadow-[2px_2px_0px_0px_#000]">
                            <span className="block text-[10px] font-black text-orange-600">HEURISTICS</span>
                            <span className="block text-[8px] font-bold text-gray-500 mt-0.5">Regex Fallback</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      + Workers 4 & 5 Running In Background...
                    </div>
                  </div>

                  {/* Desktop Connecting Line Right */}
                  <div className="hidden lg:block absolute right-[20%] top-1/2 w-[15%] border-t-2 border-dashed border-black z-0"></div>

                  {/* Step 3: Aggregator */}
                  <div className="w-full lg:w-1/4 bg-gray-50 dark:bg-gray-800 border-2 border-black rounded-2xl p-6 shadow-brutalist z-10 flex flex-col items-center text-center justify-center">
                    <Network className="w-10 h-10 mb-4 text-secondary" />
                    <h4 className="font-black uppercase mb-2">JSON Aggregation</h4>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Results are merged, sorted by byte offset, and streamed back to the React UI.</p>
                  </div>

                </div>
              </div>

            </section>
          )}

          {/* TAB 2: CRITERIA */}
          {activeTab === 'criteria' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 p-4 rounded-xl mb-6">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  <strong>The Strategy:</strong> We didn't just build a "clean demo." We architected explicit solutions for <strong>Marcus</strong> (Trust & Explainability), <strong>Maya</strong> (Working at Volume), and <strong>Sam</strong> (Fixing Mistakes rapidly). Here is how our engineering choices answer the judging rubric.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Fundamentals */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-primary text-black px-2 py-0.5 rounded text-sm">01</span> Software Engineering</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Clean, well-structured code, sensible architecture and separation of concerns."</em></p>
                    <p>We implemented a strict decoupled architecture. React manages UI state and the debounced Live Sync, while FastAPI handles heavy ML lifting via asynchronous thread pools.</p>
                    <p>To support <strong>Maya's 200-file volume (Problem 2)</strong>, we built a non-blocking queue that dynamically spawns parallel worker threads to process documents concurrently without crashing the UI.</p>
                  </div>
                </div>

                {/* Discovery */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-secondary text-black px-2 py-0.5 rounded text-sm">02</span> Discovery (The Hard Cases)</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Did you notice the hard cases that were not spelled out in the prompt?"</em></p>
                    <p>The hidden challenge wasn't just finding PII; it was <strong>context loss</strong> and <strong>highlight bleeding</strong>.</p>
                    <p>For Word files, standard highlights overwrite entire paragraph runs. We built a custom XML parser that surgically injects <code>&lt;w:shd&gt;</code> tags precisely around the target word. For PDFs, we calculate exact PyMuPDF bounding boxes. We discovered that replacing text with black boxes ruins readability, so we used pastel overlays instead.</p>
                  </div>
                </div>

                {/* Judgment */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-card-blue text-black px-2 py-0.5 rounded text-sm">03</span> Judgment</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Did you spend your effort on the part of the problem that actually matters?"</em></p>
                    <p>We realized that <strong>Sam (Problem 3)</strong> will blindly trust the machine if correcting it takes too long. We didn't waste time building user auth or distributed cloud databases. We spent 100% of our effort on the <strong>Review Experience</strong>.</p>
                    <p>We built a Keyboard-First workflow where Sam can use Arrow Keys to snap between errors and the Spacebar to instantly toggle accept/reject without touching his mouse.</p>
                  </div>
                </div>

                {/* Empathy */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-card-purple text-black px-2 py-0.5 rounded text-sm">04</span> Real-User Empathy</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Did you design for the actual person under their actual constraints?"</em></p>
                    <p><strong>Marcus (Problem 1)</strong> is terrified of the "black box." He constantly asks: <em>"Why this, and why not that?"</em></p>
                    <p>We designed for his anxiety by explicitly injecting the ML model's reasoning into the UI via real-time tooltips. We also built the Bi-Directional Live Sync—clicking a word on the left instantly draws a red focus box on the actual document on the right, providing absolute visual proof.</p>
                  </div>
                </div>

                {/* Tradeoffs */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-red-400 text-black px-2 py-0.5 rounded text-sm">05</span> Tradeoff Awareness</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Did you recognize the tensions in the problem and make a deliberate call?"</em></p>
                    <p><strong>Tension: ML Accuracy vs. UI Latency.</strong> We deliberately chose a fast, local Zero-Shot NER model (GLiNER) over a massive Cloud LLM (like GPT-4).</p>
                    <p>While an LLM might catch 2% more edge cases, it introduces massive latency. Maya and Sam are working under intense time pressure; they cannot wait 5 seconds for a cloud response every time they hit a hotkey. Speed, predictability, and local execution won the tradeoff.</p>
                  </div>
                </div>

                {/* Reasoning */}
                <div className="bg-white dark:bg-card-dark border-2 border-black p-6 rounded-2xl shadow-brutalist hover:shadow-retro transition-shadow flex flex-col">
                  <h3 className="font-black text-xl mb-3 flex items-center gap-2"><span className="bg-gray-800 text-white px-2 py-0.5 rounded text-sm">06</span> Reasoning (What we left out)</h3>
                  <div className="text-gray-700 dark:text-gray-300 text-sm font-medium leading-relaxed flex-1 space-y-2">
                    <p><em>"Can you explain your choices, including what you left out?"</em></p>
                    <p>We explicitly left out an <strong>"Auto-Save to Original"</strong> feature. The system maintains an immutable original file and generates a dynamic preview on the fly.</p>
                    <p>Why? Because Marcus needs to feel in control. Silent auto-saves destroy trust. By enforcing a deliberate, non-destructive "Export" button at the very end of the pipeline, we guarantee that the user's original data is never lost or accidentally overwritten.</p>
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* TAB 3: HOTKEYS */}
          {activeTab === 'hotkeys' && (
            <section className="bg-white dark:bg-card-dark rounded-3xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_#000] space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-3xl text-primary font-bold">keyboard</span>
                  <h2 className="text-3xl font-display font-black uppercase">Keyboard-First Workflow</h2>
                </div>
              </div>
              
              <div className="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400 p-4 rounded-xl mb-6">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  <strong>Built for Speed (Problem 3):</strong> Sam cannot afford to click around with a mouse when fixing hundreds of mistakes. We built a fully keyboard-driven Review UI so he can snap through errors and make bulk changes instantly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Navigation */}
                <div className="border-2 border-black rounded-2xl p-6 bg-gray-50 dark:bg-gray-800 shadow-brutalist flex flex-col gap-4">
                  <h3 className="font-black text-lg uppercase border-b-2 border-black pb-2">Navigation</h3>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Next Item</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">↓ Arrow</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Previous Item</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">↑ Arrow</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Next File</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Shift + ↓</kbd>
                  </div>
                </div>

                {/* Single Item Actions */}
                <div className="border-2 border-black rounded-2xl p-6 bg-card-yellow dark:bg-yellow-900/30 shadow-brutalist flex flex-col gap-4">
                  <h3 className="font-black text-lg uppercase border-b-2 border-black pb-2">Item Actions</h3>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Quick Accept</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Enter</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Force Redact</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">1 / R</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Force Anonymize</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">2 / A</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Reject / Dismiss</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">3 / Del</kbd>
                  </div>
                </div>

                {/* Bulk Actions */}
                <div className="border-2 border-black rounded-2xl p-6 bg-card-blue dark:bg-blue-900/30 shadow-brutalist flex flex-col gap-4">
                  <h3 className="font-black text-lg uppercase border-b-2 border-black pb-2">Bulk Actions</h3>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Accept (This File)</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Shift + A</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Reject (This File)</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Shift + D</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Accept (ALL Files)</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Ctrl + Shift + A</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Reject (ALL Files)</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Ctrl + Shift + D</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Undo Last Action</span>
                    <kbd className="px-3 py-1 bg-white text-black border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] font-black text-xs">Ctrl + Z</kbd>
                  </div>
                </div>

              </div>
            </section>
          )}
        </div>
      </main>
    </PageWrapper>
  );
};

export default Architecture;
