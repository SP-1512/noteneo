
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { Note } from '../types';
import { 
  Download, Trash2, ChevronRight, ChevronLeft, Brain, Check, 
  MessageSquare, BookOpen, Sparkles, Loader2, HardDrive, 
  Bookmark, Users, Star, X, Copy, Share2, 
  Link as LinkIcon, ExternalLink, Send, Bot, User as UserIcon,
  LayoutGrid, Target, ShieldAlert, Gavel
} from 'lucide-react';
import { clsx } from 'clsx';
import { explainSelection, askNoteQuestion } from '../services/geminiService';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'flashcards' | 'quiz' | 'explainer' | 'ask'>('summary');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const [selection, setSelection] = useState('');
  const [explanation, setExplanation] = useState<{text:string, example:string} | null>(null);
  const [explaining, setExplaining] = useState(false);
  
  const [chatQuery, setChatQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
      if (!id) return;
      try {
        const fetchedNote = await api.notes.getById(id);
        setNote(fetchedNote);
        if (user) {
            const bookmarks = await api.users.getBookmarks(user.uid);
            setIsBookmarked(bookmarks.includes(id));
        }
      } catch (error) { console.error("Error fetching note:", error); } 
      finally { setLoading(false); }
    };
    fetchNote();
  }, [id, user]);

  useEffect(() => {
    if (activeTab === 'ask') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  const toggleBookmark = async () => {
      if (!user || !note) return;
      const newState = !isBookmarked;
      setIsBookmarked(newState);
      await api.users.toggleBookmark(user.uid, note.id, isBookmarked);
  };

  const handleShare = async () => {
      if (navigator.share) {
          try {
              await navigator.share({
                  title: note?.title || 'NoteNeo Note',
                  text: `Check out this note on NoteNeo: ${note?.title}`,
                  url: window.location.href,
              });
          } catch (err) { console.log('Error sharing:', err); }
      } else { setShowShareModal(true); }
  };

  const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleAskAI = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatQuery.trim() || isChatting) return;

      const userMsg = chatQuery.trim();
      setChatQuery('');
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
      setIsChatting(true);

      try {
          const context = `Note Title: ${note?.title}. Subject: ${note?.subject}. Summary: ${note?.ai?.summary?.text || "N/A"}`;
          const ans = await askNoteQuestion(userMsg, context);
          setChatHistory(prev => [...prev, { role: 'assistant', content: ans }]);
      } catch (err) {
          setChatHistory(prev => [...prev, { role: 'assistant', content: "I encountered an error while analyzing your question. Please try again." }]);
      } finally {
          setIsChatting(false);
      }
  };

  const handleDelete = async () => {
    if (confirm("Permanently delete this note?")) {
      if (id) await api.notes.delete(id);
      navigate('/');
    }
  };

  const handleClaimCopyright = async () => {
    if (!id || !user || !note) return;
    setIsClaiming(true);
    try {
        await api.notes.claimCopyright(id, user.uid);
        alert("Takedown successful. Note has been removed from the library and the uploader has been penalized -50 points.");
        navigate('/');
    } catch (err) {
        console.error(err);
        alert("Copyright claim failed. Try again later.");
    } finally {
        setIsClaiming(false);
        setShowCopyrightModal(false);
    }
  };

  const handleTextSelection = () => {
    const text = window.getSelection()?.toString();
    if (text && text.length > 5) {
        setSelection(text);
        setActiveTab('explainer');
    }
  };

  const handleExplain = async () => {
    if (!selection) return;
    setExplaining(true);
    try {
        const context = note?.ai?.summary?.text || "Context";
        const result = await explainSelection(selection, context);
        setExplanation(result);
    } catch (e) { console.error(e); } finally { setExplaining(false); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-primary font-bold animate-pulse">Loading Note Data...</div>;
  if (!note || note.copyrightStatus === 'infringing') return <div className="text-center py-20 text-muted">Note not found or removed for copyright.</div>;

  const isOwnerOrAdmin = user && (user.uid === note.uploaderId || user.email?.endsWith('@admin.com'));

  const MenuItem = ({ id, label, icon: Icon, description }: { id: typeof activeTab, label: string, icon: any, description: string }) => (
    <button 
      onClick={() => { setActiveTab(id); setIsMenuOpen(false); }}
      className={clsx(
        "flex items-center gap-4 w-full p-4 md:p-5 rounded-2xl transition-all group border-2",
        activeTab === id 
          ? "bg-primary/10 border-primary text-primary" 
          : "bg-white dark:bg-slate-800 border-transparent text-slate-500 hover:border-slate-200 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm"
      )}
    >
      <div className={clsx("w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", activeTab === id ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400")}>
        <Icon size={20} />
      </div>
      <div className="text-left flex-1 min-w-0">
          <p className="text-xs md:text-sm font-black uppercase tracking-widest truncate">{label}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{description}</p>
      </div>
      <ChevronRight size={16} className="ml-auto opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-32 animate-fade-in-up" onMouseUp={handleTextSelection}>
      {/* Left: Note Viewer */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-surface dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
             <div className="space-y-1 min-w-0 flex-1">
               <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 flex-wrap break-words leading-tight">
                   {note.title}
                   {note.ai?.quality && (
                       <span className={clsx(
                         "text-[9px] md:text-[10px] uppercase tracking-widest px-3 py-1 rounded-full font-black border inline-block whitespace-nowrap",
                         note.ai.quality.score >= 8 ? "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20" : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20"
                       )}>
                           AI Score: {note.ai.quality.score}/10
                       </span>
                   )}
               </h1>
               <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg whitespace-nowrap"><BookOpen size={14} className="text-primary"/> {note.subject}</span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap"><Users size={14}/> {note.uploaderName}</span>
               </div>
             </div>
             <div className="flex items-center gap-1.5 md:gap-2 shrink-0 flex-wrap justify-end">
                <button onClick={handleShare} className="p-2 md:p-2.5 rounded-xl bg-white dark:bg-slate-700 text-slate-500 border border-slate-200 dark:border-slate-600 hover:text-primary transition-all hover:scale-110 shadow-sm" title="Share">
                    <Share2 size={18} />
                </button>
                <button onClick={toggleBookmark} className={clsx("p-2 md:p-2.5 rounded-xl transition-all hover:scale-110 shadow-sm border", isBookmarked ? "bg-amber-100 text-amber-600 border-amber-200" : "bg-white dark:bg-slate-700 text-slate-500 border-slate-200 dark:border-slate-600")} title="Bookmark">
                  <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
                </button>
                {!isOwnerOrAdmin && (
                   <button onClick={() => setShowCopyrightModal(true)} className="p-2 md:p-2.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl transition-all hover:scale-110 shadow-sm" title="Copyright Claim">
                       <ShieldAlert size={18} />
                   </button>
                )}
                {isOwnerOrAdmin && (
                   <button onClick={handleDelete} className="p-2 md:p-2.5 text-red-500 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110 shadow-sm" title="Delete"><Trash2 size={18} /></button>
                )}
             </div>
          </div>
          
          <div className="aspect-[4/5] w-full bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative group/viewer shadow-inner">
            {note.fileType.includes('image') ? (
                <img src={note.fileURL} alt="Preview" className="w-full h-full object-contain" />
            ) : (
                <div className="w-full h-full relative">
                  <iframe src={note.fileURL} className="w-full h-full" title="PDF Viewer"></iframe>
                  <div className="absolute inset-0 bg-black/5 flex items-center justify-center opacity-0 group-hover/viewer:opacity-100 transition-opacity pointer-events-none backdrop-blur-[2px]">
                     <p className="bg-white/95 dark:bg-slate-900/95 px-6 py-3 rounded-full text-xs md:text-sm font-black shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-center max-w-[80%]">
                        <ExternalLink size={16} className="text-primary shrink-0"/> External Viewer Recommended
                     </p>
                  </div>
                </div>
            )}
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover/viewer:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 w-full max-w-[280px] px-4">
                <a href={note.fileURL} target="_blank" rel="noreferrer" className="bg-primary hover:bg-primary-dark text-white w-full py-3 rounded-full text-xs font-black shadow-glow flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95">
                    <ExternalLink size={18}/> Fullscreen Reading Mode
                </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right: AI Tools */}
      <div className="lg:col-span-5">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-24 h-[calc(100vh-120px)] min-h-[500px] flex flex-col transition-all duration-500">
          
          {/* Panel Header */}
          <div className="bg-slate-900 dark:bg-slate-950 p-4 md:p-5 text-white flex justify-between items-center z-30 shadow-md shrink-0">
             <div className="flex items-center space-x-3 min-w-0">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className={clsx(
                    "p-2 rounded-xl transition-all active:scale-95 shrink-0",
                    isMenuOpen ? "bg-primary text-white" : "bg-white/10 text-slate-400 hover:text-white hover:bg-white/20"
                  )}
                  title="Tutor Menu"
                >
                  {isMenuOpen ? <X size={20} /> : <LayoutGrid size={20} />}
                </button>
                <div className="flex items-center space-x-2 min-w-0">
                  <Sparkles size={18} className="text-primary animate-pulse shrink-0" />
                  <span className="font-black uppercase tracking-widest text-[10px] md:text-xs truncate">
                    {isMenuOpen ? "Select Tool" : activeTab}
                  </span>
                </div>
             </div>
             <div className="text-[9px] font-black text-slate-500 px-2 py-1 bg-white/5 rounded-lg border border-white/10 uppercase tracking-widest shrink-0">
                Gemini v3.1
             </div>
          </div>

          <div className="flex-1 relative overflow-hidden flex flex-col">
            {/* Navigation Overlay */}
            <div className={clsx(
                "absolute inset-0 z-20 bg-slate-50 dark:bg-slate-900 p-4 md:p-6 transition-all duration-500 ease-in-out flex flex-col gap-3 overflow-y-auto",
                isMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
            )}>
                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2 px-1">Study Modules</h3>
                <MenuItem id="summary" label="Smart Summary" icon={Sparkles} description="Condensed insights and key points." />
                <MenuItem id="flashcards" label="Active Recall" icon={Brain} description="Self-testing with AI-generated cards." />
                <MenuItem id="quiz" label="Assessment" icon={Target} description="Test your knowledge with 5-step quiz." />
                <MenuItem id="explainer" label="Deep Explainer" icon={BookOpen} description="Contextual breakdowns of selected text." />
                <MenuItem id="ask" label="Direct Consult" icon={MessageSquare} description="Ask any doubt directly to Gemini AI." />
            </div>

            {/* Main Feature Content Area */}
            <div className="flex-grow overflow-y-auto p-4 md:p-6 scrollbar-hide flex flex-col w-full overflow-x-hidden">
              <div key={activeTab} className="animate-fade-in flex-grow flex flex-col w-full">
                  {/* ... same content as before ... */}
                  {activeTab === 'summary' && (
                      <div className="space-y-6 w-full">
                          {note.ai?.summary ? (
                              <>
                              <div className="p-5 md:p-6 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/10 w-full">
                                  <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-3">Professional Overview</h3>
                                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 font-medium italic break-words">"{note.ai.summary.text}"</p>
                              </div>
                              <div className="space-y-4 w-full">
                                  <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Critical Bullet Points</h3>
                                  <ul className="space-y-3">
                                      {note.ai.summary.keyPoints.map((p, i) => (
                                          <li key={i} className="text-sm flex gap-3 group/li w-full">
                                              <div className="w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black group-hover/li:bg-primary group-hover/li:text-white transition-colors">{i+1}</div>
                                              <span className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed break-words flex-1">{p}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              </>
                          ) : <div className="text-center py-24 opacity-30 font-black tracking-widest">CONTENT NOT PROCESSED</div>}
                      </div>
                  )}

                  {activeTab === 'flashcards' && note.ai?.flashcards && (
                      <div className="flex flex-col items-center justify-center h-full space-y-8 py-6 w-full">
                          <div className="w-full max-w-[320px] h-80 perspective-1000 cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
                              <div className={clsx("relative w-full h-full duration-700 transform-style-3d transition-all", isFlipped && "rotate-y-180")}>
                                  <div className="absolute w-full h-full backface-hidden bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center text-center shadow-sm overflow-hidden">
                                      <span className="absolute top-4 left-4 text-[9px] font-black text-primary uppercase tracking-[0.2em]">Front / Question</span>
                                      <p className="text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight break-words px-2">{note.ai.flashcards[currentCardIndex].q}</p>
                                      <span className="absolute bottom-4 text-[9px] font-bold text-slate-400 italic">Click to reveal</span>
                                  </div>
                                  <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 rotate-y-180 rounded-3xl p-6 md:p-10 flex flex-col items-center justify-center text-center shadow-xl overflow-hidden">
                                      <span className="absolute top-4 left-4 text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Back / Concept</span>
                                      <p className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-relaxed italic break-words px-2">{note.ai.flashcards[currentCardIndex].a}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="flex items-center gap-6 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setTimeout(() => setCurrentCardIndex(Math.max(0, currentCardIndex - 1)), 150) }} className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"><ChevronLeft size={20}/></button>
                              <span className="text-[10px] font-black text-slate-400 tracking-widest">{currentCardIndex + 1} / {note.ai.flashcards.length}</span>
                              <button onClick={(e) => { e.stopPropagation(); setIsFlipped(false); setTimeout(() => setCurrentCardIndex(Math.min(note.ai!.flashcards!.length - 1, currentCardIndex + 1)), 150) }} className="w-12 h-12 md:w-14 md:h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"><ChevronRight size={20}/></button>
                          </div>
                      </div>
                  )}

                  {activeTab === 'quiz' && note.ai?.quizzes?.[0] && (
                      <div className="space-y-8 pb-10 w-full overflow-x-hidden">
                          {note.ai.quizzes[0].questions.map((q, idx) => (
                          <div key={q.id} className="bg-slate-50 dark:bg-slate-900/50 p-5 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-700 group/q w-full">
                              <p className="font-black text-sm md:text-base text-slate-900 dark:text-white mb-4 flex gap-3 break-words">
                                  <span className="text-primary shrink-0">{idx+1}.</span>
                                  {q.question}
                              </p>
                              <div className="space-y-2">
                                  {q.choices.map((c, cI) => (
                                      <button key={cI} onClick={() => !quizSubmitted && setQuizAnswers({...quizAnswers, [q.id]: cI})} 
                                      className={clsx(
                                          "w-full text-left p-3.5 rounded-xl text-xs md:text-sm font-bold border transition-all break-words",
                                          quizSubmitted 
                                              ? (q.answerIndex === cI ? "bg-emerald-100 border-emerald-300 text-emerald-800" : quizAnswers[q.id] === cI ? "bg-red-100 border-red-300 text-red-800" : "bg-white dark:bg-slate-800 text-slate-400 opacity-60") 
                                              : (quizAnswers[q.id] === cI ? "bg-primary text-white border-primary shadow-glow" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 text-slate-600 dark:text-slate-300")
                                      )}>
                                      {c}
                                      </button>
                                  ))}
                              </div>
                              {quizSubmitted && q.explanation && (
                                  <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-[10px] md:text-[11px] text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-100 dark:border-emerald-800 italic animate-fade-in break-words">
                                      <span className="font-black mr-1 uppercase">Rationale:</span> {q.explanation}
                                  </div>
                              )}
                          </div>
                          ))}
                          <button onClick={() => { setQuizSubmitted(!quizSubmitted); if(quizSubmitted) setQuizAnswers({}); }} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 text-xs md:text-sm">
                              {quizSubmitted ? "Try Again" : "Check Score"}
                          </button>
                      </div>
                  )}

                  {activeTab === 'explainer' && (
                      <div className="flex flex-col h-full w-full">
                          {!selection ? (
                              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-fade-in h-full w-full">
                                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-900 rounded-2xl md:rounded-[2rem] flex items-center justify-center border border-slate-200 dark:border-slate-700 group shrink-0">
                                      <BookOpen className="text-slate-400 group-hover:text-primary transition-colors" size={28}/>
                                  </div>
                                  <div className="space-y-1 px-4">
                                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Deep Explore Mode</p>
                                      <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed break-words">Highlight text in the document viewer to see AI breakdowns here.</p>
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-6 w-full">
                                  <div className="bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-2xl border-l-4 border-yellow-400 shadow-sm animate-slide-in-right w-full">
                                      <p className="text-[9px] font-black text-yellow-600 uppercase mb-2 tracking-widest">Selected Fragment</p>
                                      <p className="text-sm font-bold text-slate-800 dark:text-yellow-100 leading-relaxed italic break-words">"{selection}"</p>
                                  </div>
                                  {!explanation && !explaining && (
                                      <button onClick={handleExplain} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-glow flex items-center justify-center gap-2 hover:bg-primary-dark transition-all text-xs">
                                          <Sparkles size={18}/> Analyze Selection
                                      </button>
                                  )}
                                  {explaining && <div className="flex flex-col items-center py-12 gap-4"><Loader2 className="animate-spin text-primary" size={32}/><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Consulting Gemini...</p></div>}
                                  {explanation && (
                                      <div className="space-y-4 animate-fade-in w-full">
                                          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-full">
                                              <h4 className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><Sparkles size={12}/> Translation</h4>
                                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed break-words">{explanation.text}</p>
                                          </div>
                                          <div className="bg-emerald-50 dark:bg-emerald-950 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 w-full">
                                              <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">Mental Model</h4>
                                              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed italic break-words">{explanation.example}</p>
                                          </div>
                                          <button onClick={() => { setSelection(''); setExplanation(null); }} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-200 py-2 transition-colors">Clear</button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  )}

                  {activeTab === 'ask' && (
                      <div className="flex flex-col h-full bg-slate-50/10 dark:bg-slate-900/5 -mx-4 -my-4 md:-mx-6 md:-my-6 px-4 py-4 md:px-6 md:py-6 overflow-x-hidden">
                          <div className="flex-grow space-y-6 overflow-y-auto pr-1 scrollbar-hide pb-4 w-full">
                              {chatHistory.length === 0 && (
                                  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in w-full">
                                      <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 mb-4 shadow-sm shrink-0">
                                          <Bot className="text-primary" size={28}/>
                                      </div>
                                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-[10px] mb-1">Direct Consultant</h3>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[240px] font-medium leading-relaxed break-words px-2">
                                          Ask Gemini anything about formulas, missing data, or conceptual clarity within these notes.
                                      </p>
                                  </div>
                              )}

                              {chatHistory.map((msg, i) => (
                                  <div key={i} className={clsx("flex flex-col animate-fade-in-up w-full", msg.role === 'user' ? "items-end" : "items-start")}>
                                      <div className={clsx("flex items-center gap-1.5 mb-1.5", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                                          <div className={clsx("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", msg.role === 'user' ? "bg-primary text-white" : "bg-slate-800 text-white")}>
                                              {msg.role === 'user' ? <UserIcon size={12}/> : <Sparkles size={12}/>}
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                              {msg.role === 'user' ? 'Scholar' : 'Gemini AI'}
                                          </span>
                                      </div>
                                      <div className={clsx(
                                          "max-w-[90%] md:max-w-[85%] p-4 rounded-2xl text-[13px] md:text-sm font-medium leading-relaxed shadow-sm border break-words overflow-hidden",
                                          msg.role === 'user' 
                                              ? "bg-primary text-white border-primary rounded-tr-none" 
                                              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 rounded-tl-none"
                                      )}>
                                          {msg.content}
                                      </div>
                                  </div>
                              ))}

                              {isChatting && (
                                  <div className="flex flex-col items-start animate-fade-in w-full">
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                          <div className="w-6 h-6 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                                              <Sparkles size={12} className="animate-pulse" />
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Gemini thinking...</span>
                                      </div>
                                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 flex gap-1.5 shrink-0">
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></div>
                                      </div>
                                  </div>
                              )}
                              <div ref={chatEndRef} />
                          </div>

                          <form onSubmit={handleAskAI} className="mt-4 sticky bottom-0 z-10 animate-fade-in shrink-0 w-full px-1">
                              <div className="flex gap-2 p-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl focus-within:ring-2 focus-within:ring-primary/50 transition-all w-full box-border">
                                  <input 
                                      type="text" 
                                      value={chatQuery} 
                                      onChange={(e) => setChatQuery(e.target.value)} 
                                      placeholder="Clarify this concept..." 
                                      className="flex-1 bg-transparent px-3 py-2 text-[13px] md:text-sm font-medium outline-none text-slate-800 dark:text-white placeholder-slate-400 min-w-0" 
                                      disabled={isChatting}
                                  />
                                  <button 
                                      type="submit" 
                                      disabled={isChatting || !chatQuery.trim()} 
                                      className="bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl transition-all shadow-glow hover:scale-105 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shrink-0"
                                  >
                                      {isChatting ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
                                  </button>
                              </div>
                              <div className="mt-2.5 text-[8px] md:text-[9px] text-center font-black text-slate-400 uppercase tracking-[0.3em] flex items-center justify-center gap-2 overflow-hidden">
                                  <div className="w-10 md:w-12 h-px bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                                  <span className="truncate">Gemini Intelligence System</span>
                                  <div className="w-10 md:w-12 h-px bg-slate-200 dark:bg-slate-700 shrink-0"></div>
                              </div>
                          </form>
                      </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCopyrightModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md p-8 relative animate-scale-in border border-white/10 text-center">
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
                      <Gavel size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Claim Original Ownership</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                      If you are the original author of this material and believe it was re-uploaded without permission, you can initiate an <strong>Instant Takedown</strong>. 
                      <br/><br/>
                      <span className="text-red-500 font-bold">Penalty:</span> The infringer will lose <strong>50 Scholar Points</strong> immediately.
                  </p>
                  <div className="flex flex-col gap-3">
                      <button 
                        onClick={handleClaimCopyright}
                        disabled={isClaiming}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                      >
                          {isClaiming ? <Loader2 className="animate-spin" size={18} /> : <ShieldAlert size={18} />}
                          {isClaiming ? "Processing..." : "Confirm Takedown"}
                      </button>
                      <button 
                        onClick={() => setShowCopyrightModal(false)}
                        className="w-full text-slate-400 font-black uppercase tracking-widest text-xs py-2 hover:text-slate-600 transition-colors"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showShareModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-md p-8 md:p-10 relative animate-scale-in border border-white/10 my-auto">
                  <button onClick={() => setShowShareModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                  <div className="space-y-2 mb-6 md:mb-8 text-center">
                    <h3 className="font-black text-2xl md:text-3xl text-slate-900 dark:text-white tracking-tighter">Share Wisdom</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Collaborate with scholars</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl md:rounded-3xl p-3 md:p-4 flex flex-col md:flex-row items-center gap-4 border border-slate-200 dark:border-slate-700 w-full">
                      <div className="flex-1 min-w-0 w-full">
                         <input type="text" readOnly value={window.location.href} className="w-full bg-transparent text-[11px] md:text-sm font-bold truncate text-slate-600 dark:text-slate-400 outline-none p-1" />
                      </div>
                      <button 
                        onClick={handleCopyLink} 
                        className={clsx(
                            "w-full md:w-auto px-6 py-3 rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all shadow-glow shrink-0", 
                            linkCopied ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-primary-dark"
                        )}
                      >
                          {linkCopied ? <div className="flex items-center justify-center gap-2"><Check size={14}/> Copied</div> : "Copy Link"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};