
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { generateNoteSummary, generateFlashcards, generateQuiz, assessNoteQuality, detectNoteErrors, validateNoteContent } from '../services/geminiService';
import { Upload as UploadIcon, CheckCircle, AlertCircle, Loader2, Sparkles, ShieldCheck, X, Ban, Tag as TagIcon, Plus, FileSearch, Zap, ArrowDown, Copy } from 'lucide-react';
import { Note, CoAuthor } from '../types';
import { clsx } from 'clsx';

const ModernInput = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props} 
    className="w-full px-4 py-2.5 md:py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all shadow-sm text-sm md:text-base"
  />
);

// Helper to generate a stable hash from string
function generateContentHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export const Upload: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  
  const [tagInput, setTagInput] = useState('');
  const [tagList, setTagList] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  
  const [duplicateNote, setDuplicateNote] = useState<Note | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  
  const contentHashRef = useRef<string>('');

  // Client-side Compression Logic
  const compressImage = async (originalFile: File): Promise<File> => {
    if (!originalFile.type.startsWith('image/')) return originalFile;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(originalFile);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], originalFile.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(originalFile);
            }
          }, 'image/jpeg', 0.7); // 70% quality compression
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setOriginalSize(selectedFile.size);
      resetValidation();

      if (selectedFile.type.startsWith('image/')) {
        setIsCompressing(true);
        const compressed = await compressImage(selectedFile);
        setCompressedSize(compressed.size);
        setFile(compressed);
        setIsCompressing(false);
      } else {
        setFile(selectedFile);
        setCompressedSize(selectedFile.size);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const resetValidation = () => {
    setAnalysisDone(false);
    setIsRejected(false);
    setRejectionReason('');
    setSuggestedTags([]);
    setQualityScore(null);
    setDuplicateNote(null);
  };

  const handleAddTag = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = tagInput.trim().toLowerCase();
    if (clean && !tagList.includes(clean)) {
      setTagList([...tagList, clean]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => setTagList(tagList.filter(t => t !== tag));

  const addSuggestedTag = (tag: string) => {
    if (!tagList.includes(tag.toLowerCase())) setTagList([...tagList, tag.toLowerCase()]);
    setSuggestedTags(suggestedTags.filter(t => t !== tag));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const runStrictVerification = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    resetValidation();
    try {
      const isImage = file.type.startsWith('image/');
      let contentData = isImage ? await fileToBase64(file) : `Note Analysis. Title: ${title}. Filename: ${file.name}`;
      
      // Generate a content-based hash
      const hash = generateContentHash(contentData);
      contentHashRef.current = hash;

      // Anti-piracy: Check for duplicates
      const existing = await api.notes.checkDuplicateHash(hash);
      if (existing) {
          setDuplicateNote(existing);
          setIsRejected(true);
          setRejectionReason("Piracy detected. This document matches an existing record in our library.");
          setIsAnalyzing(false);
          return;
      }

      const audit = await validateNoteContent(contentData, isImage);
      if (!audit.isEducationalNote) {
        setIsRejected(true);
        setRejectionReason(audit.violationReason);
        setIsAnalyzing(false);
        return;
      }
      setSuggestedTags(audit.suggestedTags);
      const quality = await assessNoteQuality(contentData, isImage, title, subject);
      setQualityScore(quality.score);
      setAnalysisDone(true);
    } catch (error) {
      console.error("Verification failed", error);
      setRejectionReason("The verification server is busy. Please try again.");
      setIsRejected(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || isRejected || !analysisDone) return;
    setIsUploading(true);
    try {
      setUploadStep('Uploading...');
      const path = `notes/${user.uid}/${Date.now()}_${file.name}`;
      const fileURL = await api.storage.uploadFile(file, path);
      setUploadStep('AI Processing...');
      const isImage = file.type.startsWith('image/');
      let contentForAI = isImage ? await fileToBase64(file) : `Subject: ${subject}. Title: ${title}`;
      const [summary, flashcards, quiz] = await Promise.all([
        generateNoteSummary(contentForAI, isImage),
        generateFlashcards(contentForAI),
        generateQuiz(contentForAI)
      ]);
      setUploadStep('Finalizing...');
      const noteData: Omit<Note, 'id'> = {
        title,
        subject,
        semester: 'N/A',
        tags: Array.from(new Set(tagList)),
        uploaderId: user.uid,
        uploaderIds: [user.uid],
        uploaderName: user.displayName || 'Scholar',
        fileURL,
        fileType: file.type,
        uploadDate: new Date().toISOString(),
        ai: {
          contentHash: contentHashRef.current,
          summary,
          flashcards,
          quizzes: [quiz],
          quality: { score: qualityScore || 7, clarity: 'High', completeness: 'Full', relevance: 'High', legibility: 'Clear' },
          processedBy: 'gemini-3-flash-preview'
        },
        copyrightStatus: 'original'
      };
      await api.notes.create(noteData);
      navigate('/');
    } catch (error) { console.error("Upload failed", error); } finally { setIsUploading(false); }
  };

  const savingsPercent = originalSize > 0 ? Math.round(((originalSize - compressedSize) / originalSize) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 py-6 md:py-8 animate-fade-in-up overflow-x-hidden px-1">
      <div className="text-center px-4">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight break-words">Publish Knowledge</h1>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-2 break-words">Contribute to the global student library.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden w-full">
        <form onSubmit={handlePublish} className="p-5 md:p-8 space-y-6 md:space-y-8">
          
          <div className={clsx(
            "group border-4 border-dashed rounded-[2rem] p-8 md:p-12 text-center transition-all relative w-full overflow-hidden",
            file ? "border-emerald-500/50 bg-emerald-50/20" : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
          )}>
            <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".pdf,.png,.jpg,.jpeg,.txt" required disabled={isCompressing || isUploading} />
            
            <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none w-full">
              {isCompressing ? (
                <div className="animate-fade-in flex flex-col items-center py-4">
                  <Loader2 className="animate-spin text-primary mb-3" size={40} />
                  <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">NeoCompress™ Active</p>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Shrinking file for faster study...</p>
                </div>
              ) : file ? (
                <div className="animate-scale-in flex flex-col items-center w-full">
                  <CheckCircle className="text-emerald-500 mb-2 shrink-0" size={40} />
                  <span className="text-base md:text-xl font-black text-slate-900 dark:text-white break-all px-4">{file.name}</span>
                  
                  {savingsPercent > 5 && (
                    <div className="mt-4 flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm animate-fade-in-up">
                      <div className="flex flex-col text-left">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Size Optimized</span>
                        <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-500 line-through opacity-50">{formatSize(originalSize)}</span>
                           <ArrowDown size={12} className="text-emerald-500" />
                           <span className="text-xs font-black text-emerald-600">{formatSize(compressedSize)}</span>
                        </div>
                      </div>
                      <div className="bg-emerald-500 text-white px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> -{savingsPercent}%
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-emerald-600 font-black uppercase mt-3 tracking-widest">Ready for Verification</span>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 rounded-2xl md:rounded-3xl flex items-center justify-center transition-transform shrink-0">
                    <UploadIcon className="text-primary" size={32} />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-black text-sm md:text-base">Click or drag note to pick</p>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
                    <Zap size={12} className="text-primary" fill="currentColor"/>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Instant Auto-Compression Active</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            <div className="w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Document Title</label>
              <ModernInput value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Psychology Intro" required />
            </div>
            <div className="w-full">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Subject Area</label>
              <ModernInput value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Science" required />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/50 p-5 md:p-6 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Metadata Tags</label>
            <div className="flex flex-wrap gap-2 w-full">
              {tagList.map(tag => (
                <span key={tag} className="bg-primary text-white px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-sm animate-scale-in max-w-full truncate">
                  <TagIcon size={12} className="shrink-0" /> <span className="truncate">{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-black shrink-0"><X size={14}/></button>
                </span>
              ))}
              {tagList.length === 0 && <span className="text-[11px] text-slate-400 italic">Add tags for better discovery...</span>}
            </div>
            <div className="flex gap-2 w-full">
              <div className="flex-1 min-w-0">
                <ModernInput value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag(e)} placeholder="Type tag & Enter" />
              </div>
              <button type="button" onClick={() => handleAddTag()} className="bg-slate-200 dark:bg-slate-700 px-4 md:px-5 rounded-xl text-slate-700 dark:text-white hover:bg-slate-300 shrink-0"><Plus size={20}/></button>
            </div>
            {suggestedTags.length > 0 && (
              <div className="pt-2 animate-fade-in w-full">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1.5"><Sparkles size={12} className="text-amber-500 shrink-0" /> AI Suggested</p>
                <div className="flex flex-wrap gap-2 w-full">
                  {suggestedTags.map(tag => (
                    <button key={tag} type="button" onClick={() => addSuggestedTag(tag)} className="text-[10px] px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-primary text-slate-600 font-bold uppercase tracking-wider truncate max-w-[140px] transition-all">+ {tag}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {!analysisDone && !isAnalyzing && !isRejected && file && !isCompressing && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-5 md:p-6 rounded-3xl border border-amber-100 dark:border-amber-900/50 flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in w-full">
              <div className="flex items-start gap-4 min-w-0">
                <ShieldCheck size={32} className="text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-black text-amber-900 dark:text-amber-100 text-xs md:text-sm uppercase tracking-tight">Security Check</h4>
                  <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400 mt-1 font-bold leading-relaxed break-words">AI must verify academic context before publication.</p>
                </div>
              </div>
              <button type="button" onClick={runStrictVerification} className="w-full md:w-auto bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-dark shadow-glow shrink-0 transition-all active:scale-95">Verify</button>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-10 md:p-12 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-200 animate-pulse w-full">
              <FileSearch className="text-primary animate-bounce mb-4 shrink-0" size={40} />
              <p className="font-black text-xs uppercase tracking-[0.2em] text-primary">Analyzing Optimized Data...</p>
              <p className="text-[10px] text-slate-400 mt-2 text-center font-bold px-4">Inspecting academic data signatures.</p>
            </div>
          )}

          {isRejected && (
            <div className="p-6 md:p-8 bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-900 rounded-3xl animate-fade-in flex flex-col items-center text-center gap-4 w-full">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center shrink-0">
                {duplicateNote ? <Copy size={36} className="text-red-600 dark:text-red-400" /> : <Ban size={36} className="text-red-600 dark:text-red-400" />}
              </div>
              <div className="w-full">
                <h3 className="text-red-900 dark:text-red-200 font-black text-lg md:text-xl tracking-tight uppercase">{duplicateNote ? 'Duplicate Detected' : 'Upload Denied'}</h3>
                <div className="bg-white/80 dark:bg-black/20 p-4 rounded-2xl mt-4 border border-red-100 w-full">
                  <p className="text-red-700 dark:text-red-300 text-[11px] md:text-sm font-black break-words">{rejectionReason}</p>
                  {duplicateNote && (
                      <button 
                        type="button" 
                        onClick={() => navigate(`/note/${duplicateNote.id}`)}
                        className="mt-3 text-[10px] font-black uppercase text-primary hover:underline flex items-center justify-center gap-2 mx-auto"
                      >
                          View Original <ArrowDown size={12} />
                      </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest max-w-sm">
                {duplicateNote ? "Policy: No re-uploads allowed." : "Academic materials only."}
              </p>
              <button type="button" onClick={() => { setFile(null); resetValidation(); }} className="text-[10px] font-black text-red-600 uppercase underline transition-all hover:scale-105">Try again</button>
            </div>
          )}

          {analysisDone && !isRejected && (
            <div className="p-5 md:p-6 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-900 rounded-3xl animate-fade-in flex items-center justify-between w-full">
              <div className="flex items-center gap-4 min-w-0">
                <CheckCircle className="text-emerald-500 shrink-0" size={28} />
                <div className="min-w-0">
                  <h3 className="font-black text-emerald-900 dark:text-emerald-100 uppercase text-[10px] md:text-xs tracking-[0.2em] truncate">Audit Passed</h3>
                  <p className="text-[10px] md:text-[11px] text-emerald-700 dark:text-emerald-400 font-bold break-words">Quality Index: {qualityScore}/10</p>
                </div>
              </div>
              <Sparkles className="text-amber-400 animate-pulse shrink-0" />
            </div>
          )}

          <button 
            type="submit" 
            disabled={isUploading || isRejected || !analysisDone || isCompressing} 
            className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 md:py-5 rounded-2xl shadow-glow transition-all flex justify-center items-center gap-3 text-lg md:text-xl disabled:opacity-30 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-95"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin shrink-0" /> {uploadStep}</>
            ) : (
              <>Publish Optimized Note <UploadIcon size={24} className="shrink-0"/></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};