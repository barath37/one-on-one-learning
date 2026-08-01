// frontend/src/App.jsx
// ONE file: the entire frontend. Replace src/App.jsx entirely with this.
// Requires: npm install mermaid lucide-react
import React, { useState, useEffect, useRef } from 'react';
import { Search, Book, MessageSquare, Layers, Mic, Volume2, Send, CheckCircle2 } from 'lucide-react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark' });

const API_BASE = 'http://127.0.0.1:8000/api';
const USER_ID = 'student_01';

// ============================================================
// ROOT
// ============================================================
export default function App() {
  const [route, setRoute] = useState('/');
  const navigate = (r) => setRoute(r);

  return (
    <div className="bg-black min-h-screen">
      {route === '/' && <LandingPage onNavigate={navigate} />}
      {route === '/onboarding' && <OnboardingFlow onNavigate={navigate} />}
      {route === '/home' && <HomeDashboard onNavigate={navigate} />}
      {route === '/history' && <HistoryPage onNavigate={navigate} />}
      {route === '/library' && <LibraryPage onNavigate={navigate} />}
      {route === '/tracks' && <TracksPage onNavigate={navigate} />}
    </div>
  );
}

// ============================================================
// SHARED LAYOUT
// ============================================================
function AppLayout({ children, currentRoute, onNavigate, listMode = false }) {
  const navItems = [
    { id: '/home', label: 'Home', icon: Search },
    { id: '/library', label: 'Library', icon: Book },
    { id: '/tracks', label: 'Tracks', icon: Layers },
    { id: '/history', label: 'History', icon: MessageSquare },
  ];
  return (
    <div className="min-h-screen flex flex-col text-white">
      <header className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-6 z-50">
        <div className="flex items-center justify-between p-3 px-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full">
          <div className="font-serif text-xl font-bold cursor-pointer" onClick={() => onNavigate('/')}>Gurukul.</div>
          <nav className="flex bg-black/30 rounded-full px-2 py-1 border border-white/10">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => onNavigate(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${currentRoute === id ? 'bg-white/20' : 'text-stone-400 hover:text-white'}`}>
                <Icon size={16} /> <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center font-bold border border-white/30">U</div>
        </div>
      </header>
      <main className={`w-full pt-28 pb-12 px-6 max-w-4xl mx-auto flex-1 flex flex-col ${listMode ? 'justify-start' : 'justify-end'}`}>
        {children}
      </main>
    </div>
  );
}

// ============================================================
// LANDING
// ============================================================
function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white text-center px-6">
      <h1 className="text-5xl font-serif font-bold mb-4">Gurukul.</h1>
      <p className="text-stone-400 mb-8 max-w-md">An AI tutor that builds a personalized learning roadmap. Adapted to your interests, pace, and background.</p>
      <button onClick={() => onNavigate('/onboarding')} className="px-8 py-4 bg-orange-600 rounded-full font-bold hover:bg-orange-500 transition-all">Begin</button>
    </div>
  );
}

// ============================================================
// ONBOARDING — rich Day-1 profile + one-time psychometric test
// ============================================================
function OnboardingFlow({ onNavigate }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '', prepLevel: 'Novice (exploring fundamentals)', domain: '',
    motherTongue: '', birthplace: '', residence: '', languagesSpoken: '',
  });
  const [psychQuestions, setPsychQuestions] = useState([]);
  const [psychAnswers, setPsychAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/psych-questions/`).then(r => r.json()).then(d => {
      setPsychQuestions(d.questions);
      setPsychAnswers(new Array(d.questions.length).fill(''));
    }).catch(console.error);
  }, []);

  const isStep1Valid = formData.age && formData.domain.trim() && formData.motherTongue.trim();
  const isStep2Valid = psychAnswers.every(a => a.trim().length > 0);

  const submit = async () => {
    setSubmitting(true);
    try {
      await fetch(`${API_BASE}/onboard/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID, stated_age: formData.age, prep_level: formData.prepLevel,
          domain: formData.domain, mother_tongue: formData.motherTongue,
          birthplace: formData.birthplace, residence: formData.residence,
          languages_spoken: formData.languagesSpoken, psych_answers: psychAnswers,
        }),
      });
      onNavigate('/home');
    } catch (err) {
      console.error(err);
      alert("Couldn't reach the server — is Django running?");
    }
    setSubmitting(false);
  };

  const inputClass = "w-full p-3 rounded-xl border border-white/20 bg-black/30 text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-orange-500/70";

  return (
    <div className="min-h-screen flex items-center justify-center text-white px-6 py-12">
      <div className="w-full max-w-lg bg-white/5 border border-white/15 rounded-3xl p-8">
        {step === 1 && (
          <>
            <h2 className="text-2xl font-serif font-bold mb-1">A bit about you</h2>
            <p className="text-stone-400 text-sm mb-6">Multiple answers? Separate with commas.</p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <input min="8" max="100" type="number" placeholder="Age" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} className={inputClass} />
                <select value={formData.prepLevel} onChange={e => setFormData({ ...formData, prepLevel: e.target.value })} className={inputClass}>
                  <option>Novice (exploring fundamentals)</option>
                  <option>Intermediate (familiar with basics)</option>
                  <option>Advanced (refining expertise)</option>
                </select>
              </div>
              <input placeholder="Interests/domains — e.g. cricket, anime, cars" value={formData.domain} onChange={e => setFormData({ ...formData, domain: e.target.value })} className={inputClass} />
              <div className="flex gap-3">
                <input placeholder="Mother tongue" value={formData.motherTongue} onChange={e => setFormData({ ...formData, motherTongue: e.target.value })} className={inputClass} />
                <input placeholder="Birthplace" value={formData.birthplace} onChange={e => setFormData({ ...formData, birthplace: e.target.value })} className={inputClass} />
              </div>
              <div className="flex gap-3">
                <input placeholder="Current residence" value={formData.residence} onChange={e => setFormData({ ...formData, residence: e.target.value })} className={inputClass} />
                <input placeholder="Other languages spoken" value={formData.languagesSpoken} onChange={e => setFormData({ ...formData, languagesSpoken: e.target.value })} className={inputClass} />
              </div>
            </div>
            <button disabled={!isStep1Valid} onClick={() => setStep(2)} className="mt-6 w-full py-3 bg-orange-600 rounded-full font-bold disabled:opacity-40">Next: Quick behavior check</button>
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-serif font-bold mb-1">How do you learn?</h2>
            <p className="text-stone-400 text-sm mb-6">One-time — this shapes your pacing and tone, not graded.</p>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
              {psychQuestions.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm text-stone-300 mb-1">{q}</label>
                  <input value={psychAnswers[i] || ''} onChange={e => {
                    const next = [...psychAnswers]; next[i] = e.target.value; setPsychAnswers(next);
                  }} className={inputClass} />
                </div>
              ))}
            </div>
            <button disabled={!isStep2Valid || submitting} onClick={submit} className="mt-6 w-full py-3 bg-orange-600 rounded-full font-bold disabled:opacity-40">
              {submitting ? 'Setting things up...' : "Let's begin"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// HOME — chat: classify -> chitchat / simple(prereq gate) / complex(track)
// ============================================================
function HomeDashboard({ onNavigate }) {
  const [chat, setChat] = useState([{ role: 'ai', text: "Hey! What would you like to learn today?" }]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('idle'); // idle | prereq | answering
  const [prereqState, setPrereqState] = useState(null); // {checkId, questions, answers, idx}
  const [lastLessonText, setLastLessonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState(null);
  const [showRelevance, setShowRelevance] = useState(false);
  const [relevanceQ, setRelevanceQ] = useState(null);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat]);

  // Daily relevance check-in, once per day
  useEffect(() => {
    fetch(`${API_BASE}/relevance/${USER_ID}/status/`).then(r => r.json()).then(d => {
      if (d.needed) {
        fetch(`${API_BASE}/relevance/${USER_ID}/questions/`).then(r => r.json()).then(q => {
          setRelevanceQ(q); setShowRelevance(true);
        });
      }
    }).catch(console.error);
  }, []);

  const submitRelevance = async (relevantAnswer, irrelevantAnswer) => {
    try {
      await fetch(`${API_BASE}/relevance/${USER_ID}/submit/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relevant_question: relevanceQ.relevant_question, relevant_answer: relevantAnswer,
          irrelevant_question: relevanceQ.irrelevant_question, irrelevant_answer: irrelevantAnswer,
        }),
      });
    } catch (err) { console.error(err); }
    setShowRelevance(false);
  };

  const push = (msg) => setChat(prev => [...prev, msg]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    push({ role: 'user', text });
    setInput('');

    if (mode === 'answering') {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/evaluate/${USER_ID}/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: text, lesson_text: lastLessonText }),
        });
        const data = await res.json();
        let fb = data.passed ? "🟢 " : "🔴 ";
        fb += data.feedback;
        if (data.message) fb += `\n📌 ${data.message}`;
        push({ role: 'ai', text: fb });
        if (data.passed) setMode('idle');
      } catch (err) { console.error(err); push({ role: 'ai', text: "⚠️ Couldn't reach the server." }); }
      setLoading(false);
      return;
    }

    if (mode === 'prereq') {
      const next = { ...prereqState, answers: [...prereqState.answers, text] };
      if (next.idx + 1 < next.questions.length) {
        next.idx += 1;
        setPrereqState(next);
        push({ role: 'ai', text: next.questions[next.idx] });
      } else {
        setLoading(true);
        try {
          const res = await fetch(`${API_BASE}/prereq/${USER_ID}/evaluate/`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ check_id: next.checkId, answers: next.answers }),
          });
          const data = await res.json();
          if (data.escalate) {
            push({ role: 'ai', text: `Looks like this needs real depth — I've built you a full track: "${data.track_title}". Check the Tracks tab!` });
            setMode('idle');
          } else {
            push({ role: 'ai', text: "Good foundation — let's dive in!" });
            await fetchLesson(prereqState.topic);
          }
        } catch (err) { console.error(err); push({ role: 'ai', text: "⚠️ Couldn't reach the server." }); }
        setLoading(false);
      }
      return;
    }

    // mode === 'idle' -> classify
    setLoading(true);
    try {
      const clsRes = await fetch(`${API_BASE}/classify/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      const { label } = await clsRes.json();
      if (label === 'CHITCHAT') {
        push({ role: 'ai', text: "Ha, fair enough! Ask me anything you'd like to learn 🙂" });
      } else if (label === 'SIMPLE') {
        const pqRes = await fetch(`${API_BASE}/prereq/${USER_ID}/questions/`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: text }),
        });
        const pq = await pqRes.json();
        setPrereqState({ checkId: pq.check_id, questions: pq.questions, answers: [], idx: 0, topic: text });
        setMode('prereq');
        push({ role: 'ai', text: `Quick check before we dive in:\n${pq.questions[0]}` });
      } else {
        push({ role: 'ai', text: `That's a meaty topic — go to the Tracks tab to build a full curriculum for "${text}".` });
      }
    } catch (err) { console.error(err); push({ role: 'ai', text: "⚠️ Couldn't reach the server." }); }
    setLoading(false);
  };

  const fetchLesson = async (topic) => {
    try {
      const res = await fetch(`${API_BASE}/lesson/${USER_ID}/?topic=${encodeURIComponent(topic)}`);
      const data = await res.json();
      if (!res.ok) { push({ role: 'ai', text: `⚠️ ${data.error}` }); setMode('idle'); return; }
      setLastLessonText(data.lesson_text);
      push({ role: 'ai', text: data.lesson_text, canSpeak: true });
      setMode('answering');
    } catch (err) { console.error(err); push({ role: 'ai', text: "⚠️ Couldn't reach the server." }); setMode('idle'); }
  };

  const handleSpeak = async (text, idx) => {
    setSpeakingIdx(idx);
    try {
      const res = await fetch(`${API_BASE}/tts/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
        audio.play(); audio.onended = () => setSpeakingIdx(null);
      } else setSpeakingIdx(null);
    } catch (err) { console.error(err); setSpeakingIdx(null); }
  };

  // Browser-native voice input (free, no backend STT — real server-side
  // recognition is a bigger separate build; this covers "voice recognition"
  // for actual use today)
  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice input not supported in this browser — try Chrome.'); return; }
    const recog = new SpeechRecognition();
    recog.lang = 'en-IN';
    recog.onstart = () => setListening(true);
    recog.onend = () => setListening(false);
    recog.onresult = (e) => setInput(e.results[0][0].transcript);
    recog.start();
  };

  return (
    <AppLayout currentRoute="/home" onNavigate={onNavigate}>
      {showRelevance && relevanceQ && <RelevanceModal q={relevanceQ} onSubmit={submitRelevance} />}
      <div className="space-y-4 mb-4">
        {chat.map((m, i) => (
          <div key={i} className={`max-w-xl p-4 rounded-2xl whitespace-pre-wrap ${m.role === 'user' ? 'ml-auto bg-orange-600' : 'bg-white/10 border border-white/15'}`}>
            {m.text}
            {m.canSpeak && (
              <button onClick={() => handleSpeak(m.text, i)} disabled={speakingIdx === i} className="mt-3 flex items-center gap-2 text-sm text-orange-300 disabled:opacity-50">
                <Volume2 size={16} /> {speakingIdx === i ? 'Playing...' : 'Listen'}
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 sticky bottom-4">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type or speak..." disabled={loading}
          className="flex-1 p-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-stone-500 focus:outline-none" />
        <button onClick={handleMic} className={`p-4 rounded-full border border-white/20 ${listening ? 'bg-red-600' : 'bg-white/10'}`}><Mic size={18} /></button>
        <button onClick={handleSend} disabled={loading} className="p-4 rounded-full bg-orange-600 disabled:opacity-40"><Send size={18} /></button>
      </div>
    </AppLayout>
  );
}

function RelevanceModal({ q, onSubmit }) {
  const [relevantAnswer, setRelevantAnswer] = useState('');
  const [irrelevantAnswer, setIrrelevantAnswer] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6">
      <div className="bg-stone-900 border border-white/20 rounded-3xl p-8 max-w-md w-full text-white">
        <h3 className="font-serif text-xl font-bold mb-4">Before we start today...</h3>
        <label className="text-sm text-stone-400">{q.relevant_question}</label>
        <input value={relevantAnswer} onChange={e => setRelevantAnswer(e.target.value)} className="w-full mt-1 mb-4 p-3 rounded-xl bg-black/30 border border-white/20" />
        <label className="text-sm text-stone-400">{q.irrelevant_question}</label>
        <input value={irrelevantAnswer} onChange={e => setIrrelevantAnswer(e.target.value)} className="w-full mt-1 mb-6 p-3 rounded-xl bg-black/30 border border-white/20" />
        <button onClick={() => onSubmit(relevantAnswer, irrelevantAnswer)} className="w-full py-3 bg-orange-600 rounded-full font-bold">Let's go</button>
      </div>
    </div>
  );
}

// ============================================================
// HISTORY
// ============================================================
function HistoryPage({ onNavigate }) {
  const [mistakes, setMistakes] = useState(null);
  useEffect(() => { fetch(`${API_BASE}/mistakes/${USER_ID}/`).then(r => r.json()).then(d => setMistakes(d.mistakes)).catch(console.error); }, []);
  return (
    <AppLayout currentRoute="/history" onNavigate={onNavigate} listMode>
      <h2 className="text-2xl font-serif font-bold mb-4">History</h2>
      {mistakes === null && <p className="text-stone-400">Loading...</p>}
      {mistakes?.length === 0 && <p className="text-stone-400">No mistakes yet — nothing to review!</p>}
      <div className="space-y-3">
        {mistakes?.map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/15 rounded-2xl p-4">
            <div className="flex justify-between text-sm text-stone-400 mb-1"><span>{m.node_id}</span><span>{new Date(m.created_at).toLocaleString()}</span></div>
            <p className="text-sm mb-1"><span className="text-stone-500">You:</span> {m.user_answer}</p>
            <p className="text-sm">{m.ai_feedback}</p>
            {m.fallback_node_id && <p className="text-orange-400 text-xs mt-1">↳ redirected to {m.fallback_node_id}</p>}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

// ============================================================
// LIBRARY
// ============================================================
function LibraryPage({ onNavigate }) {
  const [topics, setTopics] = useState(null);
  useEffect(() => { fetch(`${API_BASE}/topics/${USER_ID}/`).then(r => r.json()).then(d => setTopics(d.topics)).catch(console.error); }, []);
  return (
    <AppLayout currentRoute="/library" onNavigate={onNavigate} listMode>
      <h2 className="text-2xl font-serif font-bold mb-4">Library</h2>
      {topics === null && <p className="text-stone-400">Loading...</p>}
      {topics?.length === 0 && <p className="text-stone-400">Nothing explored yet.</p>}
      <div className="space-y-3">
        {topics?.map((t, i) => (
          <div key={i} className="bg-white/5 border border-white/15 rounded-2xl p-4 flex justify-between">
            <span className="font-bold">{t.title}</span>
            <span className="text-stone-500 text-sm">{new Date(t.last_seen).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}

// ============================================================
// TRACKS — Curricula tab (iterative builder) + Modules tab (tree + detail)
// ============================================================
function TracksPage({ onNavigate }) {
  const [tab, setTab] = useState('curricula');
  const [tracks, setTracks] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);

  const loadTracks = () => fetch(`${API_BASE}/tracks/${USER_ID}/`).then(r => r.json()).then(d => setTracks(d.tracks)).catch(console.error);
  useEffect(() => { loadTracks(); }, []);

  return (
    <AppLayout currentRoute="/tracks" onNavigate={onNavigate} listMode>
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab('curricula')} className={`px-5 py-2 rounded-full font-bold text-sm ${tab === 'curricula' ? 'bg-white/20' : 'bg-white/5 text-stone-400'}`}>Curricula</button>
        <button onClick={() => setTab('modules')} className={`px-5 py-2 rounded-full font-bold text-sm ${tab === 'modules' ? 'bg-white/20' : 'bg-white/5 text-stone-400'}`}>Modules</button>
      </div>
      {tab === 'curricula' && (
        <CurriculaTab tracks={tracks} onFinalized={() => { loadTracks(); setTab('modules'); }} onSelect={(id) => { setActiveTrackId(id); setTab('modules'); }} />
      )}
      {tab === 'modules' && (
        <ModulesTab tracks={tracks} activeTrackId={activeTrackId} onSelectTrack={setActiveTrackId} />
      )}
    </AppLayout>
  );
}

function CurriculaTab({ tracks, onFinalized, onSelect }) {
  const [prompt, setPrompt] = useState('');
  const [iterations, setIterations] = useState([]); // {id, prompt, response}
  const [selectedIterId, setSelectedIterId] = useState(null);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [loading, setLoading] = useState(false);

  const iterate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/curriculum/iterate/${USER_ID}/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, track_id: activeTrackId }),
      });
      const data = await res.json();
      setIterations(prev => [...prev, { id: data.iteration_id, prompt, response: data.response }]);
      setSelectedIterId(data.iteration_id);
      setPrompt('');
    } catch (err) { console.error(err); alert('Curriculum drafting failed — check the server.'); }
    setLoading(false);
  };

  const finalize = async () => {
    if (!selectedIterId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/curriculum/finalize/${USER_ID}/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ iteration_id: selectedIterId }),
      });
      const data = await res.json();
      alert(`Track "${data.title}" created!`);
      onFinalized();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const selected = iterations.find(it => it.id === selectedIterId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-3">
        <div className="text-xs uppercase tracking-wide text-stone-500 font-bold">Existing tracks</div>
        {tracks.map(t => (
          <div key={t.id} onClick={() => onSelect(t.id)} className="bg-white/5 border border-white/15 rounded-xl p-3 cursor-pointer hover:bg-white/10 text-sm">{t.title}</div>
        ))}
        <div className="text-xs uppercase tracking-wide text-stone-500 font-bold pt-4">Iterations {iterations.length > 0 && `(${iterations.length})`}</div>
        {iterations.map((it, i) => (
          <div key={it.id} onClick={() => setSelectedIterId(it.id)} className={`border rounded-xl p-3 cursor-pointer text-sm ${selectedIterId === it.id ? 'bg-orange-600/30 border-orange-500' : 'bg-white/5 border-white/15'}`}>
            {i + 1}. {it.prompt.slice(0, 40)}{it.prompt.length > 40 ? '...' : ''}
          </div>
        ))}
      </div>
      <div className="md:col-span-2 space-y-4">
        {selected && (
          <div className="bg-white/5 border border-white/15 rounded-2xl p-6 whitespace-pre-wrap text-sm max-h-96 overflow-y-auto">{selected.response}</div>
        )}
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe your background, the topic, and your objectives..."
          className="w-full p-4 rounded-2xl bg-black/30 border border-white/20 text-white min-h-24" />
        <div className="flex gap-3">
          <button onClick={iterate} disabled={loading} className="px-6 py-3 bg-white/10 border border-white/20 rounded-full font-bold disabled:opacity-40">{loading ? 'Drafting...' : 'Generate'}</button>
          <button onClick={finalize} disabled={loading || !selectedIterId} className="px-6 py-3 bg-orange-600 rounded-full font-bold disabled:opacity-40">Finalize Track</button>
        </div>
      </div>
    </div>
  );
}

function ModulesTab({ tracks, activeTrackId, onSelectTrack }) {
  const [modules, setModules] = useState([]);
  const [trackTitle, setTrackTitle] = useState('');
  const [activeSub, setActiveSub] = useState(null); // {id, title, moduleTitle}
  const [detail, setDetail] = useState(null);
  const [diagramSvg, setDiagramSvg] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (!activeTrackId) return;
    fetch(`${API_BASE}/tracks/modules/${activeTrackId}/`).then(r => r.json()).then(d => {
      setModules(d.modules); setTrackTitle(d.track_title);
    }).catch(console.error);
  }, [activeTrackId]);

  const openSubmodule = async (sub, moduleTitle, moduleOrder) => {
    setActiveSub({ id: sub.id, title: sub.title, moduleTitle, moduleOrder });
    setDetail(null); setDiagramSvg('');
    const res = await fetch(`${API_BASE}/tracks/submodule/${sub.id}/`);
    const data = await res.json();
    setDetail(data);
    if (data.mermaid_diagram) {
      try {
        const { svg } = await mermaid.render(`diagram-${sub.id}`, data.mermaid_diagram);
        setDiagramSvg(svg);
      } catch (err) { console.error('Mermaid render failed', err); }
    }
  };

  const submitAssignment = async () => {
    const res = await fetch(`${API_BASE}/tracks/submodule/${activeSub.id}/submit/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer }),
    });
    const data = await res.json();
    alert(data.passed ? 'Nice — assignment marked done!' : `Not quite: ${data.feedback}`);
    if (data.passed) openSubmodule({ id: activeSub.id, title: activeSub.title }, activeSub.moduleTitle, activeSub.moduleOrder);
    setAnswer('');
  };

  if (!activeTrackId) {
    return (
      <div className="space-y-3">
        <p className="text-stone-400 text-sm mb-2">Pick a track:</p>
        {tracks.map(t => (
          <div key={t.id} onClick={() => onSelectTrack(t.id)} className="bg-white/5 border border-white/15 rounded-xl p-3 cursor-pointer hover:bg-white/10">{t.title}</div>
        ))}
        {tracks.length === 0 && <p className="text-stone-500 text-sm">No tracks yet — build one in the Curricula tab.</p>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1 space-y-2">
        <div className="text-xs uppercase tracking-wide text-stone-500 font-bold mb-2">{trackTitle}</div>
        {modules.map(m => (
          <div key={m.id} className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 flex items-center justify-center bg-white text-black text-xs font-bold rounded">{m.order}</span>
              <span className="font-bold text-sm">{m.title}</span>
            </div>
            {m.submodules.map(s => (
              <div key={s.id} onClick={() => openSubmodule(s, m.title, m.order)}
                className={`ml-8 py-1 text-sm cursor-pointer hover:text-orange-400 ${activeSub?.id === s.id ? 'text-orange-400' : 'text-stone-300'}`}>
                · {s.title} {s.assignment_done && <CheckCircle2 size={12} className="inline ml-1 text-green-400" />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="md:col-span-2">
        {!activeSub && <p className="text-stone-500">Select a submodule from the left.</p>}
        {activeSub && !detail && <p className="text-stone-400">Generating learning material...</p>}
        {detail && (
          <div>
            <div className="text-xs text-stone-500 mb-2">{trackTitle} › {activeSub.moduleTitle} › {detail.title}</div>
            <div className="flex gap-2 mb-4">
              <span className={`text-xs px-3 py-1 rounded-full border ${detail.assignment_done ? 'bg-green-600/30 border-green-500' : 'border-white/20'}`}>ASSIGNMENT: {detail.assignment_done ? 'DONE' : 'PENDING'}</span>
              <span className="text-xs px-3 py-1 rounded-full border border-white/20">RESEARCH: {detail.research_done ? 'DONE' : 'PENDING'}</span>
            </div>
            <div className="text-xs uppercase tracking-wide text-stone-500 font-bold mb-2">Learning Material</div>
            <div className="whitespace-pre-wrap text-sm bg-white/5 border border-white/15 rounded-2xl p-5 mb-4">{detail.learning_material}</div>
            {diagramSvg && (
              <div className="bg-white rounded-2xl p-4 mb-4" dangerouslySetInnerHTML={{ __html: diagramSvg }} />
            )}
            {!detail.assignment_done && (
              <div>
                <div className="text-xs uppercase tracking-wide text-stone-500 font-bold mb-2">Assignment</div>
                <p className="text-sm mb-3">{detail.assignment_prompt}</p>
                <textarea value={answer} onChange={e => setAnswer(e.target.value)} className="w-full p-3 rounded-xl bg-black/30 border border-white/20 min-h-20 mb-3" />
                <button onClick={submitAssignment} className="px-6 py-2 bg-orange-600 rounded-full font-bold text-sm">Submit</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
