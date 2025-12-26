
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppState, AnalysisResult, Tab } from './types';
import { analyzeProduct } from './services/geminiService';
import ResultsCard from './components/ResultsCard';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.SCANNER);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [mediaData, setMediaData] = useState<{url: string, type: string} | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTimer, setRecordTimer] = useState(0);

  // Zoom related states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  
  const currentZoomRef = useRef(1);
  const lastPinchDistanceRef = useRef<number | null>(null);

  // Initialize history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('eco_verify_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
    setZoomCapabilities(null);
    setZoomLevel(1);
    currentZoomRef.current = 1;
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: captureMode === 'video' 
      });
      
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;

      if (capabilities.zoom) {
        setZoomCapabilities({
          min: capabilities.zoom.min,
          max: capabilities.zoom.max,
          step: capabilities.zoom.step || 0.1
        });
        setZoomLevel(capabilities.zoom.min || 1);
        currentZoomRef.current = capabilities.zoom.min || 1;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setFacingMode(mode);
        setMediaData(null);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check permissions.");
    }
  };

  // Fixed toggleCamera error by defining the function
  const toggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextMode);
  };

  const applyZoom = useCallback(async (value: number) => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.zoom) {
        const clampedValue = Math.max(capabilities.zoom.min, Math.min(capabilities.zoom.max, value));
        await track.applyConstraints({ advanced: [{ zoom: clampedValue }] as any });
        setZoomLevel(clampedValue);
        currentZoomRef.current = clampedValue;
      }
    } catch (e) {
      console.warn("Failed to apply zoom:", e);
    }
  }, []);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setMediaData({ url: dataUrl, type: 'image/jpeg' });
        stopCamera();
      }
    }
  };

  const startRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setMediaData({ url, type: mimeType });
      stopCamera();
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setRecordTimer(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordTimer(prev => {
        if (prev >= 10) { stopRecording(); return prev; }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
    setIsRecording(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaData({ url: reader.result as string, type: file.type });
        setAppState(AppState.IDLE);
        setError(null);
        setIsCameraActive(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!mediaData) return;
    setAppState(AppState.LOADING);
    setError(null);
    try {
      let base64Data = '';
      if (mediaData.url.startsWith('data:')) {
        base64Data = mediaData.url.split(',')[1];
      } else {
        const response = await fetch(mediaData.url);
        const blob = await response.blob();
        base64Data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }
      
      const analysis = await analyzeProduct(base64Data, mediaData.type);
      setResult(analysis);
      
      // Update history
      const newHistory = [analysis, ...history].slice(0, 50); // Keep last 50
      setHistory(newHistory);
      localStorage.setItem('eco_verify_history', JSON.stringify(newHistory));
      
      setAppState(AppState.RESULT);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Analysis failed. Please try a clearer shot.');
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    stopCamera();
    setMediaData(null);
    setResult(null);
    setAppState(AppState.IDLE);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const viewHistoryItem = (item: AnalysisResult) => {
    setResult(item);
    setMediaData(null); // We don't store high-res media in local storage usually
    setAppState(AppState.RESULT);
    setActiveTab(Tab.SCANNER);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your audit history?")) {
      setHistory([]);
      localStorage.removeItem('eco_verify_history');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center pb-24">
      <nav className="w-full bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">EcoVerify</span>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl px-4 py-8 flex flex-col items-center">
        {activeTab === Tab.SCANNER ? (
          <>
            {appState === AppState.IDLE || appState === AppState.LOADING || appState === AppState.ERROR ? (
              <div className="w-full flex flex-col items-center text-center space-y-12">
                <header className="space-y-4 max-w-2xl">
                  <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
                    Scan. <span className="text-emerald-600">Verify.</span>
                  </h1>
                  <p className="text-lg text-slate-600 leading-relaxed">
                    Uncover environmental truths and avoid greenwashing.
                  </p>
                </header>

                <div className="w-full max-md bg-white p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 border border-slate-100 space-y-6">
                  <div className="relative overflow-hidden bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 min-h-[350px] flex flex-col items-center justify-center transition-all duration-300">
                    {isCameraActive ? (
                      <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline muted={!isRecording} className="w-full h-full object-cover rounded-3xl" />
                        {zoomCapabilities && (
                          <div className="absolute top-20 bg-black/40 backdrop-blur px-3 py-1 rounded-full text-white text-[10px] font-bold">
                            {zoomLevel.toFixed(1)}x
                          </div>
                        )}
                        {isRecording && (
                          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                            <div className="h-2 w-2 bg-white rounded-full"></div>
                            REC {recordTimer}s
                          </div>
                        )}
                        <div className="absolute bottom-6 flex flex-col items-center gap-4 w-full px-6">
                          {zoomCapabilities && (
                            <div className="w-full px-8 pb-2">
                              <input 
                                type="range" min={zoomCapabilities.min} max={zoomCapabilities.max} step={zoomCapabilities.step} 
                                value={zoomLevel} onChange={(e) => applyZoom(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between w-full">
                            <button onClick={stopCamera} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full hover:bg-white/30 transition-all">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                            <button 
                              onClick={captureMode === 'photo' ? capturePhoto : (isRecording ? stopRecording : startRecording)}
                              className={`p-5 rounded-full shadow-lg active:scale-90 transition-all border-4 border-white/20 ${captureMode === 'video' && isRecording ? 'bg-rose-600' : 'bg-emerald-600'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              </svg>
                            </button>
                            <button onClick={toggleCamera} disabled={isRecording} className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full transition-all hover:bg-white/30">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : mediaData ? (
                      <div className="relative w-full h-full p-4 flex flex-col items-center">
                        <div className="relative group w-full aspect-video md:aspect-square rounded-2xl overflow-hidden shadow-md bg-black">
                          {mediaData.type.startsWith('video') ? (
                            <video src={mediaData.url} controls className="w-full h-full object-contain" />
                          ) : (
                            <img src={mediaData.url} alt="Preview" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute top-4 right-4 z-20 flex gap-2">
                            <button onClick={reset} className="bg-rose-600/90 backdrop-blur text-white p-2 rounded-full hover:bg-rose-700">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-6">
                        <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 mx-auto w-fit">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Scan Product</h3>
                        <div className="flex flex-col gap-3">
                          <button onClick={() => startCamera()} className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95">
                            Open Scanner
                          </button>
                          <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 w-full py-4 px-6 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95">
                            Upload File
                          </button>
                        </div>
                      </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl text-sm font-medium animate-in fade-in zoom-in duration-300">
                      {error}
                    </div>
                  )}

                  <button
                    disabled={!mediaData || appState === AppState.LOADING}
                    onClick={handleAnalyze}
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 shadow-lg flex items-center justify-center gap-3
                      ${!mediaData || appState === AppState.LOADING 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'}`}
                  >
                    {appState === AppState.LOADING ? 'Analyzing...' : 'Start Audit'}
                  </button>
                </div>
              </div>
            ) : (
              result && <ResultsCard result={result} mediaData={mediaData} onReset={reset} />
            )}
          </>
        ) : (
          <div className="w-full max-w-2xl space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-slate-900">Recent Audits</h2>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-rose-600 text-sm font-semibold hover:underline">
                  Clear All
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-4">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500">Your audit history will appear here.</p>
                <button 
                  onClick={() => setActiveTab(Tab.SCANNER)}
                  className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-xl"
                >
                  Start First Scan
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => viewHistoryItem(item)}
                    className="w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all text-left group"
                  >
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${item.sustainabilityScore >= 70 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {item.sustainabilityScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{item.productName}</h3>
                      <p className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleDateString()} • {new Date(item.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div className="text-slate-300 group-hover:text-emerald-600 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab(Tab.SCANNER)}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === Tab.SCANNER ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={activeTab === Tab.SCANNER ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest">Scanner</span>
        </button>
        <button 
          onClick={() => setActiveTab(Tab.HISTORY)}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === Tab.HISTORY ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill={activeTab === Tab.HISTORY ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-widest">History</span>
        </button>
      </div>
    </div>
  );
};

export default App;
