import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Search, Book, MessageSquare, CheckCircle2, Send, Map } from 'lucide-react';

const USER_ID = 'student_01';
const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [route, setRoute] = useState('/');
  const [userProfile, setUserProfile] = useState({ name: 'Explorer' });

  // GLOBAL STATE: This prevents the chat from deleting when changing tabs!
  const [globalChatHistory, setGlobalChatHistory] = useState([]);
  const [globalSavedTracks, setGlobalSavedTracks] = useState([]);
  const [currentMode, setCurrentMode] = useState('asking_topic');
  const [pendingTopic, setPendingTopic] = useState('');
  const [lastLessonText, setLastLessonText] = useState('');

  const navigate = (path) => {
    setRoute(path);
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden text-white font-sans selection:bg-orange-500/50 selection:text-white relative z-0 flex flex-col">
      
      {/* GLOBAL DYNAMIC BACKGROUND */}
      <iframe 
        src="https://colorflow-embed.b-cdn.net/embed.html#e=LeQBfeBg" 
        style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          border: 'none', zIndex: -1, pointerEvents: 'none'
        }}
        title="Fluid Background"
      />

      {route === '/' && <LandingPage onNavigate={navigate} />}
      {route === '/onboarding' && <OnboardingFlow onNavigate={navigate} onComplete={setUserProfile} />}
      
      {/* App Layout Wraps the Main Pages */}
      {(route === '/home' || route === '/history' || route === '/learnings') && (
        <AppLayout currentRoute={route} onNavigate={navigate}>
          {route === '/home' && (
            <HomeDashboard 
              profile={userProfile} 
              chatHistory={globalChatHistory} setChatHistory={setGlobalChatHistory}
              currentMode={currentMode} setCurrentMode={setCurrentMode}
              pendingTopic={pendingTopic} setPendingTopic={setPendingTopic}
              lastLessonText={lastLessonText} setLastLessonText={setLastLessonText}
              savedTracks={globalSavedTracks} setSavedTracks={setGlobalSavedTracks}
            />
          )}
          {route === '/history' && <HistoryPage chatHistory={globalChatHistory} />}
          {route === '/learnings' && <LearningsPage savedTracks={globalSavedTracks} />}
        </AppLayout>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Markdown / Obsidian Code Block Parser
// ---------------------------------------------------------
function FormattedMessage({ text }) {
  if (!text) return null;
  // Split the text by the Markdown code block backticks
  const parts = text.split('```');
  
  return parts.map((part, i) => {
    // Odd indices are the code blocks
    if (i % 2 === 1) {
      const lines = part.split('\n');
      const lang = lines[0].trim();
      const code = lines.slice(1).join('\n').trim();
      
      return (
        <div key={i} className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          {lang && (
            <div className="bg-[#2d2d2d] text-stone-400 text-xs px-4 py-1.5 uppercase font-bold tracking-wider">
              {lang}
            </div>
          )}
          {/* OBSIDIAN STYLE TERMINAL */}
          <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-5 overflow-x-auto font-mono text-sm leading-relaxed">
            <code>{code || part}</code>
          </pre>
        </div>
      );
    }
    // Even indices are normal text
    return (
      <span key={i}>
        {part.split('\n').map((line, j) => (
          <span key={j} className="block mb-2 drop-shadow-md">{line}</span>
        ))}
      </span>
    );
  });
}


// ---------------------------------------------------------
// 1. Landing Page
// ---------------------------------------------------------
function LandingPage({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center">
      <div className="bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 tracking-tight font-bold drop-shadow-lg">Gurukul.</h1>
        <p className="text-xl md:text-2xl text-stone-200 mb-12 max-w-2xl leading-relaxed font-medium drop-shadow-md">
          An AI tutor that builds a personalized learning roadmap. Adapted to your interests, pace, and background.
        </p>
        <button onClick={() => onNavigate('/onboarding')} className="bg-orange-600/90 backdrop-blur-md text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-orange-500 transition-colors shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center gap-2 mx-auto">
          Get Started <ArrowRight size="{20}"/>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. Onboarding Flow
// ---------------------------------------------------------
function OnboardingFlow({ onNavigate, onComplete }) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ age: '', interest: '', dialect: '', prepLevel: 'Novice (Exploring fundamentals)', psychScore: 3 });

  const isAgeValid = formData.age !== '' && Number(formData.age) >= 8 && Number(formData.age) <= 100;
  const isStep1Valid = isAgeValid && formData.interest.trim().length > 0 && formData.dialect.trim().length > 0;

  const handleNext = async () => {
    if (step === 1) setStep(2);
    else {
      setIsGenerating(true);
      try {
        await fetch(`${API_BASE}/onboard/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: USER_ID, stated_age: formData.age, domain: formData.interest, inspiration: formData.prepLevel, dislikes: formData.dialect })
        });
        setIsGenerating(false);
        onComplete({ name: 'Explorer', interests: formData.interest });
        onNavigate('/home');
      } catch (err) { alert("Ensure Django server is running!"); setIsGenerating(false); }
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 min-h-[450px] flex flex-col justify-center transition-all">
        {isGenerating ? <div className="text-center animate-pulse text-white font-serif text-2xl font-bold drop-shadow-md">Connecting to Gurukul AI...</div> : (
          <>
            {step === 1 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-white mb-2 font-bold drop-shadow-lg">A bit about you</h2>
                <div className="space-y-5 mt-6">
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-bold text-stone-200 mb-2 drop-shadow-md">Age</label>
                      <input type="number" min="8" max="100" value={formData.age} 
                        onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val !== '') { val = Number(val).toString(); if (Number(val) > 100) val = '100'; }
                          setFormData({...formData, age: val});
                        }} 
                        className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 text-white placeholder:text-stone-400 font-bold" placeholder="e.g. 21" />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-bold text-stone-200 mb-2 drop-shadow-md">Preparation Level</label>
                      <select value={formData.prepLevel} onChange={(e) => setFormData({...formData, prepLevel: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 text-white font-bold [&>option]:text-black">
                        <option>Novice (Exploring fundamentals)</option>
                        <option>Intermediate (Familiar with basics)</option>
                        <option>Expert (Deep diving)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-200 mb-1 drop-shadow-md">What do you love? (Hobbies, Domains)</label>
                    <input type="text" value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 text-white placeholder:text-stone-400 font-bold" placeholder="e.g. Motorsports, Anime..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-stone-200 mb-1 drop-shadow-md">Location & Languages Spoken</label>
                    <input type="text" value={formData.dialect} onChange={(e) => setFormData({...formData, dialect: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 text-white placeholder:text-stone-400 font-bold" placeholder="e.g. Coimbatore, Tanglish..." />
                  </div>
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-white mb-8 font-bold drop-shadow-lg">Learning Behavior</h2>
                <p className="text-white mb-8 text-lg font-serif italic drop-shadow-md font-medium">"I prefer jumping straight into solving problems rather than reading theory first."</p>
                <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-4 rounded-full border border-white/20 shadow-inner">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button key={val} onClick={() => setFormData({...formData, psychScore: val})} className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all border-2 ${formData.psychScore === val ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] scale-110' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}>{val}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-12 flex justify-between items-center">
              {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-stone-300 font-bold hover:text-white drop-shadow-md">Back</button> : <div/>}
              <button onClick={handleNext} disabled={step === 1 && !isStep1Valid} className="bg-orange-600/90 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all ml-auto">
                {step === 2 ? 'Complete Profile' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Shared Layout (Fixed Topbar)
// ---------------------------------------------------------
function AppLayout({ children, currentRoute, onNavigate }) {
  const navItems = [
    { id: '/home', label: 'Home', icon: Search },
    { id: '/learnings', label: 'Library', icon: Book },
    { id: '/history', label: 'History', icon: MessageSquare }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* STATIC FIXED TOPBAR */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-50">
        <div className="flex items-center justify-between p-4 px-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="font-serif text-2xl text-white cursor-pointer font-bold drop-shadow-lg" onClick={() => onNavigate('/')}>Gurukul.</div>
          <nav className="flex bg-black/20 backdrop-blur-md rounded-full px-2 py-2 shadow-inner border border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${currentRoute === item.id ? 'bg-white/20 text-white shadow-sm' : 'text-stone-300 hover:text-white hover:bg-white/10'}`}>
                  <Icon size="{16}"/> <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white font-serif font-bold border border-white/30 shadow-sm drop-shadow-md">U</div>
        </div>
      </header>
      
      {/* Main Content Area (Controls its own internal scroll) */}
      <main className="flex-1 flex flex-col pt-32 w-full max-w-4xl mx-auto overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// 3. Home Dashboard (Internal scrolling chat)
// ---------------------------------------------------------
function HomeDashboard({ profile, chatHistory, setChatHistory, currentMode, setCurrentMode, pendingTopic, setPendingTopic, lastLessonText, setLastLessonText, savedTracks, setSavedTracks }) {
  const [icebreakerNeeded, setIcebreakerNeeded] = useState(false);
  const [icebreakerReply, setIcebreakerReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatScrollRef = useRef(null);

  // Auto-scroll inside the chat container
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, isLoading, icebreakerNeeded]);

  useEffect(() => {
    fetch(`${API_BASE}/icebreaker/${USER_ID}/status/`)
      .then(res => res.json())
      .then(data => setIcebreakerNeeded(data.needed))
      .catch(console.error);
  }, []);

  const handleIcebreakerSubmit = async () => {
    if(!icebreakerReply) return;
    setIsSubmitting(true);
    await fetch(`${API_BASE}/icebreaker/${USER_ID}/submit/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reply: icebreakerReply })
    });
    setIcebreakerNeeded(false);
    setIsSubmitting(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setInputValue(''); 
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

    if (currentMode === 'asking_topic') {
      setPendingTopic(userText);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'ai', text: `Would you like me to generate a personalized learning track and modules for "${userText}"?`, isConfirmation: true }]);
        setCurrentMode('confirming_track');
      }, 500); 
    } 
    else if (currentMode === 'confirming_track') {
      if(userText.toLowerCase().includes('yes') || userText.toLowerCase().includes('ok')) handleConfirmTrack(true);
      else handleConfirmTrack(false);
    }
    else if (currentMode === 'answering_question') {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/evaluate/${USER_ID}/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: userText, lesson_text: lastLessonText })
        });
        const data = await res.json();
        let feedbackText = data.passed ? "🟢 Brilliant! " : "🔴 Not quite right. ";
        feedbackText += data.feedback;
        if (data.message) feedbackText += `\n\n📌 *Mentor Note: ${data.message}*`;

        setChatHistory(prev => [...prev, { role: 'ai', text: feedbackText, isFeedback: true, passed: data.passed }]);
        if (data.passed) setCurrentMode('asking_topic');
      } catch(err) { console.error(err); }
      setIsLoading(false);
    }
  };

  const handleConfirmTrack = async (isConfirmed) => {
    if (isConfirmed) {
      setChatHistory(prev => [...prev, { role: 'user', text: "Yes, let's do it!" }]);
      setSavedTracks(prev => [...prev, pendingTopic]); // Save to library!
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/lesson/${USER_ID}/?topic=${encodeURIComponent(pendingTopic)}`);
        const data = await res.json();
        setLastLessonText(data.lesson_text);
        setChatHistory(prev => [...prev, { role: 'ai', text: data.lesson_text }]);
        setCurrentMode('answering_question');
      } catch (err) { console.error(err); }
      setIsLoading(false);
    } else {
      setChatHistory(prev => [...prev, { role: 'user', text: "No, let's pick something else." }]);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { role: 'ai', text: "No problem! What would you like to explore instead?" }]);
        setCurrentMode('asking_topic');
      }, 500);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden pb-6">
      
      {/* SCROLLING CHAT AREA */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 space-y-6 pb-4">
        {icebreakerNeeded && (
          <div className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-lg rounded-3xl p-6 mb-6 animate-in fade-in">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-white" size="{20}"/>
              <h3 className="font-serif text-lg text-white font-bold">Daily Check-In</h3>
            </div>
            <p className="text-stone-200 font-medium mb-4">Before we start, what's the latest talk of the town in your world today?</p>
            <div className="flex gap-2">
              <input type="text" value={icebreakerReply} onChange={e => setIcebreakerReply(e.target.value)} disabled={isSubmitting} className="flex-1 p-3 rounded-xl border border-white/20 bg-black/20 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white font-bold" />
              <button onClick={handleIcebreakerSubmit} disabled={isSubmitting} className="bg-orange-600 border border-orange-500 text-white px-6 rounded-xl font-bold">
                {isSubmitting ? "Updating..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {chatHistory.length === 0 && !icebreakerNeeded && (
          <div className="m-auto text-center mt-20 animate-in fade-in bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] shadow-lg border border-white/20">
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 font-bold">Hi, {profile.name}</h1>
            <p className="text-stone-200 text-lg font-bold">What do you want to learn today?</p>
          </div>
        )}

        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-6 rounded-3xl text-lg leading-relaxed shadow-lg backdrop-blur-2xl ${
              msg.role === 'user' 
                ? 'bg-black/40 text-white rounded-br-sm border border-white/20 font-bold' // Sleek Dark User Bubble
                : msg.isFeedback 
                  ? (msg.passed ? 'bg-emerald-900/60 border border-emerald-400/50 text-white rounded-bl-sm font-bold' : 'bg-red-900/60 border border-red-400/50 text-white rounded-bl-sm font-bold')
                  : 'bg-white/10 border border-white/20 text-white rounded-bl-sm font-serif font-medium' 
            }`}>
              
              {/* Parses Markdown Code Blocks automatically! */}
              <FormattedMessage text="{msg.text}"/>
              
              {msg.isConfirmation && (
                <div className="mt-6 flex gap-3">
                   <button onClick={() => handleConfirmTrack(true)} className="bg-white/20 hover:bg-white/30 border border-white/30 px-6 py-2 rounded-full text-white font-bold transition-all shadow-sm flex items-center gap-2">
                     <CheckCircle2 size="{18}"/> Yes, build the track!
                   </button>
                   <button onClick={() => handleConfirmTrack(false)} className="bg-black/40 hover:bg-black/60 border border-white/10 px-6 py-2 rounded-full text-stone-300 font-bold transition-all">
                     No, wait.
                   </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl rounded-bl-sm flex gap-2 items-center">
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce delay-100"></div>
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED INPUT BAR */}
      <div className="px-4 shrink-0">
        <div className="bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex items-center mx-2">
          <input 
            type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={currentMode === 'asking_topic' ? "Enter a concept to learn..." : currentMode === 'confirming_track' ? "Click a button above..." : "Type your answer..."} 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-lg text-white placeholder:text-stone-400 font-bold drop-shadow-md" disabled={isLoading || currentMode === 'confirming_track'}
          />
          <button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim() || currentMode === 'confirming_track'} className="aspect-square h-14 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 border border-white/30 disabled:opacity-30 transition-all shadow-lg mr-1">
            <ArrowRight size="{24}"/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 4. History Page (Now shows global state!)
// ---------------------------------------------------------
function HistoryPage({ chatHistory }) { 
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-10">
      <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] min-h-[50vh]">
        <h2 className="text-3xl font-serif text-white font-bold drop-shadow-lg mb-8 text-center border-b border-white/20 pb-4">Conversation Log</h2>
        {chatHistory.length === 0 ? (
          <p className="text-stone-300 text-center font-medium mt-10">No history yet. Start learning!</p>
        ) : (
          <div className="space-y-6">
            {chatHistory.map((msg, i) => (
               <div key={i} className={`p-4 rounded-2xl border ${msg.role === 'user' ? 'bg-black/30 border-white/10 ml-auto max-w-[80%]' : 'bg-white/10 border-white/20 mr-auto max-w-[90%]'}`}>
                 <div className="text-xs text-stone-400 font-bold mb-2 uppercase tracking-wider">{msg.role === 'user' ? 'You' : 'Gurukul AI'}</div>
                 <div className="font-medium text-stone-100"><FormattedMessage text="{msg.text}"/></div>
               </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ); 
}

// ---------------------------------------------------------
// 5. Library Page (Now shows saved tracks!)
// ---------------------------------------------------------
function LearningsPage({ savedTracks }) { 
  return (
    <div className="flex-1 overflow-y-auto px-4 pb-10">
      <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[3rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] min-h-[50vh]">
        <h2 className="text-3xl font-serif text-white font-bold drop-shadow-lg mb-8 text-center border-b border-white/20 pb-4">Your Saved Tracks</h2>
        {savedTracks.length === 0 ? (
          <p className="text-stone-300 text-center font-medium mt-10">You haven't generated any tracks yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 mt-6">
            {savedTracks.map((track, i) => (
              <div key={i} className="bg-black/40 border border-white/20 p-6 rounded-3xl flex items-center justify-between hover:bg-black/50 transition-all cursor-pointer shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-600/20 text-orange-400 p-3 rounded-2xl"><Map size="{24}"/></div>
                  <div>
                    <h3 className="font-bold text-xl text-white drop-shadow-md capitalize">{track}</h3>
                    <p className="text-stone-400 text-sm font-medium mt-1">Generated by Gurukul AI</p>
                  </div>
                </div>
                <ArrowRight className="text-stone-500"/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  ); 
}