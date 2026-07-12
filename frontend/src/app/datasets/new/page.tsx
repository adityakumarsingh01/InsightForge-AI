"use client";

import { useState, useCallback } from "react";
import { UploadCloud, FileType, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function UploadDatasetPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (selectedFile: File) => {
    setError(null);
    const validTypes = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      setError("Please upload a valid CSV or Excel file.");
      return false;
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
      setError("File is too large. Maximum size is 50MB.");
      return false;
    }
    
    return true;
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post("https://insightforge-ai-7lzg.onrender.com/api/dataset/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      
      setSuccess(true);
      // Wait a moment before redirecting
      setTimeout(() => {
        router.push(`/datasets/${response.data.dataset_id}`);
      }, 1500);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || "An error occurred during upload.");
      setSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#09090b]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={() => router.push("/")}
    >
      <div 
        className="w-full max-w-3xl bg-[#111113] border border-white/10 rounded-2xl p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Upload New Dataset</h2>
            <p className="text-gray-400 mt-1">Upload a CSV or Excel file to begin your analysis.</p>
          </div>
          <button 
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>

        <div 
          className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-200 flex flex-col items-center justify-center text-center
            ${isDragging ? "border-blue-500 bg-blue-500/5" : "border-white/10 bg-[#141416] hover:border-white/20"}
            ${success ? "border-emerald-500 bg-emerald-500/5" : ""}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {success ? (
            <div className="space-y-4 animate-in zoom-in duration-300">
              <div className="h-20 w-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Upload Complete!</h3>
                <p className="text-gray-400 mt-1">Redirecting to workspace...</p>
              </div>
            </div>
          ) : (
            <>
              <div className={`h-20 w-20 rounded-full flex items-center justify-center mb-6 transition-colors ${isDragging ? "bg-blue-600/20 text-blue-500" : "bg-[#09090b] text-gray-400"}`}>
                {file ? <FileType size={32} className="text-blue-500" /> : <UploadCloud size={32} />}
              </div>
              
              {!file ? (
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">Drag & Drop your dataset here</h3>
                  <p className="text-gray-400 text-sm mb-6">or click to browse files from your computer</p>
                  <label className="bg-[#18181b] hover:bg-[#27272a] text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-white/5 inline-block">
                    Browse Files
                    <input type="file" className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileChange} />
                  </label>
                  <div className="pt-8 text-xs text-gray-500 flex items-center justify-center gap-4">
                    <span>Supported: CSV, XLSX</span>
                    <span>•</span>
                    <span>Max size: 50MB</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 w-full max-w-md">
                  <div className="bg-[#09090b] p-4 rounded-xl border border-white/5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileType className="text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button onClick={() => setFile(null)} className="text-sm text-red-400 hover:text-red-300 px-2 py-1">
                        Remove
                      </button>
                    )}
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-start gap-2 text-sm text-left">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setFile(null)}
                      disabled={isUploading}
                      className="flex-1 bg-[#18181b] hover:bg-[#27272a] disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors border border-white/5"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Upload and Analyze"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
