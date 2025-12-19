import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/firebase';
import { Note, UserProfile } from '../types';
import { Link, useParams } from 'react-router-dom';
import { 
  Edit2, GraduationCap, Users, UserPlus, 
  Save, Bookmark, Trophy, Medal, X, MapPin, 
  BookOpen, Calendar, Mail, FileText, Check, Settings, Star, Clock, Tag, Trash2, QrCode, Camera, Image as ImageIcon, Loader2,
  Linkedin, ExternalLink
} from 'lucide-react';
import { clsx } from 'clsx';

export const Profile: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { uid } = useParams<{ uid: string }>();
  
  const targetUid = uid || currentUser?.uid;
  const isOwnProfile = currentUser?.uid === targetUid;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userNotes, setUserNotes] = useState<Note[]>([]);
  const [bookmarkedNotes, setBookmarkedNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'uploads' | 'bookmarks'>('uploads');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editBio, setEditBio] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editLinkedin, setEditLinkedin] = useState('');
  
  const [tempPhoto, setTempPhoto] = useState<File | null>(null);
  const [tempBanner, setTempBanner] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!targetUid) return;
      setLoading(true);
      try {
        const profileData = await api.users.getProfile(targetUid);
        setProfile(profileData);
        if(profileData) {
            setEditBio(profileData.bio || '');
            setEditCollege(profileData.education?.college || '');
            setEditBranch(profileData.education?.branch || '');
            setEditYear(profileData.education?.year || '');
            setEditLinkedin(profileData.linkedinURL || '');
            setPhotoPreview(profileData.photoURL || null);
            setBannerPreview(profileData.bannerURL || null);
        }
        const notes = await api.notes.getUserNotes(targetUid);
        setUserNotes(notes);
        if (isOwnProfile) {
            const bIds = await api.users.getBookmarks(targetUid);
            const bNotes = await Promise.all(bIds.map(id => api.notes.getById(id)));
            setBookmarkedNotes(bNotes.filter(n => n !== null) as Note[]);
        }
        if (!isOwnProfile && currentUser) {
          const following = await api.users.isFollowing(currentUser.uid, targetUid);
          setIsFollowing(following);
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [targetUid, currentUser, isOwnProfile]);

  const compressImage = async (file: File, maxWidth = 1200, quality = 0.7): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        };
      };
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 400, 0.8);
      setTempPhoto(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const compressed = await compressImage(e.target.files[0], 1200, 0.7);
      setTempBanner(compressed);
      setBannerPreview(URL.createObjectURL(compressed));
    }
  };

  const handleFollowToggle = async () => {
     if(!currentUser || !targetUid) return;
     if(isFollowing) { await api.users.unfollow(currentUser.uid, targetUid); setIsFollowing(false); }
     else { await api.users.follow(currentUser.uid, targetUid); setIsFollowing(true); }
  };

  const handleSave = async () => {
      if(!targetUid) return;
      setIsSaving(true);
      try {
          let photoURL = profile?.photoURL;
          let bannerURL = profile?.bannerURL;

          if (tempPhoto) {
              photoURL = await api.storage.uploadFile(tempPhoto, `profiles/${targetUid}/photo_${Date.now()}`);
          }
          if (tempBanner) {
              bannerURL = await api.storage.uploadFile(tempBanner, `profiles/${targetUid}/banner_${Date.now()}`);
          }

          const updatedData: Partial<UserProfile> = {
              bio: editBio,
              photoURL,
              bannerURL,
              linkedinURL: editLinkedin,
              education: {
                  college: editCollege,
                  branch: editBranch,
                  year: editYear
              }
          };
          await api.users.updateProfile(targetUid, updatedData);
          setProfile(p => p ? { ...p, ...updatedData } : null);
          setTempPhoto(null);
          setTempBanner(null);
          setIsEditing(false);
      } catch (err) {
          console.error("Failed to save profile", err);
          alert("Error saving profile changes.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Delete permanently?")) return;
    try {
      await api.notes.delete(noteId);
      setUserNotes(prev => prev.filter(n => n.id !== noteId));
      setBookmarkedNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) { console.error(error); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-6 md:space-y-8 animate-fade-in-up px-1">
      
      <div className="bg-surface dark:bg-gray-800 rounded-2xl md:rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden relative w-full">
        <div className="h-40 md:h-56 bg-slate-200 dark:bg-slate-900 relative overflow-hidden shrink-0 group">
            {bannerPreview ? (
                <img src={bannerPreview} className="w-full h-full object-cover" alt="Banner" />
            ) : (
                <div className="w-full h-full bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500"></div>
            )}
            <div className="absolute inset-0 bg-black/10"></div>
            
            {isEditing && (
                <button 
                    onClick={() => bannerInputRef.current?.click()}
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2.5 rounded-xl backdrop-blur-md flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all z-20"
                >
                    <ImageIcon size={16} /> 
                    <span className="hidden sm:inline">Change Banner</span>
                </button>
            )}
            <input type="file" ref={bannerInputRef} onChange={handleBannerChange} accept="image/*" className="hidden" />
            
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse-subtle"></div>
        </div>

        <div className="px-5 md:px-10 pb-8">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="relative -mt-16 md:-mt-24 shrink-0 flex flex-col items-center md:items-start group">
                    <div className="relative">
                        <img 
                            src={photoPreview || `https://ui-avatars.com/api/?name=${profile?.displayName}`} 
                            className="w-32 h-32 md:w-48 md:h-48 rounded-full border-4 border-surface dark:border-gray-800 shadow-xl object-cover bg-white animate-scale-in" 
                            alt={profile?.displayName}
                        />
                        {isEditing && (
                            <button 
                                onClick={() => photoInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 hover:bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Camera size={32} />
                                <span className="text-[10px] font-black uppercase mt-2">Change Photo</span>
                            </button>
                        )}
                        <input type="file" ref={photoInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                    </div>
                    
                    <div className="mt-4 flex flex-col items-center md:items-start gap-2 w-full">
                        <span className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 uppercase tracking-widest",
                            profile?.level === 4 
                                ? "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/30" 
                                : "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30"
                        )}>
                           <Medal size={14} className="shrink-0" />
                           {profile?.badges?.[0] || 'Novice'} • Lvl {profile?.level || 1}
                        </span>
                    </div>
                </div>

                <div className="flex-grow pt-4 md:pt-4 min-w-0">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
                        <div className="space-y-3 text-center md:text-left min-w-0 flex-1">
                            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight break-words px-2 md:px-0">
                                {profile?.displayName}
                            </h1>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="shrink-0 text-primary" />
                                    <span className="truncate max-w-full">{profile?.email}</span>
                                </div>
                                {profile?.linkedinURL && (
                                    <a 
                                        href={profile.linkedinURL.startsWith('http') ? profile.linkedinURL : `https://${profile.linkedinURL}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="flex items-center gap-2 text-[#0077b5] hover:text-[#005582] transition-colors"
                                    >
                                        <Linkedin size={14} className="shrink-0" />
                                        <span>LinkedIn</span>
                                    </a>
                                )}
                            </div>

                            {!isEditing && (
                                <div className="mt-4 space-y-4 animate-fade-in w-full">
                                    {profile?.bio && (
                                        <p className="text-sm md:text-base text-slate-600 dark:text-gray-300 max-w-2xl leading-relaxed break-words px-4 md:px-0 font-medium italic">
                                            "{profile.bio}"
                                        </p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-3 text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-400">
                                        {(profile?.education?.college || profile?.education?.year) ? (
                                            <>
                                                {profile.education.college && (
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                                        <GraduationCap size={16} className="text-primary shrink-0"/>
                                                        <span className="truncate max-w-[140px] md:max-w-none">{profile.education.college}</span>
                                                    </div>
                                                )}
                                                {(profile.education.branch || profile.education.year) && (
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                                        <BookOpen size={16} className="text-primary shrink-0"/>
                                                        <span>{profile.education.year} {profile.education.branch && `• ${profile.education.branch}`}</span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            isOwnProfile && <span className="italic opacity-50 px-4 md:px-0">Add academic info in settings</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="mt-4 bg-slate-50 dark:bg-slate-700/50 p-5 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 w-full max-w-2xl animate-fade-in shadow-inner">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">College / Uni</label>
                                            <input type="text" value={editCollege} onChange={e => setEditCollege(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary" placeholder="University" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Study Year</label>
                                                <select value={editYear} onChange={e => setEditYear(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-bold outline-none cursor-pointer">
                                                    <option value="">Select</option>
                                                    <option value="1st Year">1st Year</option>
                                                    <option value="2nd Year">2nd Year</option>
                                                    <option value="3rd Year">3rd Year</option>
                                                    <option value="4th Year">4th Year</option>
                                                    <option value="Graduated">Graduated</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Major</label>
                                                <input type="text" value={editBranch} onChange={e => setEditBranch(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-[11px] font-bold outline-none" placeholder="e.g. CSE" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">LinkedIn Profile URL</label>
                                            <div className="relative">
                                                <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input 
                                                    type="url" 
                                                    value={editLinkedin} 
                                                    onChange={e => setEditLinkedin(e.target.value)} 
                                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-primary" 
                                                    placeholder="linkedin.com/in/username" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Short Bio</label>
                                        <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium outline-none resize-none" placeholder="A little about yourself..." />
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button onClick={() => { setIsEditing(false); setPhotoPreview(profile?.photoURL || null); setBannerPreview(profile?.bannerURL || null); setTempPhoto(null); setTempBanner(null); }} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancel</button>
                                        <button 
                                            onClick={handleSave} 
                                            disabled={isSaving}
                                            className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-dark shadow-glow active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16}/>}
                                            {isSaving ? 'Saving...' : 'Save Profile'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 shrink-0 justify-center md:justify-end w-full md:w-auto px-4 md:px-0">
                            <button 
                                onClick={() => setShowQR(true)} 
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                            >
                                <QrCode size={18} />
                                <span>ID QR</span>
                            </button>
                            {isOwnProfile ? (
                                !isEditing && (
                                    <button 
                                        onClick={() => setIsEditing(true)} 
                                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                                    >
                                        <Settings size={18} />
                                        <span>Settings</span>
                                    </button>
                                )
                            ) : (
                                <button 
                                    onClick={handleFollowToggle} 
                                    className={clsx(
                                        "w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-glow active:scale-95",
                                        isFollowing 
                                            ? "bg-slate-100 text-slate-700 border border-slate-200 shadow-none" 
                                            : "bg-primary text-white hover:bg-primary-dark"
                                    )}
                                >
                                    {isFollowing ? <Check size={18} /> : <UserPlus size={18} />}
                                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="border-t border-slate-100 dark:border-gray-700 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-gray-700 bg-slate-50/30 dark:bg-gray-800/50 shrink-0">
            <StatBox label="Points" value={profile?.points || 0} icon={Trophy} color="text-orange-500" />
            <StatBox label="Notes" value={userNotes.length} icon={FileText} color="text-primary" />
            <StatBox label="Followers" value={profile?.followersCount || 0} icon={Users} color="text-orange-500" />
            <StatBox label="Following" value={profile?.followingCount || 0} icon={UserPlus} color="text-primary" />
        </div>
      </div>

      {showQR && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
              <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-8 md:p-10 text-center relative animate-scale-in border border-white/10 my-auto">
                   <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><X size={20}/></button>
                   <div className="space-y-2 mb-6 md:mb-8">
                       <h3 className="font-black text-xl md:text-2xl text-slate-900 dark:text-white tracking-tighter">Student ID Card</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share your public library</p>
                   </div>
                   <div className="mx-auto bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-glass border border-slate-100 mb-6 md:mb-8 transform transition-transform hover:scale-105">
                       <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} alt="Profile QR" className="w-40 h-40 md:w-48 md:h-48" />
                   </div>
                   <div className="space-y-2 w-full">
                       <p className="text-xs font-black text-slate-900 dark:text-white break-all">{profile?.displayName}</p>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Verified Scholar Profile</p>
                   </div>
              </div>
          </div>
      )}

      <div className="space-y-6 w-full overflow-hidden">
          <div className="border-b border-slate-200 dark:border-gray-700 w-full overflow-hidden">
              <div className="flex overflow-x-auto scrollbar-hide shrink-0 w-full">
                  <TabButton 
                    isActive={activeTab === 'uploads'} 
                    onClick={() => setActiveTab('uploads')} 
                    icon={FileText} 
                    label={`Uploads (${userNotes.length})`} 
                  />
                  {isOwnProfile && (
                    <TabButton 
                        isActive={activeTab === 'bookmarks'} 
                        onClick={() => setActiveTab('bookmarks')} 
                        icon={Bookmark} 
                        label={`Saved Library (${bookmarkedNotes.length})`} 
                    />
                  )}
              </div>
          </div>

          <div className="min-h-[240px] w-full">
              {(activeTab === 'uploads' ? userNotes : bookmarkedNotes).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 dark:border-gray-700 rounded-3xl animate-fade-in text-center px-4 w-full">
                      <div className="p-4 bg-slate-100 dark:bg-gray-800 rounded-full mb-4 shrink-0">
                          <FileText size={32} className="text-slate-300" />
                      </div>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-4">No content found in this wing</p>
                      {activeTab === 'uploads' && isOwnProfile && (
                          <Link to="/upload" className="mt-4 text-primary font-black uppercase text-[10px] tracking-[0.2em] hover:underline">Upload First Note</Link>
                      )}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                      {(activeTab === 'uploads' ? userNotes : bookmarkedNotes).map(note => (
                          <NoteCard key={note.id} note={note} isOwnProfile={isOwnProfile && activeTab === 'uploads'} onDelete={handleDeleteNote} />
                      ))}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string, value: number, icon: any, color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="p-4 md:p-6 flex flex-col items-center justify-center text-center hover:bg-white dark:hover:bg-gray-700/50 transition-colors cursor-default shrink-0 overflow-hidden">
        <Icon size={20} className={clsx("mb-2 shrink-0", color)} />
        <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-white truncate w-full">{value}</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1 truncate w-full">{label}</span>
    </div>
);

const TabButton: React.FC<{ isActive: boolean, onClick: () => void, icon: any, label: string }> = ({ isActive, onClick, icon: Icon, label }) => (
    <button 
        onClick={onClick}
        className={clsx(
            "flex items-center gap-2 px-6 py-4 text-[10px] md:text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap shrink-0",
            isActive 
                ? "border-primary text-primary bg-primary/5 shadow-inner" 
                : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
        )}
    >
        <Icon size={14} className="shrink-0" />
        <span className="truncate">{label}</span>
    </button>
);

const NoteCard: React.FC<{ note: Note, isOwnProfile?: boolean, onDelete?: (id: string) => void }> = ({ note, isOwnProfile, onDelete }) => (
    <div className="group relative bg-surface dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col h-full w-full">
        {isOwnProfile && onDelete && (
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(note.id); }} className="absolute top-2.5 left-2.5 z-20 p-2 bg-white/95 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 shadow-md border border-red-100 shrink-0" title="Delete">
                <Trash2 size={16} />
            </button>
        )}
        <Link to={`/note/${note.id}`} className="flex flex-col h-full w-full">
            <div className="h-32 bg-slate-100 dark:bg-gray-900/50 border-b border-slate-100 dark:border-gray-700 relative flex items-center justify-center overflow-hidden shrink-0">
                {note.fileType.includes('image') ? (
                    <img src={note.fileURL} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />
                ) : (
                    <FileText size={40} className="text-slate-300 group-hover:text-primary transition-all duration-500 group-hover:scale-110 shrink-0" />
                )}
                {note.ai?.quality && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur rounded-lg shadow-sm border border-slate-200 text-[9px] font-black z-10 shrink-0">
                        <Star size={10} className="text-amber-500 fill-amber-500 shrink-0"/>
                        <span className={note.ai.quality.score >= 8 ? "text-emerald-600" : "text-amber-600"}>{note.ai.quality.score}/10</span>
                    </div>
                )}
            </div>
            <div className="p-4 md:p-5 flex flex-col flex-grow min-w-0 w-full">
                <div className="flex justify-between items-start mb-2 w-full">
                    <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg uppercase tracking-widest truncate max-w-full">
                        {note.subject}
                    </span>
                </div>
                <h3 className="font-black text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors text-xs md:text-sm leading-tight break-words px-1">
                    {note.title}
                </h3>
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-700 text-[9px] font-bold text-slate-400 shrink-0 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Clock size={12} className="shrink-0"/>
                        <span className="truncate">{new Date(note.uploadDate).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </Link>
    </div>
);
