import React from 'react';

export default function ScorecardView({ activeSubmission }) {
  if (!activeSubmission) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center h-full flex flex-col items-center justify-center min-h-[450px]">
        <h3 className="text-base font-semibold text-slate-700 mt-4">No assignment selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
          Select any completed assignment from the submissions table to inspect its comprehensive AI-generated grading scorecard.
        </p>
      </div>
    );
  }

  const { fileName, extractedText, evaluation } = activeSubmission;

  if (!evaluation) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center h-full flex flex-col items-center justify-center min-h-[450px]">
        <h3 className="text-base font-semibold text-slate-700 mt-4">Generating Scorecard</h3>
        <p className="text-xs text-slate-500 mt-1">
          This submission is currently undergoing evaluation. Just a moment...
        </p>
      </div>
    );
  }

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'bg-emerald-500 text-white';
    if (score >= 70) return 'bg-indigo-600 text-white';
    if (score >= 60) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const getScoreBorderColorClass = (score) => {
    if (score >= 85) return 'border-emerald-100 bg-emerald-50/50';
    if (score >= 70) return 'border-indigo-100 bg-indigo-50/50';
    if (score >= 60) return 'border-amber-100 bg-amber-50/50';
    return 'border-rose-100 bg-rose-50/50';
  };

  const getScoreTextClass = (score) => {
    if (score >= 85) return 'text-emerald-700';
    if (score >= 70) return 'text-indigo-700';
    if (score >= 60) return 'text-amber-700';
    return 'text-rose-700';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HEADER CARD */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-2xl">
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 truncate max-w-[280px] sm:max-w-[400px]">
                {fileName}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                AI Evaluation Report Generated Successfully
              </p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 border px-4 py-2 rounded-2xl shadow-sm ${getScoreBorderColorClass(evaluation.totalScore)}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Grade:</span>
            <span className={`text-2xl font-black ${getScoreTextClass(evaluation.totalScore)}`}>
              {evaluation.totalScore}
            </span>
            <span className="text-slate-400 font-bold text-sm">/100</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
          Overall Feedback Summary
        </h3>
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
          <p className="text-sm text-slate-800 leading-relaxed font-medium">
            {evaluation.overallFeedback}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4">
          Rubric Breakdown (Side-by-Side Analysis)
        </h3>
        
        <div className="space-y-4">
          {evaluation.breakdown.map((item, index) => {
            const percentage = Math.round((item.score / item.maxScore) * 100);
            
            return (
              <div 
                key={index}
                className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-all duration-200 bg-slate-50/20"
              >
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-bold text-slate-800">{item.criterion}</span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-bold">{percentage}%</span>
                    <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                      percentage >= 85 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                      percentage >= 70 ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                      percentage >= 60 ? 'bg-amber-50 text-amber-800 border border-amber-100' :
                      'bg-rose-50 text-rose-800 border border-rose-100'
                    }`}>
                      {item.score} / {item.maxScore}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      percentage >= 85 ? 'bg-emerald-500' :
                      percentage >= 70 ? 'bg-indigo-600' :
                      percentage >= 60 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {/* Critique */}
                <div className="bg-white border border-slate-100 rounded-lg p-3 text-xs text-slate-600 leading-relaxed shadow-sm font-medium">
                  {item.critique}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STUDENT TEXT SUBMISSION PREVIEW */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
          Extracted Student Submission Copy
        </h3>
        <div className="max-h-[160px] overflow-y-auto bg-slate-50 border border-slate-100 rounded-xl p-4 font-mono text-[11px] text-slate-600 leading-relaxed whitespace-pre-wrap">
          {extractedText || 'No text extracted.'}
        </div>
      </div>
    </div>
  );
}
