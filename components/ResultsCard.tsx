
import React from 'react';
import { AnalysisResult } from '../types';
import ScoreGauge from './ScoreGauge';

interface ResultsCardProps {
  result: AnalysisResult;
  mediaData: { url: string; type: string } | null;
  onReset: () => void;
}

const ResultsCard: React.FC<ResultsCardProps> = ({ result, mediaData, onReset }) => {
  const isBuy = result.sustainabilityScore >= 70;
  const verdictColor = isBuy ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
  const verdictLabel = isBuy ? 'BUY' : 'AVOID';

  const handleSaveToDevice = () => {
    if (!mediaData) return;
    const link = document.createElement('a');
    link.href = mediaData.url;
    const extension = mediaData.type.includes('video') ? 'mp4' : 'jpg';
    link.download = `EcoVerify_${result.productName.replace(/\s+/g, '_')}_${new Date().getTime()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-20">
      <div className={`${isBuy ? 'bg-emerald-600' : 'bg-slate-800'} p-6 text-white text-center relative`}>
        <div className={`absolute top-4 right-4 px-4 py-1 rounded-full text-xs font-black border-2 ${isBuy ? 'bg-white text-emerald-600 border-white' : 'bg-rose-500 text-white border-rose-400'}`}>
          VERDICT: {verdictLabel}
        </div>
        <h2 className="text-2xl font-bold">{result.productName}</h2>
        <p className="text-emerald-50 opacity-90 mt-1">Sustainability Audit</p>
      </div>

      <div className="p-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-center pb-8 border-b border-slate-100">
          <ScoreGauge score={result.sustainabilityScore} />
          <div className="flex-1 space-y-4">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg border font-bold text-sm ${verdictColor}`}>
              {isBuy ? '✓ Sustainable Choice' : '⚠ High Environmental Impact'}
            </div>
            <h3 className="text-lg font-semibold text-slate-800">Audit Summary</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{result.summary}</p>
          </div>
        </div>

        {mediaData && (
          <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm max-h-48 flex justify-center bg-slate-50">
            {mediaData.type.startsWith('video') ? (
              <video src={mediaData.url} className="h-full object-contain" muted loop autoPlay playsInline />
            ) : (
              <img src={mediaData.url} alt="Capture" className="h-full object-contain" />
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-rose-50/50 p-5 rounded-3xl border border-rose-100">
            <h3 className="flex items-center gap-2 text-rose-600 font-bold text-sm uppercase tracking-wider mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Greenwashing Alerts
            </h3>
            <ul className="space-y-3">
              {result.redFlags.map((flag, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
                  <span className="text-rose-500 font-bold mt-0.5">•</span>
                  {flag}
                </li>
              ))}
              {result.redFlags.length === 0 && (
                <li className="text-slate-400 italic text-sm">No significant red flags identified.</li>
              )}
            </ul>
          </section>

          <section className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100">
            <h3 className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-wider mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Eco-Wins
            </h3>
            <ul className="space-y-3">
              {result.positives.map((win, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
                  <span className="text-emerald-500 font-bold mt-0.5">•</span>
                  {win}
                </li>
              ))}
              {result.positives.length === 0 && (
                <li className="text-slate-400 italic text-sm">No certified green benefits found.</li>
              )}
            </ul>
          </section>
        </div>

        <div className={`p-6 rounded-2xl border-2 ${isBuy ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'}`}>
          <h3 className="text-xs font-black uppercase mb-2 opacity-80 tracking-widest text-center">Final Recommendation</h3>
          <p className="text-lg font-bold text-center leading-tight">"{result.recommendation}"</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onReset}
            className="flex-1 py-4 px-6 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 group"
          >
            New Scan
          </button>
          
          <button
            onClick={handleSaveToDevice}
            disabled={!mediaData}
            className="flex-1 py-4 px-6 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Audit
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsCard;
