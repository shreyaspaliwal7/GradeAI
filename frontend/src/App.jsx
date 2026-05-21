import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Library, Server, Database, Check } from 'lucide-react';
import UploadPanel from './components/UploadPanel';
import AnalyticsView from './components/AnalyticsView';
import ScorecardView from './components/ScorecardView';
import { API_BASE } from './config/api';

export default function App() {
  const [activeAnswerKey, setActiveAnswerKey] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    pendingCount: 0,
    processingCount: 0,
    completedCount: 0,
    failedCount: 0,
    classAverage: 0,
    passingRate: 0,
    latestAnswerKey: null
  });
  const [selectedId, setSelectedId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'
  
  const pollingRef = useRef(null);

  // 1. Check server connectivity
  const checkBackendStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch {
      setBackendStatus('disconnected');
    }
  };

  // 2. Fetch submissions & evaluations list
  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`${API_BASE}/evaluations`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
        
        // Auto-select the first completed evaluation if nothing is selected yet
        const completed = data.filter(s => s.status === 'COMPLETED');
        if (completed.length > 0 && !selectedId) {
          setSelectedId(completed[0]._id);
        }
      }
    } catch (err) {
      console.error('Error fetching submissions:', err);
    }
  };

  // 3. Fetch analytics statistical aggregates
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/evaluations/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        // Link active answer key if it exists in stats
        if (data.latestAnswerKey) {
          setActiveAnswerKey({
            _id: data.latestAnswerKey.id,
            fileName: data.latestAnswerKey.fileName,
            extractedText: 'Preloaded answer key contents retrieved'
          });
        } else {
          setActiveAnswerKey(null);
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Triggered on successful upload
  const handleUploadSuccess = () => {
    setIsProcessing(true);
    fetchSubmissions();
    fetchStats();
  };

  // Reset system data
  const handleResetDatabase = async () => {
    if (!window.confirm('Professor, are you sure you want to clear all student submissions and evaluations? This physically deletes uploaded files too.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/evaluations/reset`, { method: 'DELETE' });
      if (res.ok) {
        setSubmissions([]);
        setSelectedId(null);
        setActiveAnswerKey(null);
        setStats({
          totalCount: 0,
          pendingCount: 0,
          processingCount: 0,
          completedCount: 0,
          failedCount: 0,
          classAverage: 0,
          passingRate: 0,
          latestAnswerKey: null
        });
      }
    } catch (err) {
      console.error('Error resetting database:', err);
    }
  };

  // Combine initial fetches
  const initApp = async () => {
    await checkBackendStatus();
    await fetchSubmissions();
    await fetchStats();
  };

  useEffect(() => {
    initApp();
  }, []);

  // Polling logic: Checks if any submission is PENDING or PROCESSING.
  // If yes, poll every 2.5 seconds to refresh dashboards.
  useEffect(() => {
    const hasActiveTasks = submissions.some(
      (sub) => sub.status === 'PENDING' || sub.status === 'PROCESSING'
    );

    if (hasActiveTasks) {
      setIsProcessing(true);
      if (!pollingRef.current) {
        console.log('[Polling] Starting real-time updates for active grading runs...');
        pollingRef.current = setInterval(() => {
          fetchSubmissions();
          fetchStats();
        }, 2500);
      }
    } else {
      setIsProcessing(false);
      if (pollingRef.current) {
        console.log('[Polling] All grading jobs completed. Stopping polling.');
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [submissions]);

  // Find currently selected submission object
  const activeSubmission = submissions.find(s => s._id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img width="50px" src="\GradeAi_logo.png" alt="" />
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                Grade<span className="text-indigo-600">AI</span>
              </h1>
              <span className="text-xs text-slate-500 font-semibold">
                Student Answer Sheet Evaluation Engine
              </span>
            </div>
          </div>

          {/* Connection Status Badges */}
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border transition-all duration-300 ${
              backendStatus === 'connected' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                : backendStatus === 'disconnected'
                ? 'bg-rose-50 text-rose-800 border-rose-100'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              <Server className={`w-3.5 h-3.5 ${backendStatus === 'checking' ? 'animate-pulse' : ''}`} />
              {backendStatus === 'connected' ? 'API Active' : backendStatus === 'disconnected' ? 'API Offline' : 'Checking API...'}
            </span>

            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1 rounded-full">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              DB Ready
            </span>
          </div>
        </div>
      </header>

      {/* CORE WORKSPACE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMN 1: UPLOAD PANEL */}
          <div className="lg:col-span-1 space-y-6">
            <UploadPanel 
              onUploadSuccess={handleUploadSuccess}
              activeAnswerKey={activeAnswerKey}
              setActiveAnswerKey={setActiveAnswerKey}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </div>

          {/* COLUMN 2 & 3: ANALYTICS VIEW & DETAILS CARD */}
          <div className="lg:col-span-2 space-y-8">
            <AnalyticsView 
              stats={stats}
              submissions={submissions}
              selectedId={selectedId}
              onSelectSubmission={setSelectedId}
              onResetDatabase={handleResetDatabase}
            />

            {/* scorecard view (visible below or beside depending on selection) */}
            <ScorecardView 
              activeSubmission={activeSubmission}
            />
          </div>

        </div>
      </main>
    </div>
  );
}
