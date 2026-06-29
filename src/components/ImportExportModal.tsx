import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { FileJson, X, AlertCircle, Download, Copy, Upload } from 'lucide-react';

interface ImportExportModalProps {
  isImportExportModalOpen: boolean;
  setIsImportExportModalOpen: (open: boolean) => void;
  importError: string | null;
  jsonStringInput: string;
  setJsonStringInput: (val: string) => void;
  handleImportWorkflowJSON: (val: string) => void;
  copiedText: string | null;
  setCopiedText: (text: string | null) => void;
  activeWorkflow: { name: string };
  currentLang: 'en' | 'ru' | 'zh';
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isImportExportModalOpen,
  setIsImportExportModalOpen,
  importError,
  jsonStringInput,
  setJsonStringInput,
  handleImportWorkflowJSON,
  copiedText,
  setCopiedText,
  activeWorkflow,
  currentLang,
}) => {
  return (
    <AnimatePresence>
      {isImportExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Modal Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsImportExportModalOpen(false)}
          />

          {/* Modal Content layout */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header block */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-sky-500/10 rounded-xl border border-sky-500/20">
                  <FileJson className="text-sky-400" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest font-sans">Workflow Configuration</h3>
                  <p className="text-[10.5px] text-slate-500 font-bold font-sans">Import or export your visual agent flow chart pipelines</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportExportModalOpen(false)}
                className="text-slate-505 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Error Notification banners */}
            {importError && (
              <div className="mx-6 mt-4 p-3.5 bg-rose-955/30 border border-rose-900/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-sans">
                <AlertCircle size={14} className="shrink-0" />
                <span className="font-semibold leading-relaxed">{importError}</span>
              </div>
            )}

            {/* Main Contents Form layout */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Options card */}
                <div className="border border-slate-805 rounded-2xl p-4 bg-slate-950/50 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-sky-405 uppercase tracking-wider block mb-1 font-sans">⚡ Share & Save Export</span>
                    <p className="text-[11px] text-slate-400 leading-normal font-medium font-sans mb-3">
                      Download your active pipeline configuration as a standardized JSON configuration file, or copy the data snippet directly.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 font-sans">
                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStringInput);
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `${(activeWorkflow?.name || "workflow").replace(/\s+/g, '-').toLowerCase()}-export.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        
                        setCopiedText("Downloaded File!");
                        setTimeout(() => setCopiedText(null), 1500);
                      }}
                      className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Download size={13} />
                      <span>Download JSON File</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(jsonStringInput);
                        setCopiedText("Copied Clipboard!");
                        setTimeout(() => setCopiedText(null), 1500);
                      }}
                      className="w-full bg-slate-955 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy size={13} className="text-slate-400" />
                      <span>{copiedText === "Copied Clipboard!" ? "Copied String!" : "Copy To Clipboard"}</span>
                    </button>
                  </div>
                </div>

                {/* Drag-and-drop Local Select Import Box */}
                <div className="border border-slate-805 rounded-2xl p-4 bg-slate-950/50 space-y-3.5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-black text-teal-400 uppercase tracking-wider block mb-1 font-sans">📂 Load Pipeline File</span>
                    <p className="text-[11px] text-slate-400 leading-normal font-medium font-sans">
                      Drag & Drop or browse to select your previously exported pipeline `.json` file.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 font-sans">
                    {/* Standard file selector upload trigger */}
                    {(() => {
                      const [isDragging, setIsDragging] = React.useState(false);

                      const handleDrop = (e: React.DragEvent) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const uploadedFile = e.dataTransfer.files?.[0];
                        if (!uploadedFile) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const resultString = event.target?.result as string;
                          if (resultString) {
                            setJsonStringInput(resultString);
                            handleImportWorkflowJSON(resultString);
                          }
                        };
                        reader.readAsText(uploadedFile);
                      };

                      return (
                        <label 
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          className={`w-full bg-slate-900 border p-5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer group transition-all duration-300 ${
                            isDragging 
                              ? 'border-teal-500 bg-teal-500/15 scale-105 ring-2 ring-teal-500/30' 
                              : 'border-slate-800 hover:border-teal-900/60'
                          }`}
                        >
                          <Upload size={22} className={`transition-transform duration-300 ${isDragging ? 'text-teal-300 scale-110 animate-bounce' : 'text-teal-400 group-hover:scale-110'}`} />
                          <span className={`text-[10.5px] font-bold transition-colors ${isDragging ? 'text-teal-200' : 'text-slate-400 group-hover:text-teal-300'}`}>
                            {isDragging ? 'Drop File Here Now!' : 'Select or Drop Exported .JSON'}
                          </span>
                          <input 
                            type="file" 
                            accept=".json"
                            className="hidden" 
                            onChange={(e) => {
                              const uploadedFile = e.target.files?.[0];
                              if (!uploadedFile) return;
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const resultString = event.target?.result as string;
                                if (resultString) {
                                  setJsonStringInput(resultString);
                                  handleImportWorkflowJSON(resultString);
                                }
                              };
                              reader.readAsText(uploadedFile);
                            }}
                          />
                        </label>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Configuration editor / manual JSON pasting view */}
              <div className="space-y-2 pt-2 border-t border-slate-850 font-sans">
                <div className="flex items-center justify-between">
                  <label className="block text-[10.5px] font-black text-slate-400 uppercase tracking-wider">Configure Schema Raw Payload</label>
                  <span className="text-[10px] text-slate-500 font-mono">Format validated JSON map</span>
                </div>
                <textarea
                  rows={8}
                  value={jsonStringInput}
                  onChange={(e) => setJsonStringInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs font-mono text-slate-300 leading-relaxed focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 max-h-56 overflow-y-auto select-text"
                  placeholder={`{ "nodes": [...], "connections": [...] }`}
                />
              </div>
            </div>

            {/* Footer controls */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between font-sans">
              <span className="text-[10px] text-slate-550 font-mono">Validate imports using standard coordinate matrices</span>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsImportExportModalOpen(false)}
                  className="cursor-pointer text-xs font-semibold px-4 py-2.5 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Close Sheet
                </button>
                <button
                  onClick={() => handleImportWorkflowJSON(jsonStringInput)}
                  className="cursor-pointer text-xs font-bold px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all duration-300 active:scale-95"
                >
                  Import Live Canvas
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
