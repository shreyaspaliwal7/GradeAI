import React, { useState, useRef } from 'react';
import { Upload, X, Award, Loader2 } from 'lucide-react';
import { API_BASE } from '../config/api';

export default function UploadPanel({ 
  onUploadSuccess, 
  activeAnswerKey, 
  setActiveAnswerKey,
  isProcessing,
  setIsProcessing
}) {
  const [keyFile, setKeyFile] = useState(null);
  const [studentFiles, setStudentFiles] = useState([]);
  const [keyUploadError, setKeyUploadError] = useState('');
  const [studentUploadError, setStudentUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingKey, setIsUploadingKey] = useState(false);
  
  const keyInputRef = useRef(null);
  const studentInputRef = useRef(null);

  // Handle Answer Key File Selection
  const handleKeyFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check extension
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'pdf', 'md'].includes(ext)) {
      setKeyUploadError('Only .txt, .pdf, or .md files are supported for answer keys.');
      return;
    }

    setKeyUploadError('');
    setKeyFile(file);
    await uploadAnswerKey(file);
  };

  // Upload Answer Key to API
  const uploadAnswerKey = async (file) => {
    setIsUploadingKey(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/uploads/answer-key`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload answer key');
      }

      const result = await response.json();
      setActiveAnswerKey(result);
      console.log('Answer key uploaded successfully:', result);
    } catch (err) {
      setKeyUploadError(err.message);
      setKeyFile(null);
    } finally {
      setIsUploadingKey(false);
    }
  };

  // Clear/Reset Answer Key
  const handleClearAnswerKey = () => {
    setKeyFile(null);
    setActiveAnswerKey(null);
    if (keyInputRef.current) keyInputRef.current.value = '';
  };

  // Handle Student Files Selection (max 5)
  const handleStudentFilesChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    if (files.length > 5) {
      setStudentUploadError('You can upload a maximum of 5 student submissions in a single batch.');
      return;
    }

    const invalidFiles = files.filter(f => !['txt', 'pdf', 'md'].includes(f.name.split('.').pop().toLowerCase()));
    if (invalidFiles.length > 0) {
      setStudentUploadError('All files must be .txt, .pdf, or .md.');
      return;
    }

    setStudentUploadError('');
    setStudentFiles(files);
  };

  // Upload Student Submissions
  const handleGradeAssignments = async () => {
    if (studentFiles.length === 0) return;
    
    setIsProcessing(true);
    setUploadProgress(20);
    setStudentUploadError('');

    const formData = new FormData();
    studentFiles.forEach((file) => {
      formData.append('files', file);
    });

    if (activeAnswerKey) {
      formData.append('associatedAnswerKeyId', activeAnswerKey._id);
    }

    try {
      setUploadProgress(50);
      const response = await fetch(`${API_BASE}/uploads/submissions`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to upload submissions');
      }

      const result = await response.json();
      setUploadProgress(100);
      console.log('Submissions uploaded successfully:', result);
      
      // Clear file inputs
      setStudentFiles([]);
      if (studentInputRef.current) studentInputRef.current.value = '';

      // Trigger parents refresh
      setTimeout(() => {
        onUploadSuccess();
        setUploadProgress(0);
      }, 500);

    } catch (err) {
      setStudentUploadError(err.message);
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  // Remove individual file from the staging queue
  const removeQueuedStudentFile = (index) => {
    const updated = [...studentFiles];
    updated.splice(index, 1);
    setStudentFiles(updated);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: OPTIONAL ANSWER KEY */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              1. Optional Answer Key
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Upload an answer key. If omitted, assignments will be graded on general academic principles.
            </p>
          </div>
        </div>

        {!activeAnswerKey && !isUploadingKey ? (
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50/50 hover:border-indigo-400 cursor-pointer transition-all duration-200 group">
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-200" />
            <span className="text-sm font-medium text-slate-700 mt-3 group-hover:text-indigo-600 transition-colors">
              Click to select Answer Key
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Supports PDF, TXT or Markdown up to 10MB
            </span>
            <input 
              type="file" 
              ref={keyInputRef}
              className="hidden" 
              accept=".txt,.pdf,.md"
              onChange={handleKeyFileChange} 
            />
          </label>
        ) : isUploadingKey ? (
          <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-xl p-8">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-sm text-slate-600 font-medium mt-3">Extracting text & storing answer key...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 transition-all duration-300 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white rounded-lg p-2">
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  {activeAnswerKey.fileName}
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Answer Key
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {activeAnswerKey.extractedText ? `${activeAnswerKey.extractedText.slice(0, 100)}...` : 'Empty text extracted'}
                </span>
              </div>
            </div>
            <button 
              onClick={handleClearAnswerKey}
              className="text-slate-400 hover:text-red-500 hover:bg-white rounded-lg p-2 shadow-sm border border-transparent hover:border-slate-100 transition-all duration-200"
              title="Remove Answer Key"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {keyUploadError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 text-xs font-medium p-3 rounded-lg mt-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{keyUploadError}</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            2. Student Submissions
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Batch-upload up to **5 assignments** per grading run.
          </p>
        </div>

        <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50/50 hover:border-indigo-400 cursor-pointer transition-all duration-200 group ${isProcessing ? 'pointer-events-none opacity-50 bg-slate-50' : ''}`}>
          <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 group-hover:scale-110 transition-all duration-200" />
          <span className="text-sm font-medium text-slate-700 mt-3 group-hover:text-indigo-600 transition-colors">
            Select student copies to grade
          </span>
          <span className="text-xs text-slate-400 mt-1">
            PDF, TXT, or MD files (Maximum of 5 files)
          </span>
          <input 
            type="file" 
            ref={studentInputRef}
            className="hidden" 
            multiple 
            accept=".txt,.pdf,.md"
            onChange={handleStudentFilesChange}
            disabled={isProcessing}
          />
        </label>

        {studentFiles.length > 0 && (
          <div className="mt-6 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>Selected Student Copies ({studentFiles.length} / 5)</span>
              <button 
                onClick={() => setStudentFiles([])}
                className="hover:text-red-500 hover:underline"
              >
                Clear all
              </button>
            </div>
            
            <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2 border border-slate-100 bg-slate-50/30 rounded-xl p-2">
              {studentFiles.map((file, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800 truncate max-w-[250px]">{file.name}</span>
                    <span className="text-xs text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                  <button 
                    onClick={() => removeQueuedStudentFile(index)}
                    className="text-slate-400 hover:text-red-500 rounded-md p-1 hover:bg-slate-50 transition-colors"
                  >
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleGradeAssignments}
              disabled={isProcessing}
              className={`w-full py-3.5 px-4 font-semibold text-white rounded-xl shadow-md transition-all duration-200 flex items-center justify-center gap-2 ${
                isProcessing 
                  ? 'bg-slate-400 cursor-not-allowed shadow-none' 
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 shadow-indigo-200'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI Evaluating Submissions...
                </>
              ) : (
                <>
                  Submission{studentFiles.length > 1 ? 's' : ''} with AI
                </>
              )}
            </button>
          </div>
        )}

        {isProcessing && uploadProgress > 0 && (
          <div className="mt-4 space-y-2">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 font-medium text-indigo-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                Queueing files for Gemini AI evaluation...
              </span>
              <span>{uploadProgress}%</span>
            </div>
          </div>
        )}

        {studentUploadError && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 text-xs font-medium p-3 rounded-lg mt-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{studentUploadError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
