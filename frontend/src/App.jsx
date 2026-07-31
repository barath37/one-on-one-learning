import React, { useState, useEffect } from 'react';
import { ArrowRight, Search, Book, MessageSquare, Map, CheckCircle2, Send } from 'lucide-react';

const USER_ID = 'student_01';
const API_BASE = 'http://127.0.0.1:8000/api';

export default function App() {
  const [route, setRoute] = useState('/');
  const [userProfile, setUserProfile] = useState({ name: 'Explorer' });

  const navigate = (path) => setRoute(path);

  return (
    <div className="min-h-screen text-stone-800 font-sans selection:bg-orange-100 selection:text-orange-900 relative z-0">
      
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
// 1. Landing Page (Glassmorphism applied)
// ---------------------------------------------------------
function LandingPage({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-4xl mx-auto text-center">
      <div className="bg-white/60 backdrop-blur-xl p-12 rounded-[3rem] border border-white/40 shadow-2xl">
        <h1 className="text-5xl md:text-7xl font-serif text-stone-900 mb-6 tracking-tight">Gurukul.</h1>
        <p className="text-xl md:text-2xl text-stone-700 mb-12 max-w-2xl leading-relaxed">
          An AI tutor that builds a personalized learning roadmap. Adapted to your interests, pace, and background.
        </p>
        <button onClick={() => onNavigate('/onboarding')} className="bg-orange-700/90 backdrop-blur-md text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-orange-800 transition-colors shadow-lg flex items-center gap-2 mx-auto">
          Get Started <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. Onboarding Flow (Consolidated & Validated)
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

  // Strict Validation Logic
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
      <div className="w-full max-w-lg bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/50 min-h-[450px] flex flex-col justify-center transition-all">
        {isGenerating ? (
          <div className="text-center animate-pulse text-stone-700 font-serif text-xl">Connecting to Gurukul AI...</div>
        ) : (
          <>
            {/* Step 1: Consolidated Context */}
            {step === 1 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-stone-900 mb-2">A bit about you</h2>
                <p className="text-stone-600 mb-8 text-sm">Help us tailor the experience. You can enter multiple answers separated by commas.</p>
                
                <div className="space-y-5">
                  <div className="flex gap-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Age (8-100)</label>
                      <input type="number" min="8" max="100" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} className="w-full p-4 rounded-2xl border border-white/40 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-700/30 transition-all" placeholder="e.g. 21" />
                    </div>
                    <div className="w-2/3">
                      <label className="block text-sm font-medium text-stone-700 mb-2">Preparation Level</label>
                      <select value={formData.prepLevel} onChange={(e) => setFormData({...formData, prepLevel: e.target.value})} className="w-full p-4 rounded-2xl border border-white/40 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-700/30 transition-all">
                        <option>Novice (Exploring fundamentals)</option>
                        <option>Intermediate (Familiar with basics)</option>
                        <option>Expert (Deep diving)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">What do you love? (Hobbies, Domains)</label>
                    <input type="text" value={formData.interest} onChange={(e) => setFormData({...formData, interest: e.target.value})} className="w-full p-4 rounded-2xl border border-white/40 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-700/30 transition-all" placeholder="e.g. Motorsports, Anime, History..." />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Location & Languages Spoken</label>
                    <input type="text" value={formData.dialect} onChange={(e) => setFormData({...formData, dialect: e.target.value})} className="w-full p-4 rounded-2xl border border-white/40 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-700/30 transition-all" placeholder="e.g. Coimbatore, Kongu Tamil, English..." />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Learning Behavior */}
            {step === 2 && (
              <div className="animate-in fade-in">
                <h2 className="text-3xl font-serif text-stone-900 mb-8">Learning Behavior</h2>
                <p className="text-stone-700 mb-8 text-lg font-serif italic">"I prefer jumping straight into solving problems rather than reading theory first."</p>
                
                <div className="flex justify-between items-center px-1 mb-3 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  <span>Disagree</span>
                  <span>Neutral</span>
                  <span>Agree</span>
                </div>
                
                <div className="flex justify-between items-center bg-white/40 p-4 rounded-full border border-white/50 shadow-inner">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button 
                      key={val} 
                      onClick={() => setFormData({...formData, psychScore: val})}
                      className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all border-2 ${formData.psychScore === val ? 'bg-orange-700 border-orange-700 text-white shadow-lg scale-110' : 'bg-white/60 border-white/50 text-stone-500 hover:border-orange-300'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 flex justify-between items-center">
              {step > 1 ? <button onClick={() => setStep(step - 1)} className="text-stone-500 font-medium hover:text-stone-900">Back</button> : <div/>}
              <button 
                onClick={handleNext} 
                disabled={step === 1 && !isStep1Valid}
                className="bg-orange-700/90 backdrop-blur-sm text-white px-8 py-3 rounded-full font-medium shadow-md hover:bg-orange-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all ml-auto"
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
// Shared Layout (Glassmorphism header)
// ---------------------------------------------------------
function AppLayout({ children, currentRoute, onNavigate }) {
  const navItems = [
    { id: '/home', label: 'Home', icon: Search },
    { id: '/learnings', label: 'Library', icon: Book },
    { id: '/history', label: 'History', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto pt-6">
      <header className="flex items-center justify-between p-4 px-8 mb-8 bg-white/50 backdrop-blur-xl border border-white/40 rounded-full shadow-lg mx-6">
        <div className="font-serif text-2xl text-stone-900 cursor-pointer font-bold" onClick={() => onNavigate('/')}>Gurukul.</div>
        <nav className="flex bg-white/60 rounded-full px-2 py-2 shadow-inner border border-white/30">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold transition-all ${currentRoute === item.id ? 'bg-orange-700/10 text-orange-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}>
                <Icon size={16} /> <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="w-10 h-10 bg-orange-700/10 rounded-full flex items-center justify-center text-orange-800 font-serif font-bold border border-orange-700/20 shadow-sm">U</div>
      </header>
      <main className="flex-1 px-6 pb-24">{children}</main>
    </div>
  );
}

// ---------------------------------------------------------
// 3. Home Dashboard (Chat Interface with Glassmorphism)
// ---------------------------------------------------------
function HomeDashboard({ onNavigate, profile }) {
  const [icebreakerNeeded, setIcebreakerNeeded] = useState(false);
  const [icebreakerReply, setIcebreakerReply] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState('asking_topic');
  const [lastLessonText, setLastLessonText] = useState('');

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
    setIsLoading(true);

    if (currentMode === 'asking_topic') {
      try {
        const res = await fetch(`${API_BASE}/lesson/${USER_ID}/?topic=${encodeURIComponent(userText)}`);
        const data = await res.json();
        setLastLessonText(data.lesson_text);
        setChatHistory(prev => [...prev, { role: 'ai', text: data.lesson_text }]);
        setCurrentMode('answering_question');
      } catch (err) { console.error(err); }
    } 
    else if (currentMode === 'answering_question') {
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
    }
    setIsLoading(false);
  };

  return (
    <AppLayout currentRoute="/home" onNavigate={onNavigate}>
      <div className="flex flex-col max-w-4xl mx-auto h-[75vh]">
        
        {icebreakerNeeded && (
          <div className="w-full bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl rounded-3xl p-6 mb-6 animate-in fade-in">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare size={20} className="text-orange-700"/>
              <h3 className="font-serif text-lg text-stone-900 font-bold">Daily Check-In</h3>
            </div>
            <p className="text-stone-700 mb-4">Before we start, what's the latest talk of the town in your world today?</p>
            <div className="flex gap-2">
              <input type="text" value={icebreakerReply} onChange={e => setIcebreakerReply(e.target.value)} disabled={isSubmitting} placeholder="E.g. The tire degradation battle yesterday was insane..." className="flex-1 p-3 rounded-xl border border-white/40 bg-white/60 focus:outline-none focus:ring-2 focus:ring-orange-700/30" />
              <button onClick={handleIcebreakerSubmit} disabled={isSubmitting} className="bg-stone-900 text-white px-6 rounded-xl font-medium hover:bg-stone-800 flex items-center gap-2 shadow-md">
                {isSubmitting ? "Updating..." : "Send"} <Send size={16}/>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col scroll-smooth">
          {chatHistory.length === 0 && !icebreakerNeeded && (
            <div className="m-auto text-center animate-in fade-in duration-700 bg-white/40 backdrop-blur-sm p-10 rounded-[3rem] shadow-xl border border-white/30">
              <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-4 font-bold">Hi, {profile.name}</h1>
              <p className="text-stone-700 text-lg">What do you want to learn today?</p>
            </div>
          )}

          {chatHistory.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[85%] p-6 rounded-3xl text-lg leading-relaxed shadow-lg backdrop-blur-md ${
                msg.role === 'user' 
                  ? 'bg-stone-900/90 text-white rounded-br-sm border border-stone-700' 
                  : msg.isFeedback 
                    ? (msg.passed ? 'bg-emerald-50/90 border border-emerald-200/50 text-stone-900 rounded-bl-sm' : 'bg-red-50/90 border border-red-200/50 text-stone-900 rounded-bl-sm')
                    : 'bg-white/80 border border-white/50 text-stone-900 rounded-bl-sm font-serif'
              }`}>
                {msg.text.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line}</p>)}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start animate-in fade-in">
              <div className="bg-white/80 backdrop-blur-md border border-white/50 p-6 rounded-3xl rounded-bl-sm flex gap-2 items-center shadow-lg">
                <div className="w-2.5 h-2.5 bg-orange-700/60 rounded-full animate-bounce"></div>
                <div className="w-2.5 h-2.5 bg-orange-700/60 rounded-full animate-bounce delay-100"></div>
                <div className="w-2.5 h-2.5 bg-orange-700/60 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Input Bar */}
        <div className="mt-4 bg-white/70 backdrop-blur-xl p-2 rounded-full border border-white/50 shadow-2xl flex items-center mx-4">
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={currentMode === 'asking_topic' ? "Enter a concept to learn..." : "Type your answer..."} 
            className="flex-1 bg-transparent px-6 py-4 outline-none text-lg text-stone-900 placeholder:text-stone-500 font-medium" 
            disabled={isLoading}
          />
          <button 
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="aspect-square h-14 bg-orange-700/90 text-white rounded-full flex items-center justify-center hover:bg-orange-800 disabled:opacity-40 transition-all shadow-md mr-1"
          >
            <ArrowRight size={24} />
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

function HistoryPage({ onNavigate }) { return (<AppLayout currentRoute="/history" onNavigate={onNavigate}><div className="max-w-3xl mx-auto"><div className="bg-white/60 backdrop-blur-xl p-12 rounded-[3rem] text-center border border-white/40 shadow-xl"><h2 className="text-3xl font-serif text-stone-900">History (Coming Soon)</h2></div></div></AppLayout>); }
function LearningsPage({ onNavigate }) { return (<AppLayout currentRoute="/learnings" onNavigate={onNavigate}><div className="max-w-3xl mx-auto"><div className="bg-white/60 backdrop-blur-xl p-12 rounded-[3rem] text-center border border-white/40 shadow-xl"><h2 className="text-3xl font-serif text-stone-900">Library (Coming Soon)</h2></div></div></AppLayout>); }