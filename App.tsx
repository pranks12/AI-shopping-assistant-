
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  AppState, 
  AnalysisReport, 
  UserPreferences, 
  Recommendation, 
  ConsciousGrade,
  AgentConfig 
} from './types';
import { runRouter, runToxinShield, runPersonalShopper } from './services/geminiService';
import { ROUTER_AGENT_CONFIG, TOXIN_SHIELD_CONFIG, PERSONAL_SHOPPER_CONFIG } from './agents/configs';

const PremiumLogo = () => (
  <div className="relative group">
    <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:rotate-12 transition-transform duration-500">
      <rect width="48" height="48" rx="14" fill="#1D1D1F"/>
      <path d="M24 12C17.3726 12 12 17.3726 12 24C12 30.6274 17.3726 36 24 36C30.6274 36 36 30.6274 36 24C36 17.3726 30.6274 12 24 12Z" fill="white" fillOpacity="0.05"/>
      <circle cx="24" cy="24" r="12" stroke="white" strokeWidth="2.5" strokeOpacity="0.1"/>
      <path d="M24 16V32M16 24H32" stroke="#57CC99" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-safe rounded-full border border-brand-cream shadow-sm"></div>
  </div>
);

const App: React.FC = () => {
  const [state, setState] = useState<AppState>('onboarding');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [labOpen, setLabOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check for dev mode via URL parameter ?dev=true (case-insensitive)
  const isDevMode = useMemo(() => {
    return new URLSearchParams(window.location.search).get('dev')?.toLowerCase() === 'true';
  }, []);

  const [prefs, setPrefs] = useState<UserPreferences>({
    budget: '40',
    scent: 'Unscented',
    platform: 'Any',
    delivery: 'Shipping',
    zipCode: '',
    additionalAvoidance: '',
    healthConcern: 'Hormone Health'
  });

  // Camera Management
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isScanning) {
      setVideoReady(false);
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
          };
        }
      })
      .catch(err => {
        console.error("Camera access denied or error:", err);
        setError("Camera access required for active scanning. Please check your browser permissions.");
        setIsScanning(false);
      });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isScanning]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current && videoReady) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85).split(',')[1];
        handleProcess(base64);
      }
    }
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prefs.zipCode) setState('input');
  };

  const handleProcess = async (imageData?: string) => {
    setIsScanning(false);
    if (!inputVal && !imageData) return;
    
    setState('routing');
    setError(null);
    try {
      if (imageData) {
        setState('analyzing');
        const res = await runToxinShield({ data: imageData, mimeType: 'image/jpeg' }, TOXIN_SHIELD_CONFIG, true);
        setReport(res);
        setState('report');
      } else {
        const decision = await runRouter(inputVal, ROUTER_AGENT_CONFIG);
        if (decision.route === 'analysis') {
          setState('analyzing');
          const res = await runToxinShield(inputVal, TOXIN_SHIELD_CONFIG);
          setReport(res);
          setState('report');
        } else {
          setState('searching');
          const res = await runPersonalShopper(inputVal, prefs, PERSONAL_SHOPPER_CONFIG);
          setRecommendations(res.recommendations);
          setSources(res.sources);
          setState('recommendations');
        }
      }
    } catch (err: any) {
      console.error("Agent processing error:", err);
      setError("Our health agents encountered an error. Please try a manual search or a clearer photo.");
      setState('input');
    }
  };

  const handleHandoff = async () => {
    setState('searching');
    try {
      const gradeContext = report ? `GRADE: ${report.conscious_grade}. ANALYZED_BRAND: ${report.product_name?.split(' ')[0]}. PRODUCT_NAME: ${report.product_name}. JUSTIFICATION: ${report.grade_justification}.` : '';
      const context = `${gradeContext} TARGETING: ${report?.product_category || inputVal}. PREFERENCE: ${prefs.healthConcern}. AVOID ANALYZED BRAND IF GRADE IS LOW.`;
      
      const res = await runPersonalShopper(context, prefs, PERSONAL_SHOPPER_CONFIG);
      setRecommendations(res.recommendations);
      setSources(res.sources);
      setState('recommendations');
    } catch (err: any) {
      setError("We couldn't curate a match right now. Please try a different query.");
      setState('report');
    }
  };

  const isWizardState = ['routing', 'analyzing', 'searching'].includes(state);
  const showNav = state !== 'onboarding' && !isWizardState && !isScanning;
  const isSafe = report && (report.conscious_grade === 'A' || report.conscious_grade === 'B');

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col font-sans selection:bg-brand-peach pb-24 transition-colors duration-500">
      <nav className="px-8 py-4 flex justify-between items-center apple-blur sticky top-0 z-50 border-b border-gray-100/30">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setState('input')}>
          <PremiumLogo />
          <span className="text-xl font-extrabold tracking-tight text-brand-black whitespace-nowrap">Conscious Cart</span>
        </div>
        <div className="flex items-center gap-6">
          {isDevMode && (
            <button 
              onClick={() => setLabOpen(!labOpen)}
              className="text-[9px] font-black text-brand-gray uppercase tracking-[0.2em] hover:text-brand-black transition-all flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5"
            >
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${labOpen ? 'bg-brand-safe shadow-[0_0_8px_#57cc99]' : 'bg-gray-300'}`}></span>
              Agents
            </button>
          )}
        </div>
      </nav>

      {/* Lab/Agent Config Drawer - Strict Dev Access */}
      {isDevMode && labOpen && (
        <div className="fixed inset-0 top-[73px] bg-brand-cream z-40 overflow-y-auto p-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="max-w-6xl mx-auto space-y-12 pb-24">
            <header className="space-y-2 text-center">
              <h2 className="text-3xl font-extrabold tracking-tight">Agent Infrastructure</h2>
              <p className="text-brand-gray text-sm">Configure the behaviors of the autonomous shopping engine.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[ROUTER_AGENT_CONFIG, TOXIN_SHIELD_CONFIG, PERSONAL_SHOPPER_CONFIG].map((agent) => (
                <div key={agent.id} className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-sage">{agent.name}</h3>
                    <span className="text-[8px] font-bold text-gray-400">{agent.model}</span>
                  </div>
                  <textarea 
                    className="w-full h-80 bg-white rounded-apple p-5 text-xs text-brand-black font-mono focus:ring-2 focus:ring-brand-safe/10 border-none outline-none soft-shadow leading-relaxed"
                    defaultValue={agent.systemInstruction}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="relative w-full max-w-md aspect-[3/4] rounded-apple overflow-hidden border-2 border-brand-safe/30 shadow-2xl bg-gray-900">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`} 
              />
              {!videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-brand-safe/30 border-t-brand-safe rounded-full animate-spin"></div>
                </div>
              )}
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                 <div className="w-full h-full border-2 border-brand-safe/50 rounded shadow-[0_0_20px_rgba(87,204,153,0.2)] relative">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-safe rounded-tl"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-safe rounded-tr"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-safe rounded-bl"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-safe rounded-br"></div>
                 </div>
              </div>
              <div className="absolute top-4 left-0 right-0 text-center">
                 <p className="text-white text-[10px] font-black uppercase tracking-[0.2em] bg-black/40 px-4 py-1.5 rounded-full inline-block">Position Label in Box</p>
              </div>
           </div>
           
           <div className="mt-8 flex items-center gap-8">
              <button 
                onClick={() => setIsScanning(false)}
                className="p-4 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <button 
                onClick={handleCapture}
                disabled={!videoReady}
                className={`w-20 h-20 rounded-full border-8 border-brand-safe p-1 group active:scale-95 transition-all ${!videoReady ? 'opacity-50 grayscale' : 'bg-white'}`}
              >
                <div className="w-full h-full bg-brand-safe rounded-full group-hover:scale-90 transition-transform shadow-inner"></div>
              </button>
              <div className="w-14"></div>
           </div>
           <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <main className="flex-1 flex flex-col">
        {state === 'onboarding' && (
          <section className="flex-1 max-w-lg mx-auto w-full px-6 flex flex-col justify-center py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-3 mb-12">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight gradient-text whitespace-nowrap overflow-hidden text-ellipsis">Choose safety with confidence.</h1>
              <p className="text-sm text-brand-gray leading-snug max-w-[300px] mx-auto font-medium opacity-80">
                Conscious Cart translates chemical label mystery<br/>into clear health scores you can trust.
              </p>
            </div>
            
            <form onSubmit={handleOnboardingSubmit} className="space-y-8">
              <div className="premium-card p-8 rounded-apple-lg soft-shadow space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] ml-2">Your Zip Code</label>
                  <input 
                    required
                    placeholder="e.g. 90210"
                    className="w-full p-4 bg-brand-lightGray border-none focus:ring-2 focus:ring-brand-safe/10 rounded-apple outline-none transition-all text-lg font-bold placeholder:text-gray-300"
                    value={prefs.zipCode}
                    onChange={e => setPrefs({...prefs, zipCode: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-brand-gray uppercase tracking-[0.2em] ml-2">Priority</label>
                  <div className="grid grid-cols-1 gap-2">
                    {['Hormone & Endocrine Health', 'Lung & Respiratory Safety', 'Eczema & Skin Sensitivity', 'Whole-Home Non-Toxic'].map(concern => (
                      <button 
                        key={concern}
                        type="button"
                        onClick={() => setPrefs({...prefs, healthConcern: concern})}
                        className={`w-full p-4 text-left text-sm font-bold rounded-apple border transition-all ${prefs.healthConcern === concern ? 'bg-brand-black border-brand-black text-white shadow-lg' : 'bg-white border-gray-100 text-brand-black hover:border-brand-sage'}`}
                      >
                        {concern}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button className="btn-apple w-full py-4 rounded-apple-lg font-extrabold text-base shadow-xl">
                Enter Conscious Cart
              </button>
            </form>
          </section>
        )}

        {state === 'input' && (
          <section className="flex-1 max-w-xl mx-auto w-full px-6 flex flex-col justify-center py-12 animate-in fade-in duration-700">
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight">Search or Scan</h2>
              <p className="text-brand-gray text-base">Verify a product label or find a cleaner alternative.</p>
            </div>
            
            <div className="space-y-6">
              <div className="premium-card p-5 rounded-apple-lg soft-shadow relative">
                <textarea 
                  className="w-full h-40 p-3 bg-transparent outline-none resize-none text-xl font-bold text-brand-black placeholder:text-gray-200 leading-tight"
                  placeholder="Ask 'Best safe dish soap' or paste a link..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                />
                <div className="absolute bottom-5 right-5">
                   <button 
                    onClick={() => setIsScanning(true)}
                    className="p-3 bg-brand-safe/10 text-brand-safe rounded-apple hover:bg-brand-safe hover:text-white transition-all shadow-sm"
                   >
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                   </button>
                </div>
              </div>
              
              <button 
                onClick={() => handleProcess()}
                disabled={!inputVal}
                className="btn-apple w-full py-5 rounded-apple-lg font-extrabold text-lg shadow-xl disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
              >
                Start Analysis
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </button>
            </div>
          </section>
        )}

        {isWizardState && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-16 h-16 border-2 border-brand-sage/10 border-t-brand-black rounded-full animate-spin duration-[2s]"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className="w-2.5 h-2.5 bg-brand-safe rounded-full animate-ping"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-black">
                {state === 'routing' ? 'Routing' : state === 'analyzing' ? 'Decoding' : 'Curation'}
              </h2>
              <p className="text-[8px] text-brand-gray font-bold uppercase opacity-40">Orchestrating Agents</p>
            </div>
          </div>
        )}

        {state === 'report' && report && (
          <section className="flex-1 max-w-2xl mx-auto w-full px-6 py-12 animate-in fade-in zoom-in-95 duration-700">
            <div className={`premium-card p-10 rounded-apple-lg soft-shadow space-y-10 relative overflow-hidden border-2 ${isSafe ? 'border-brand-safe/20 bg-brand-safe/5' : 'border-brand-danger/20'}`}>
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-brand-cream border border-gray-100 text-[9px] font-black uppercase tracking-widest rounded-lg text-brand-gray">{report.product_category}</span>
                    {isSafe && (
                       <span className="px-3 py-1 bg-brand-safe text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-sm">Certified Clean</span>
                    )}
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight leading-tight">{report.product_name || 'Analysis Result'}</h2>
                </div>
                <div className={`w-24 h-24 rounded-apple flex flex-col items-center justify-center text-white font-black shadow-2xl transform rotate-3 ${report.conscious_grade === 'A' || report.conscious_grade === 'B' ? 'bg-brand-safe' : report.conscious_grade === 'C' ? 'bg-orange-400' : 'bg-brand-danger'}`}>
                   <span className="text-[9px] uppercase opacity-70 mb-1 leading-none">Grade</span>
                   <span className="text-5xl tracking-tighter leading-none">{report.conscious_grade}</span>
                </div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.3em] ml-2">Expert "Why" Summary</h4>
                  <p className="text-brand-black text-xl font-semibold leading-relaxed italic border-l-4 border-brand-sage/20 pl-6 tracking-tight">"{report.grade_justification}"</p>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-brand-gray uppercase tracking-[0.3em] ml-2">{isSafe ? 'Why it Passed' : 'Flagged Ingredients'}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {report.critical_flags.length > 0 ? report.critical_flags.map((flag, i) => (
                      <div key={i} className="p-4 bg-white/80 border border-gray-100 rounded-apple-lg shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-black text-brand-black">{flag.ingredient}</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${flag.risk_tier === 'Tier 1' ? 'bg-brand-danger text-white' : 'bg-orange-100 text-orange-800'}`}>{flag.risk_tier}</span>
                        </div>
                        <div className="text-[9px] font-black text-brand-sage uppercase tracking-widest mb-1">{flag.risk_category}</div>
                        <p className="text-[11px] text-brand-gray font-medium leading-relaxed">{flag.reason_to_avoid}</p>
                      </div>
                    )) : (
                      <div className="p-6 bg-brand-safe/10 border border-brand-safe/20 rounded-apple-lg">
                        <p className="text-brand-safe font-extrabold text-sm mb-2">Verified Hormone Safe Formulation</p>
                        <p className="text-[11px] text-brand-gray leading-relaxed font-medium">We found 0 endocrine disruptors and 0 heavy metals. This formula relies on clean, clinical-grade alternatives instead of synthetic phthalates or harsh surfactants.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <footer className="pt-6 border-t border-gray-100 mt-6">
                 <p className="text-[9px] text-brand-gray font-bold italic text-center opacity-60">
                   {report.disclaimer}
                 </p>
              </footer>
            </div>

            <div className={`mt-8 p-10 rounded-apple-lg text-center space-y-6 shadow-2xl transition-colors duration-500 ${isSafe ? 'bg-brand-sage' : 'bg-brand-black'}`}>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
                  {report.conscious_grade === 'A' ? 'Maintain your standard.' : isSafe ? 'Refine your wellness.' : 'Choose something kinder.'}
                </h3>
                <p className="text-white/70 text-sm max-w-sm mx-auto leading-relaxed">
                  {report.conscious_grade === 'A' 
                    ? `This product is excellent. Let's find complementary Grade A add-ons to optimize your routine.` 
                    : isSafe 
                    ? `Great choice, but we found a few 'Better' Grade A matches for your budget.`
                    : `We found 3 safer alternatives optimized for your wellness standards.`
                  }
                </p>
              </div>
              <button 
                onClick={() => setState('preference_handoff')}
                className="w-full py-5 bg-brand-black text-white rounded-apple-lg font-black text-lg shadow-xl hover:brightness-110 transition-all active:scale-[0.98] border border-white/10"
              >
                {report.conscious_grade === 'A' ? 'Optimize My Routine' : 'View Better Matches'}
              </button>
            </div>
          </section>
        )}

        {state === 'preference_handoff' && (
          <section className="flex-1 max-w-lg mx-auto w-full px-6 py-12 animate-in slide-in-from-right-8 duration-700">
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-3xl font-extrabold tracking-tight">Refine Your Cart</h2>
              <p className="text-brand-gray text-base">Adjust preferences for your custom curation.</p>
            </div>
            
            <div className="premium-card p-8 rounded-apple-lg soft-shadow space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gray uppercase tracking-widest ml-3">Max Price</label>
                  <input type="number" className="w-full p-4 bg-brand-cream border-none focus:ring-2 focus:ring-brand-sage/10 rounded-apple outline-none transition-all font-bold text-lg" value={prefs.budget} onChange={e => setPrefs({...prefs, budget: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-gray uppercase tracking-widest ml-3">Scent</label>
                  <select className="w-full p-4 bg-brand-cream border-none focus:ring-2 focus:ring-brand-sage/10 rounded-apple outline-none transition-all font-bold text-lg appearance-none" value={prefs.scent} onChange={e => setPrefs({...prefs, scent: e.target.value})}>
                    <option>Unscented</option><option>Citrus</option><option>Lavender</option><option>Forest</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-brand-gray uppercase tracking-widest ml-3">Fulfillment</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Any', 'Amazon', 'Target', 'Walmart'].map(store => (
                    <button 
                      key={store}
                      onClick={() => setPrefs({...prefs, platform: store})}
                      className={`py-3.5 text-xs font-black rounded-apple border transition-all ${prefs.platform === store ? 'bg-brand-black border-brand-black text-white shadow-lg' : 'bg-white border-gray-100 text-brand-black hover:border-brand-sage'}`}
                    >
                      {store}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={handleHandoff} className="btn-apple w-full mt-8 py-5 rounded-apple-lg font-extrabold text-lg shadow-2xl">
              Match My Standards
            </button>
          </section>
        )}

        {state === 'recommendations' && (
          <section className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 animate-in fade-in duration-1000">
            <header className="flex justify-between items-end mb-12 px-2">
              <div className="space-y-2">
                <span className="px-3 py-1 bg-brand-safe text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-lg">Curation Active</span>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter gradient-text">Your Conscious Matches.</h2>
              </div>
              <button onClick={() => setState('input')} className="text-[10px] font-black text-brand-sage uppercase tracking-[0.2em] hover:text-brand-black border-b border-brand-sage/20 transition-all">New Search</button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {recommendations.map((rec, i) => (
                <div key={i} className={`premium-card p-10 rounded-apple-lg soft-shadow flex flex-col justify-between ${i === 0 ? 'md:col-span-2 border-brand-safe/30' : ''}`}>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start gap-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-brand-sage uppercase tracking-[0.2em]">{rec.brand}</span>
                        <h3 className="text-2xl font-extrabold tracking-tight leading-tight">{rec.name}</h3>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-2xl font-extrabold text-brand-black tracking-tighter">{rec.price_estimate}</span>
                        <div className="text-[10px] font-black text-brand-gray/60 uppercase tracking-widest mt-1 bg-brand-lightGray px-2 py-0.5 rounded">{rec.unit_price}</div>
                        <div className="text-[8px] font-black text-brand-safe uppercase mt-2 bg-brand-safe/5 px-2 py-1 rounded-md">{rec.match_score} Match</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {rec.highlights.map((h, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-brand-cream text-brand-black text-[9px] font-black rounded-apple border border-gray-100 uppercase tracking-widest shadow-sm">{h}</span>
                      ))}
                    </div>

                    <p className="text-brand-gray text-base leading-relaxed font-medium italic border-l-4 border-brand-peach pl-6">"{rec.why_it_is_safe}"</p>
                  </div>

                  <a 
                    href={rec.link} 
                    target="_blank" 
                    className="btn-apple mt-10 w-full py-4 rounded-apple-lg font-extrabold text-base text-center shadow-xl flex items-center justify-center gap-2 group"
                  >
                    View Product
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </a>
                </div>
              ))}
            </div>

            <footer className="text-center space-y-10 pb-16 border-t border-gray-100 pt-12">
               <div className="flex justify-center gap-8">
                 {sources.slice(0, 3).map((s, idx) => (
                   <a key={idx} href={s.web?.uri} className="text-[9px] font-black text-brand-gray/30 hover:text-brand-black uppercase tracking-[0.2em] transition-colors">
                     Verify {idx + 1}
                   </a>
                 ))}
               </div>
               <p className="max-w-md mx-auto text-[9px] text-brand-gray font-bold leading-relaxed uppercase tracking-[0.2em] opacity-20 text-center">
                 © 2025 Conscious Cart. Curated Wellness.
               </p>
            </footer>
          </section>
        )}

        {(state === 'profile' || state === 'history') && (
           <section className="flex-1 max-w-xl mx-auto w-full px-6 py-12 animate-in fade-in duration-700">
             <div className="text-center space-y-3 mb-10">
               <h2 className="text-3xl font-extrabold tracking-tight">{state === 'profile' ? 'Profile' : 'Recent Scans'}</h2>
               <p className="text-brand-gray text-base">{state === 'profile' ? 'Adjust your wellness standards.' : 'Review your journey.'}</p>
             </div>
             <div className="premium-card p-8 rounded-apple-lg soft-shadow flex items-center justify-center text-brand-gray font-medium italic min-h-[200px]">
               Feature coming in the next release.
             </div>
             <button onClick={() => setState('input')} className="btn-apple w-full mt-8 py-4 rounded-apple-lg">Back to Scan</button>
           </section>
        )}
      </main>

      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 apple-blur border-t border-gray-100/30 px-8 py-5 z-50 flex justify-around items-center">
          <button 
            onClick={() => setState('input')}
            className={`flex flex-col items-center gap-1.5 transition-all ${['input', 'report', 'recommendations', 'routing', 'analyzing', 'searching', 'preference_handoff'].includes(state) ? 'text-brand-black scale-105' : 'text-brand-gray hover:text-brand-black'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Scan</span>
          </button>
          <button 
            onClick={() => setState('history')}
            className={`flex flex-col items-center gap-1.5 transition-all ${state === 'history' ? 'text-brand-black scale-105' : 'text-brand-gray hover:text-brand-black'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
          </button>
          <button 
            onClick={() => setState('profile')}
            className={`flex flex-col items-center gap-1.5 transition-all ${state === 'profile' ? 'text-brand-black scale-105' : 'text-brand-gray hover:text-brand-black'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-widest">Profile</span>
          </button>
        </nav>
      )}

      {error && (
        <div className="fixed bottom-24 left-6 right-6 p-4 bg-brand-danger text-white rounded-apple-lg shadow-2xl animate-in slide-in-from-bottom-4 flex justify-between items-center z-[60]">
          <p className="font-bold text-sm leading-tight pr-4">{error}</p>
          <button onClick={() => setError(null)} className="p-1.5 hover:bg-white/20 rounded-lg shrink-0">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
