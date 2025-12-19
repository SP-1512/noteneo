import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/firebase';
import { Note } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Filter, Book, Clock, User as UserIcon, 
  Tag, Moon, Sun, Plus, Users, Star, QrCode, 
  X, Camera, Image as ImageIcon, Loader2, ArrowRight, Trash2, Library
} from 'lucide-react';
import { clsx } from 'clsx';
// @ts-ignore
import jsQR from 'jsqr';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'mine'>('all');
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  
  // Scan Modal State
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('theme') === 'dark';
    return false;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); } 
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        const fetchedNotes = await api.notes.getAll();
        setNotes(fetchedNotes);
        if (user) {
            const fIds = await api.users.getFollowingIds(user.uid);
            setFollowingIds(fIds);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchNotes();
  }, [user]);

  useEffect(() => {
      if (!isScanModalOpen || scanMode !== 'camera') {
          stopCamera();
          return;
      }
      startCamera();
      return () => stopCamera();
  }, [isScanModalOpen, scanMode]);

  const startCamera = async () => {
      setScanError(null);
      setScanning(true);
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.setAttribute('playsinline', 'true');
              videoRef.current.play();
              requestAnimationFrame(tick);
          }
      } catch (err) {
          setScanError("Could not access camera. Please allow permissions or use image upload.");
          setScanning(false);
      }
  };

  const stopCamera = () => {
      if (videoRef.current && videoRef.current.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      setScanning(false);
  };

  const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          if (canvas) {
              canvas.height = videoRef.current.videoHeight;
              canvas.width = videoRef.current.videoWidth;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
                  
                  if (code && code.data) {
                      handleScanResult(code.data);
                      return;
                  }
              }
          }
      }
      animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleScanResult = (data: string) => {
      let noteId = '';
      if (data.includes('/note/')) {
          const parts = data.split('/note/');
          if (parts[1]) noteId = parts[1].split('?')[0];
      } else if (data.startsWith('NN-')) {
         const found = notes.find(n => n.serialNumber === data);
         if(found) noteId = found.id;
      } else {
         noteId = data;
      }

      if(noteId) {
          stopCamera();
          setIsScanModalOpen(false);
          navigate(`/note/${noteId}`);
      } else {
          alert("Note not found from QR code: " + data);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (evt) => {
              const img = new Image();
              img.onload = () => {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  if(ctx) {
                      ctx.drawImage(img, 0, 0);
                      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                      const code = jsQR(imageData.data, imageData.width, imageData.height);
                      if(code) handleScanResult(code.data);
                      else setScanError("No QR code found in image.");
                  }
              };
              img.src = evt.target?.result as string;
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this note? This cannot be undone.")) return;
    try {
      await api.notes.delete(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error("Delete failed", error);
      alert("Failed to delete note. Please try again.");
    }
  };

  const filteredNotes = notes.filter(note => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = note.title.toLowerCase().includes(term) ||
                          note.subject.toLowerCase().includes(term) ||
                          note.tags.some(tag => tag.toLowerCase().includes(term)) ||
                          (note.serialNumber && note.serialNumber.toLowerCase().includes(term));
    const matchesSubject = selectedSubject === 'All' || note.subject === selectedSubject;
    let matchesTab = true;
    if (activeTab === 'following') matchesTab = followingIds.includes(note.uploaderId);
    else if (activeTab === 'mine') matchesTab = note.uploaderId === user?.uid;
    return matchesSearch && matchesSubject && matchesTab;
  });

  const subjects = ['All', ...Array.from(new Set(notes.map(n => n.subject)))];

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in-up relative pb-20 w-full overflow-x-hidden">
      <div className="space-y-6 md:space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="px-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 break-words">Discover Notes</h1>
              <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 break-words">Join the community of students mastering their subjects.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <button onClick={() => setIsScanModalOpen(true)} className="p-3 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:scale-105 shrink-0" title="Scan QR Code">
                 <QrCode size={20} />
              </button>
              <button onClick={toggleTheme} className="p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all hover:scale-105 shrink-0">
                {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
              </button>
              <Link to="/upload" className="flex items-center space-x-2 bg-primary hover:bg-primary-dark text-white px-5 py-3 rounded-full font-bold shadow-glow hover:shadow-glow-lg transition-all hover:scale-105 active:scale-95 text-sm shrink-0">
                <Plus size={20} /><span>Upload</span>
              </Link>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-2 md:gap-3 w-full">
             <div className="relative flex-grow min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search materials..." 
                  className="w-full pl-11 pr-14 md:pr-28 py-3 bg-transparent text-slate-900 dark:text-white outline-none placeholder:text-slate-400 text-sm md:text-base" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
                <button className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 md:px-5 py-1.5 md:py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition-all flex items-center justify-center min-h-[36px]">
                    <span className="hidden md:inline">Search</span>
                    <Search size={16} className="md:hidden" />
                </button>
             </div>
             <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-700 my-2"></div>
             <div className="relative md:min-w-[180px] shrink-0">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                <select className="w-full pl-11 pr-8 py-3 bg-transparent text-slate-900 dark:text-white outline-none appearance-none cursor-pointer text-sm md:text-base border-none focus:ring-0" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                    {subjects.map(sub => <option key={sub} value={sub} className="dark:bg-slate-800">{sub}</option>)}
                </select>
             </div>
        </div>

        <div className="border-b border-slate-200 dark:border-slate-800 w-full overflow-hidden">
          <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-px w-full -mb-[1px]">
               <button onClick={() => setActiveTab('all')} className={clsx("pb-3 text-[11px] md:text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 shrink-0", activeTab === 'all' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600")}>
                  <Book size={16} /> All Resources
               </button>
               <button onClick={() => setActiveTab('following')} className={clsx("pb-3 text-[11px] md:text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 shrink-0", activeTab === 'following' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600")}>
                  <Users size={16} /> Following
               </button>
               <button onClick={() => setActiveTab('mine')} className={clsx("pb-3 text-[11px] md:text-sm font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 whitespace-nowrap px-1 shrink-0", activeTab === 'mine' ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600")}>
                  <Library size={16} /> My Library
               </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32"><div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-primary"></div></div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 md:py-24 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 animate-fade-in px-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Book size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-2">No results found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Try a different keyword or browse other categories.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
          {filteredNotes.map(note => (
            <Link to={`/note/${note.id}`} key={note.id} className="group relative block h-full overflow-hidden rounded-2xl w-full">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-amber-500 rounded-2xl opacity-0 group-hover:opacity-60 transition duration-300 blur-sm"></div>
              <div className="relative h-full bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 group-hover:-translate-y-1 flex flex-col w-full">
                {user && user.uid === note.uploaderId && (
                  <button 
                    onClick={(e) => handleDeleteNote(e, note.id)}
                    className="absolute top-3 left-3 z-30 p-2 bg-white/90 dark:bg-slate-900/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 shadow-lg border border-red-100"
                    title="Delete Note"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="h-40 md:h-48 rounded-xl bg-slate-100 dark:bg-slate-900/50 overflow-hidden relative flex items-center justify-center shrink-0">
                   {note.fileType.includes('image') ? (
                       <img src={note.fileURL} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" />
                   ) : (
                       <div className="flex flex-col items-center">
                           <div className="w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center mb-2">
                              <Book size={28} className="text-primary" />
                           </div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document</span>
                       </div>
                   )}
                   <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                       {note.ai?.quality && (
                            <div className="px-2 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg text-[9px] font-black shadow-sm flex items-center border border-slate-100 dark:border-slate-700">
                                <Star size={10} className="text-amber-400 fill-amber-400 mr-1 shrink-0"/> 
                                <span>{note.ai.quality.score}/10</span>
                            </div>
                       )}
                       {note.serialNumber && (
                           <div className="px-2 py-0.5 bg-black/80 text-white backdrop-blur rounded-md text-[9px] font-mono shadow-sm">
                               {note.serialNumber}
                           </div>
                       )}
                   </div>
                   <div className="absolute bottom-3 left-3 max-w-[85%]">
                       <span className="px-3 py-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur rounded-lg text-[10px] font-black text-primary shadow-sm border border-slate-100 dark:border-slate-700 uppercase tracking-widest truncate block">
                           {note.subject}
                       </span>
                   </div>
                </div>
                <div className="p-4 md:p-5 flex-grow flex flex-col min-w-0">
                  <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors break-words">{note.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mb-4 shrink-0">
                    {note.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded-md max-w-[100px] truncate">
                            #{tag}
                        </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400 font-bold">
                     <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-[10px] text-white font-black shrink-0">
                            {note.uploaderName[0]}
                        </div>
                        <span className="truncate max-w-[80px]">{note.uploaderName}</span>
                     </div>
                     <div className="flex items-center gap-1 shrink-0">
                        <Clock size={10}/>
                        {new Date(note.uploadDate).toLocaleDateString()}
                     </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isScanModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-scale-in border border-white/20 my-auto">
                  <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                      <div>
                          <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white uppercase tracking-tight">QR Scanner</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Snap to find resources</p>
                      </div>
                      <button onClick={() => setIsScanModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"><X size={20}/></button>
                  </div>
                  <div className="p-5 md:p-6 flex-grow flex flex-col items-center min-h-0 overflow-y-auto">
                      <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 mb-6 w-full shrink-0">
                          <button onClick={() => setScanMode('camera')} className={clsx("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", scanMode === 'camera' ? "bg-white dark:bg-slate-600 shadow-sm text-primary dark:text-white" : "text-slate-500 hover:text-slate-800")}>
                              <Camera size={14}/> Camera
                          </button>
                          <button onClick={() => setScanMode('upload')} className={clsx("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all", scanMode === 'upload' ? "bg-white dark:bg-slate-600 shadow-sm text-primary dark:text-white" : "text-slate-500 hover:text-slate-800")}>
                              <ImageIcon size={14}/> Upload
                          </button>
                      </div>
                      {scanMode === 'camera' ? (
                          <div className="w-full aspect-square bg-black rounded-2xl overflow-hidden relative shadow-inner shrink-0">
                              <video ref={videoRef} className="w-full h-full object-cover" muted />
                              <canvas ref={canvasRef} className="hidden" />
                              <div className="absolute inset-0 border-[3px] border-primary/50 m-10 rounded-2xl pointer-events-none animate-pulse-subtle"></div>
                              {!scanning && <div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest bg-black/60 backdrop-blur-sm px-4 text-center">Camera Loading...</div>}
                          </div>
                      ) : (
                          <div className="w-full aspect-square bg-slate-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-center p-6 relative group shrink-0">
                              <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <ImageIcon size={28} className="text-slate-400 group-hover:text-primary"/>
                              </div>
                              <p className="text-xs font-black uppercase tracking-widest text-slate-500">Pick image from gallery</p>
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </div>
                      )}
                      {scanError && (
                          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-[10px] font-black uppercase tracking-widest rounded-xl w-full text-center animate-fade-in border border-red-100 shrink-0">
                              {scanError}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};