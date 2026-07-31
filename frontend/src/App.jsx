import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Search, Book, MessageSquare, CheckCircle2, Send, Map } from 'lucide-react';

const USER_ID = 'student_01';
const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [route, setRoute] = useState('/');
  const [userProfile, setUserProfile] = useState({ name: 'Explorer' });

  const navigate = (path) => {
    window.scrollTo(0,0);
    setRoute(path);
  };

  return (
    // Fixed the text selection color to be highly visible on dark backgrounds
    <div className="min-h-screen text-white font-sans selection:bg-orange-500/50 selection:text-white relative z-0">
      
      {/* GLOBAL DYNAMIC BACKGROUND */}
      <iframe 
        src="https://colorflow-embed.b-cdn.net/embed.html#e=LeQBfeBg" 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          border: 'none',
          zIndex: -1,
          pointerEvents: 'none'
        }}
        title="Fluid Background"
      />

      {route === '/' && <LandingPage onNavigate={navigate} />}
      {route === '/onboarding' && <OnboardingFlow onNavigate={navigate} onComplete={setUserProfile} />}
      {route === '/home' && <HomeDashboard onNavigate={navigate} profile={userProfile} />}
      {route === '/history' && <HistoryPage onNavigate={navigate} />}
      {route === '/learnings' && <LearningsPage onNavigate={navigate} />}
    </div>
  );
}

// ---------------------------------------------------------
// 1. Landing Page
// ---------------------------------------------------------
function LandingPage({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-4xl mx-auto text-center">
      <div className="bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
        <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 tracking-tight font-bold drop-shadow-lg">Gurukul.</h1>
        <p className="text-xl md:text-2xl text-stone-200 mb-12 max-w-2xl leading-relaxed font-medium drop-shadow-md">
          An AI tutor that builds a personalized learning roadmap. Adapted to your interests, pace, and background.
        </p>
        <button onClick={() => onNavigate('/onboarding')} className="bg-orange-600/90 backdrop-blur-md text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-orange-500 transition-colors shadow-[0_0_20px_rgba(234,88,12,0.4)] flex items-center gap-2 mx-auto">
          Get Started <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. Onboarding Flow (With Age Constraint Fix)
// ---------------------------------------------------------
function OnboardingFlow({ onNavigate, onComplete }) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ 
    age: '', 
    interest: '', 
    dialect: '',
    prepLevel: 'Novice (Exploring fundamentals)', 
    psychScore: 3 
  });

  // Strict Validation: Age must be >= 8 and <= 100
  const isAgeValid = formData.age !== '' && Number(formData.age) >= 8 && Number(formData.age) <= 100;
  const isStep1Valid = isAgeValid && formData.interest.trim().length > 0 && formData.dialect.trim().length > 0;

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else {
      setIsGenerating(true);
      try {
        await fetch(`${API_BASE}/onboard/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: USER_ID,
            stated_age: formData.age,
            domain: formData.interest,
            inspiration: formData.prepLevel,
            dislikes: formData.dialect
          })
        });
        setIsGenerating(false);
        onComplete({ name: 'Explorer', interests: formData.interest });
        onNavigate('/home');
      } catch (err) {
        console.error(err);
        alert("Ensure Django server is running!");
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-2xl p-8 md:p-12 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 min-h-[450px] flex flex-col justify-center transition-all">
        {isGenerating ? (
          <div className="text-center animate-pulse text-white font-serif text-2xl font-bold drop-shadow-md">Connecting to Gurukul AI...</div>
        ) : (
          <>
            {step === 1 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-white mb-2 font-bold drop-shadow-lg">A bit about you</h2>
                <p className="text-stone-300 mb-8 text-sm font-medium drop-shadow-md">Help us tailor the experience. You can enter multiple answers separated by commas.</p>
                
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-bold text-stone-200 mb-2 drop-shadow-md">Age</label>
                      <input 
                        type="number" 
                        min="8"
                        max="100"
                        value={formData.age} 
                        
                        // 1. Block negative signs, decimals, and math letters on type
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        
                        // 2. Cap the max value at 100 on type
                        onChange={(e) => {
                          let val = e.target.value;
                          
                          if (val !== '') {
                            // Convert to number to remove leading zeros (e.g., "09" -> "9")
                            val = Number(val).toString(); 
                            
                            // If they type more than 100, force it back to 100
                            if (Number(val) > 100) {
                              val = '100';
                            }
                          }
                          
                          setFormData({...formData, age: val});
                        }} 
                        
                        className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 transition-all text-white placeholder:text-stone-400 font-bold" 
                        placeholder="e.g. 21" 
                      />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-bold text-stone-200 mb-2 drop-shadow-md">Preparation Level</label>
                      <select value={formData.prepLevel} onChange={(e) => setFormData({...formData, prepLevel: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 transition-all text-white font-bold [&>option]:text-black">
                        <option>Novice (Exploring fundamentals)</option>
                        <option>Intermediate (Familiar with basics)</option>
                        <option>Expert (Deep diving)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-200 mb-1 drop-shadow-md">What do you love? (Hobbies, Domains)</label>
                    <input type="text" value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 transition-all text-white placeholder:text-stone-400 font-bold" placeholder="e.g. Motorsports, Anime, History..." />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-stone-200 mb-1 drop-shadow-md">Location & Languages Spoken</label>
                    <input type="text" value={formData.dialect} onChange={(e) => setFormData({...formData, dialect: e.target.value})} className="w-full p-4 rounded-2xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 transition-all text-white placeholder:text-stone-400 font-bold" placeholder="e.g. Coimbatore, Kongu Tamil, English..." />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-white mb-8 font-bold drop-shadow-lg">Learning Behavior</h2>
                <p className="text-white mb-8 text-lg font-serif italic drop-shadow-md font-medium">"I prefer jumping straight into solving problems rather than reading theory first."</p>
                
                <div className="flex justify-between items-center px-1 mb-3 text-xs font-bold text-stone-300 uppercase tracking-wider drop-shadow-md">
                  <span>Disagree</span>
                  <span>Neutral</span>
                  <span>Agree</span>
                </div>
                
                <div className="flex justify-between items-center bg-black/20 backdrop-blur-md p-4 rounded-full border border-white/20 shadow-inner">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button 
                      key={val} 
                      onClick={() => setFormData({...formData, psychScore: val})}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all border-2 ${formData.psychScore === val ? 'bg-orange-600 border-orange-400 text-white shadow-[0_0_15px_rgba(234,88,12,0.5)] scale-110' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 flex justify-between items-center">
              {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-stone-300 font-bold hover:text-white drop-shadow-md">Back</button> : <div/>}
              <button 
                onClick={handleNext} 
                disabled={step === 1 && !isStep1Valid}
                className="bg-orange-600/90 backdrop-blur-sm text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all ml-auto"
              >
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
// Shared Layout (Fixed Topbar & Main Window Scroller)
// ---------------------------------------------------------
function AppLayout({ children, currentRoute, onNavigate }) {
  const navItems = [
    { id: '/home', label: 'Home', icon: Search },
    { id: '/learnings', label: 'Library', icon: Book },
    { id: '/history', label: 'History', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen flex flex-col mx-auto">
      {/* FIXED TOPBAR */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-50">
        <div className="flex items-center justify-between p-4 px-8 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
          <div className="font-serif text-2xl text-white cursor-pointer font-bold drop-shadow-lg" onClick={() => onNavigate('/')}>Gurukul.</div>
          
          <nav className="flex bg-black/20 backdrop-blur-md rounded-full px-2 py-2 shadow-inner border border-white/10">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${currentRoute === item.id ? 'bg-white/20 text-white shadow-sm' : 'text-stone-300 hover:text-white hover:bg-white/10'}`}>
                  <Icon size={16} /> <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white font-serif font-bold border border-white/30 shadow-sm drop-shadow-md">U</div>
        </div>
      </header>
      
      {/* MAIN WINDOW SCROLLER (No nested scrollbars) */}
      <main className="w-full pt-32 pb-36 px-6 max-w-4xl mx-auto flex-1 flex flex-col justify-end">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// 3. Home Dashboard (Fixed Input Bar & Confirmation Prompt)
// ---------------------------------------------------------
function HomeDashboard({ onNavigate, profile }) {
  const [icebreakerNeeded, setIcebreakerNeeded] = useState(false);
  const [icebreakerReply, setIcebreakerReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modes: 'asking_topic' -> 'confirming_track' -> 'answering_question'
  const [currentMode, setCurrentMode] = useState('asking_topic');
  const [pendingTopic, setPendingTopic] = useState('');
  const [lastLessonText, setLastLessonText] = useState('');

  // Auto-scroll to bottom of window when chat updates
  useEffect(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: icebreakerReply })
    });
    setIcebreakerNeeded(false);
    setIsSubmitting(false);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userText = inputValue;
    setInputValue(''); 
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);

    // SCENARIO 1: User asks for a topic -> We ask to confirm converting to a track
    if (currentMode === 'asking_topic') {
      setPendingTopic(userText);
      setTimeout(() => {
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          text: `Would you like me to generate a personalized learning track and modules for "${userText}"?`,
          isConfirmation: true
        }]);
        setCurrentMode('confirming_track');
      }, 500); // Small delay to feel natural
    } 
    // SCENARIO 2: They typed an answer while in confirming mode (Fallback if they didn't click buttons)
    else if (currentMode === 'confirming_track') {
      if(userText.toLowerCase().includes('yes') || userText.toLowerCase().includes('ok') || userText.toLowerCase().includes('sure')) {
        handleConfirmTrack(true);
      } else {
        handleConfirmTrack(false);
      }
    }
    // SCENARIO 3: User answers a question
    else if (currentMode === 'answering_question') {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/evaluate/${USER_ID}/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: userText, lesson_text: lastLessonText })
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

  // Triggered by the Yes/No buttons in the chat
  const handleConfirmTrack = async (isConfirmed) => {
    if (isConfirmed) {
      setChatHistory(prev => [...prev, { role: 'user', text: "Yes, let's do it!" }]);
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
    <AppLayout currentRoute="/home" onNavigate={onNavigate}>
      <div className="w-full space-y-6">
        
        {icebreakerNeeded && (
          <div className="w-full bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-3xl p-6 mb-6 animate-in fade-in">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare size={20} className="text-white"/>
              <h3 className="font-serif text-lg text-white font-bold drop-shadow-md">Daily Check-In</h3>
            </div>
            <p className="text-stone-200 font-medium mb-4 drop-shadow-sm">Before we start, what's the latest talk of the town in your world today?</p>
            <div className="flex gap-2">
              <input type="text" value={icebreakerReply} onChange={e => setIcebreakerReply(e.target.value)} disabled={isSubmitting} placeholder="E.g. The tire degradation battle yesterday was insane..." className="flex-1 p-3 rounded-xl border border-white/20 bg-black/20 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-orange-500/70 text-white placeholder:text-stone-400 font-bold" />
              <button onClick={handleIcebreakerSubmit} disabled={isSubmitting} className="bg-orange-600/90 backdrop-blur-md border border-orange-500 text-white px-6 rounded-xl font-bold hover:bg-orange-500 flex items-center gap-2 shadow-lg">
                {isSubmitting ? "Updating..." : "Send"} <Send size={16}/>
              </button>
            </div>
          </div>
        )}

        {chatHistory.length === 0 && !icebreakerNeeded && (
          /* Using absolute positioning to lock it perfectly dead-center on the screen */
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[55%] w-full max-w-2xl px-6 z-10 pointer-events-none">
            <div className="text-center animate-in fade-in duration-700 bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/20 pointer-events-auto">
              <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 font-bold drop-shadow-lg">Hi, {profile.name}</h1>
              <p className="text-stone-200 text-lg font-bold drop-shadow-md">What do you want to learn today?</p>
            </div>
          </div>
        )}  

        {/* Chat History rendered directly in the window body */}
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] p-6 rounded-3xl text-lg leading-relaxed shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl ${
              msg.role === 'user' 
                ? 'bg-orange-600/90 text-white rounded-br-sm border border-orange-500 font-bold' 
                : msg.isFeedback 
                  ? (msg.passed ? 'bg-emerald-900/60 border border-emerald-400/50 text-white rounded-bl-sm font-bold' : 'bg-red-900/60 border border-red-400/50 text-white rounded-bl-sm font-bold')
                  : 'bg-white/10 border border-white/20 text-white rounded-bl-sm font-serif font-medium' 
            }`}>
              {msg.text.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0 drop-shadow-md">{line}</p>)}
              
              {/* If this is a confirmation message, render the YES/NO buttons inside the bubble */}
              {msg.isConfirmation && (
                <div className="mt-6 flex gap-3">
                   <button onClick={() => handleConfirmTrack(true)} className="bg-white/20 hover:bg-white/30 border border-white/30 px-6 py-2 rounded-full text-white font-bold transition-all shadow-sm flex items-center gap-2">
                     <CheckCircle2 size={18}/> Yes, build the track!
                   </button>
                   <button onClick={() => handleConfirmTrack(false)} className="bg-black/20 hover:bg-black/30 border border-white/10 px-6 py-2 rounded-full text-stone-300 font-bold transition-all">
                     No, wait.
                   </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-6 rounded-3xl rounded-bl-sm flex gap-2 items-center shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce"></div>
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce delay-100"></div>
              <div className="w-2.5 h-2.5 bg-stone-300 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED BOTTOM INPUT BAR */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
        <div className="bg-black/40 backdrop-blur-2xl p-2 rounded-full border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] flex items-center mx-2">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={currentMode === 'asking_topic' ? "Enter a concept to learn..." : currentMode === 'confirming_track' ? "Click a button above..." : "Type your answer..."} 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-lg text-white placeholder:text-stone-400 font-bold drop-shadow-md" 
            disabled={isLoading || currentMode === 'confirming_track'}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim() || currentMode === 'confirming_track'}
            className="aspect-square h-14 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-white/30 border border-white/30 disabled:opacity-30 transition-all shadow-lg mr-1"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function HistoryPage({ onNavigate }) { return (<AppLayout currentRoute="/history" onNavigate={onNavigate}><div className="max-w-3xl mx-auto"><div className="bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] text-center border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"><h2 className="text-3xl font-serif text-white font-bold drop-shadow-lg">History (Coming Soon)</h2></div></div></AppLayout>); }
function LearningsPage({ onNavigate }) { return (<AppLayout currentRoute="/learnings" onNavigate={onNavigate}><div className="max-w-3xl mx-auto"><div className="bg-white/10 backdrop-blur-2xl p-12 rounded-[3rem] text-center border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]"><h2 className="text-3xl font-serif text-white font-bold drop-shadow-lg">Library (Coming Soon)</h2></div></div></AppLayout>); }