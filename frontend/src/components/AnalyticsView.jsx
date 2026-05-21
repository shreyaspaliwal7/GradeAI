import React from 'react';
import { TrendingUp, RefreshCw, BarChart2, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react';

export default function AnalyticsView({ 
  stats, 
  submissions, 
  selectedId, 
  onSelectSubmission, 
  onResetDatabase 
}) {
  const getStatusBadge = (status, score, failureReason) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
            Queued
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-indigo-100 animate-pulse">
            Grading...
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">
            {score !== undefined ? `${score}/100` : 'Graded'}
          </span>
        );
      case 'FAILED':
        return (
          <span
            className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-rose-100"
            title={failureReason || 'Grading failed — check Render logs'}
          >
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: STATS & AGGREGATES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Class Average */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Average</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-4xl font-extrabold text-slate-800">
              {stats.classAverage > 0 ? stats.classAverage : '--'}
            </span>
            {stats.classAverage > 0 && <span className="text-sm font-semibold text-slate-400">/100</span>}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Average score calculated from {stats.completedCount} graded student copies.
          </p>
        </div>

        {/* Passing Rate */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Passing Rate</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-4xl font-extrabold text-slate-800">
              {stats.completedCount > 0 ? `${stats.passingRate}%` : '--'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div 
              className={`h-1.5 rounded-full transition-all duration-500 ${
                stats.passingRate >= 80 ? 'bg-emerald-500' : stats.passingRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: stats.completedCount > 0 ? `${stats.passingRate}%` : '0%' }}
            ></div>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Evaluation Pipeline</span>
            <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              Total: {stats.totalCount}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
              <span className="text-sm font-black text-slate-700">{stats.completedCount}</span>
              <div className="text-[10px] text-slate-500 mt-0.5">Graded</div>
            </div>
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-2 animate-pulse">
              <span className="text-sm font-black text-indigo-700">{stats.pendingCount + stats.processingCount}</span>
              <div className="text-[10px] text-slate-500 mt-0.5">In Queue</div>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-2">
              <span className="text-sm font-black text-rose-700">{stats.failedCount}</span>
              <div className="text-[10px] text-slate-500 mt-0.5">Failed</div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SUBMISSIONS LIST */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            
            Class Submissions
          </h2>
          {submissions.length > 0 && (
            <button 
              onClick={onResetDatabase}
              className="text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-rose-100 rounded-lg px-3 py-1.5 transition-all duration-200"
            >
              Reset All Submissions
            </button>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-slate-100">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-700 mt-3">No student assignments uploaded yet</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase font-bold text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4 font-semibold">Student Copy Name</th>
                  <th className="py-3 px-4 font-semibold text-center">Status / Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {submissions.map((sub) => {
                  const isSelected = selectedId === sub._id;

                  return (
                    <tr 
                      key={sub._id}
                      onClick={() => sub.status === 'COMPLETED' && onSelectSubmission(sub._id)}
                      className={`group hover:bg-slate-50/60 transition-all duration-200 cursor-pointer ${
                        isSelected ? 'bg-indigo-50/30' : ''
                      } ${sub.status !== 'COMPLETED' ? 'pointer-events-none opacity-80' : ''}`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors duration-200 ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                          }`}>
                          </div>
                          <div>
                            <span className={`text-sm font-medium ${
                              isSelected ? 'text-indigo-900 font-bold' : 'text-slate-800'
                            }`}>
                              {sub.fileName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(sub.status, sub.evaluation?.totalScore, sub.failureReason)}
                          {sub.status === 'FAILED' && sub.failureReason && (
                            <span className="text-[10px] text-rose-600 max-w-[200px] truncate" title={sub.failureReason}>
                              {sub.failureReason}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <p className="text-[11px] text-slate-400 text-center mt-4">
             Hint: Click on any Completed submission to view the detailed side-by-side AI evaluation scorecard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
