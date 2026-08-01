import React, { useState, useEffect } from 'react';
import { ArrowRight, Search, Book, MessageSquare, Map, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

export default function GurukulApp() {
  // Simple state-based router for the prototype
  const [route, setRoute] = useState('/');
  const [userProfile, setUserProfile] = useState({ name: 'User' });

  // Navigation Helper
  const navigate = (path) => setRoute(path);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans selection:bg-orange-100 selection:text-orange-900">
      {route === '/' && <LandingPage onNavigate={navigate} />}
      {route === '/onboarding' && <OnboardingFlow onNavigate={navigate} onComplete={setUserProfile} />}
      {route === '/home' && <HomeDashboard onNavigate={navigate} profile={userProfile} />}
      {route === '/tracks' && <TracksPage onNavigate={navigate} />}
      {route === '/history' && <HistoryPage onNavigate={navigate} />}
      {route === '/learnings' && <LearningsPage onNavigate={navigate} />}
    </div>
  );
}

// ---------------------------------------------------------
// 1. Landing Page (/)
// ---------------------------------------------------------
function LandingPage({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 max-w-4xl mx-auto text-center">
      <h1 className="text-5xl md:text-7xl font-serif text-stone-900 mb-6 tracking-tight">
        Gurukul
      </h1>
      <p className="text-xl md:text-2xl text-stone-500 mb-12 max-w-2xl leading-relaxed">
        An AI tutor that builds a personalized learning roadmap for any concept. Adapted to your interests, pace, and background.
      </p>
      
      <button 
        onClick={() => onNavigate('/onboarding')}
        className="bg-orange-700 text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-orange-800 transition-colors shadow-sm flex items-center gap-2"
      >
        Get Started <ArrowRight size={20} />
      </button>

      <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
        <div>
          <h3 className="font-serif text-xl font-medium mb-3 text-stone-900">1. Share your context</h3>
          <p className="text-stone-500 leading-relaxed">Tell us what you love and how you learn best through a brief, dynamic assessment.</p>
        </div>
        <div>
          <h3 className="font-serif text-xl font-medium mb-3 text-stone-900">2. Pick a concept</h3>
          <p className="text-stone-500 leading-relaxed">Enter absolutely anything you want to learn. The AI maps out the prerequisites.</p>
        </div>
        <div>
          <h3 className="font-serif text-xl font-medium mb-3 text-stone-900">3. Follow your track</h3>
          <p className="text-stone-500 leading-relaxed">Progress through bite-sized modules tailored specifically to your existing knowledge.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 2. Onboarding Flow (/onboarding)
// ---------------------------------------------------------
function OnboardingFlow({ onNavigate, onComplete }) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInterest, setSelectedInterest] = useState('');
  const [otherInterest, setOtherInterest] = useState('');

  const handleNext = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      if (step < 3) setStep(step + 1);
      else {
        onComplete({ name: 'Explorer', interests: selectedInterest });
        onNavigate('/home');
      }
    }, 800); // Simulate AI generation delay
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${step >= i ? 'bg-orange-700' : 'bg-stone-200'}`} />
          ))}
        </div>

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-stone-100 min-h-[400px] flex flex-col justify-center">
          {isGenerating ? (
            <div className="text-center animate-pulse text-stone-400 font-serif text-xl">
              Personalizing your questions...
            </div>
          ) : (
            <>
              {/* Step 1: Interests */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-serif text-stone-900 mb-8">What do you love the most?</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {['Sports', 'Gaming', 'Anime', 'Others'].map((item) => (
                      <button
                        key={item}
                        onClick={() => setSelectedInterest(item)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          selectedInterest === item 
                            ? 'border-orange-700 bg-orange-50 text-orange-900' 
                            : 'border-stone-200 hover:border-orange-300 text-stone-600'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  {selectedInterest === 'Others' && (
                     <input 
                       type="text" 
                       placeholder="Please specify..."
                       className="mt-4 w-full p-4 rounded-2xl border border-stone-200 focus:outline-none focus:border-orange-700 bg-stone-50"
                       value={otherInterest}
                       onChange={(e) => setOtherInterest(e.target.value)}
                     />
                  )}
                </div>
              )}

              {/* Step 2: Details Form */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-serif text-stone-900 mb-8">A bit about you</h2>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm text-stone-500 mb-2 ml-1">Age</label>
                      <input type="number" className="w-full p-4 rounded-2xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-700" placeholder="e.g. 24" />
                    </div>
                    <div>
                      <label className="block text-sm text-stone-500 mb-2 ml-1">Preparation Level</label>
                      <select className="w-full p-4 rounded-2xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-700 appearance-none">
                        <option>Beginner</option>
                        <option>Intermediate</option>
                        <option>Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-stone-500 mb-2 ml-1">Preferred Dialect / Language</label>
                      <input type="text" className="w-full p-4 rounded-2xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-700" placeholder="e.g. Simple English, Professional" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Psychometric Form */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-3xl font-serif text-stone-900 mb-8">How do you approach learning?</h2>
                  <p className="text-stone-500 mb-8">"I prefer learning by doing rather than reading theory first."</p>
                  
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-sm text-stone-400">Disagree</span>
                    <span className="text-sm text-stone-400">Neutral</span>
                    <span className="text-sm text-stone-400">Agree</span>
                  </div>
                  <div className="flex justify-between items-center bg-stone-50 p-4 rounded-full border border-stone-100">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <input 
                        key={val} 
                        type="radio" 
                        name="psych" 
                        className="w-6 h-6 accent-orange-700 cursor-pointer"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 flex justify-between items-center">
                {step > 1 ? (
                  <button onClick={() => setStep(step - 1)} className="text-stone-400 hover:text-stone-700">Back</button>
                ) : <div/>}
                <button 
                  onClick={handleNext}
                  disabled={step === 1 && !selectedInterest}
                  className="bg-orange-700 text-white px-8 py-3 rounded-full font-medium hover:bg-orange-800 transition-colors disabled:opacity-50"
                >
                  {step === 3 ? 'Complete Profile' : 'Next'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// Shared Layout Component for App Pages
// ---------------------------------------------------------
function AppLayout({ children, currentRoute, onNavigate }) {
  const navItems = [
    { id: '/home', label: 'Home', icon: Search },
    { id: '/learnings', label: 'Learnings', icon: Book },
    { id: '/history', label: 'History', icon: MessageSquare },
    { id: '/tracks', label: 'Tracks', icon: Map },
  ];

  return (
    <div className="min-h-screen flex flex-col max-w-6xl mx-auto">
      <header className="flex items-center justify-between p-6 mb-8">
        <div className="font-serif text-2xl text-stone-900 cursor-pointer" onClick={() => onNavigate('/')}>
          Gurukul.
        </div>
        <nav className="flex bg-white rounded-full px-2 py-2 shadow-sm border border-stone-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon size={16} />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-800 font-serif">
          U
        </div>
      </header>
      <main className="flex-1 px-6 pb-24">
        {children}
      </main>
    </div>
  );
}

// ---------------------------------------------------------
// 3. Home Dashboard (/home)
// ---------------------------------------------------------
function HomeDashboard({ onNavigate, profile }) {
  return (
    <AppLayout currentRoute="/home" onNavigate={onNavigate}>
      <div className="flex flex-col items-center justify-center h-[60vh] max-w-3xl mx-auto text-center animate-in fade-in duration-700">
        <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-2">Welcome Back, {profile.name}</h1>
        <p className="text-stone-500 mb-12 text-lg">What concept would you like to explore today?</p>
        
        <div className="w-full relative shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl group">
          <input 
            type="text"
            placeholder="Enter a concept to learn..."
            className="w-full bg-white p-6 pl-8 pr-16 rounded-3xl border-none focus:outline-none focus:ring-2 focus:ring-orange-700/20 text-xl text-stone-800 placeholder:text-stone-300"
          />
          <button 
            onClick={() => onNavigate('/tracks')}
            className="absolute right-3 top-3 bottom-3 aspect-square bg-orange-700 text-white rounded-2xl flex items-center justify-center hover:bg-orange-800 transition-colors"
          >
            <ArrowRight size={24} />
          </button>
        </div>

        <div className="mt-12 flex flex-col items-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Trending in your interests</span>
          <div className="flex flex-wrap justify-center gap-3">
            {['Quantum Computing Basics', 'Game Engine Architecture', 'Japanese History Overview'].map(tag => (
              <button key={tag} className="px-5 py-2 rounded-full bg-stone-100 text-stone-600 text-sm hover:bg-stone-200 transition-colors">
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------
// 4. Tracks Page (/tracks)
// ---------------------------------------------------------
function TracksPage({ onNavigate }) {
  return (
    <AppLayout currentRoute="/tracks" onNavigate={onNavigate}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-900 mb-8">Active Learning Track</h2>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <div className="mb-8 border-b border-stone-100 pb-8">
            <h3 className="text-2xl font-serif text-stone-900 mb-2">Introduction to Machine Learning</h3>
            <p className="text-stone-500">Customized roadmap based on your intermediate programming background.</p>
          </div>

          <div className="space-y-6">
            {/* Module 1 - Completed */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-orange-700 flex items-center justify-center text-white shadow-sm z-10">
                  <CheckCircle2 size={16} />
                </div>
                <div className="w-0.5 h-full bg-orange-200 mt-2"></div>
              </div>
              <div className="pb-8 pt-1">
                <h4 className="text-lg font-medium text-stone-900">Module 1: The Basics of Linear Algebra</h4>
                <div className="mt-4 pl-4 border-l-2 border-stone-100 space-y-3">
                  <div className="text-stone-500 text-sm flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-700"/> Vectors & Matrices</div>
                  <div className="text-stone-500 text-sm flex items-center gap-2"><CheckCircle2 size={14} className="text-orange-700"/> Dot Products</div>
                </div>
              </div>
            </div>

            {/* Module 2 - In Progress */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-white border-2 border-orange-700 flex items-center justify-center text-orange-700 z-10">
                  <span className="w-2.5 h-2.5 bg-orange-700 rounded-full"></span>
                </div>
                <div className="w-0.5 h-full bg-stone-100 mt-2"></div>
              </div>
              <div className="pb-8 pt-1 w-full">
                <h4 className="text-lg font-medium text-stone-900">Module 2: Core ML Algorithms</h4>
                <div className="mt-4 bg-stone-50 p-5 rounded-2xl border border-stone-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-stone-800">Linear Regression</span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-3 py-1 rounded-full">Up Next</span>
                  </div>
                  <p className="text-sm text-stone-500 mb-4">Understanding the line of best fit and loss functions.</p>
                  <button className="text-sm text-orange-700 font-medium flex items-center gap-1 hover:text-orange-800">
                    Start Learning <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Module 3 - Locked */}
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 z-10">
                  3
                </div>
              </div>
              <div className="pt-1 opacity-50">
                <h4 className="text-lg font-medium text-stone-900">Module 3: Neural Networks</h4>
                <p className="text-sm text-stone-400 mt-1">Prerequisites: Module 1 & 2</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------
// 5. History Page (/history)
// ---------------------------------------------------------
function HistoryPage({ onNavigate }) {
  return (
    <AppLayout currentRoute="/history" onNavigate={onNavigate}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-900 mb-8">Conversation History</h2>
        
        <div className="space-y-8">
          <div className="text-center text-xs text-stone-400 font-medium tracking-widest uppercase">Today</div>
          
          <div className="flex flex-col gap-6">
            {/* User Message */}
            <div className="self-end max-w-[80%] flex flex-col items-end">
              <div className="bg-stone-900 text-white px-6 py-4 rounded-3xl rounded-tr-sm shadow-sm">
                Can you explain how Gradient Descent works using a sports analogy?
              </div>
              <span className="text-xs text-stone-400 mt-2">10:42 AM</span>
            </div>
            
            {/* AI Message */}
            <div className="self-start max-w-[85%] flex flex-col items-start">
              <div className="bg-white border border-stone-100 px-6 py-5 rounded-3xl rounded-tl-sm shadow-sm text-stone-700 leading-relaxed">
                <p>Imagine you're a golfer blindfolded on a hilly course, and your goal is to find the lowest point (the hole) using only your feet to feel the slope.</p>
                <p className="mt-3">1. You feel which way the ground slopes down (calculating the gradient).<br/>
                2. You take a step in that downward direction (updating weights).<br/>
                3. The size of your step depends on how steep the slope is and how cautious you are (learning rate).</p>
                <p className="mt-3">You repeat this until the ground feels flat—you've reached the bottom!</p>
              </div>
              <span className="text-xs text-stone-400 mt-2">10:43 AM</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ---------------------------------------------------------
// 6. Learnings Page (/learnings)
// ---------------------------------------------------------
function LearningsPage({ onNavigate }) {
  return (
    <AppLayout currentRoute="/learnings" onNavigate={onNavigate}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-serif text-stone-900 mb-8">Your Library</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1 - In Progress */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-50 text-orange-700 rounded-2xl">
                <Map size={20} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-3 py-1 rounded-full">
                <Clock size={12} /> In Progress
              </span>
            </div>
            <h3 className="font-serif text-xl text-stone-900 mb-2">Machine Learning Basics</h3>
            <p className="text-stone-500 text-sm mb-6">4/12 Sub-modules completed</p>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-700 w-1/3 rounded-full"></div>
            </div>
          </div>

          {/* Card 2 - Completed */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
             <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-stone-100 text-stone-600 rounded-2xl">
                <Book size={20} />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 size={12} /> Completed
              </span>
            </div>
            <h3 className="font-serif text-xl text-stone-900 mb-2">History of Video Games</h3>
            <p className="text-stone-500 text-sm mb-6">Mastered on Oct 12</p>
            <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-full rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}