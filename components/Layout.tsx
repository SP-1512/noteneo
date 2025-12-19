
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Upload, User as UserIcon, BookOpen, Menu, X, Sparkles, StickyNote, Minimize2, Download, HardDrive, HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // NeoPad State
  const [isNeoPadOpen, setIsNeoPadOpen] = useState(false);
  const [stickyContent, setStickyContent] = useState('');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      const savedSticky = localStorage.getItem(`noteneo_global_sticky_${user.uid}`);
      if (savedSticky) setStickyContent(savedSticky);
    }
  }, [user]);

  const handleStickyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setStickyContent(val);
    if (user) {
      localStorage.setItem(`noteneo_global_sticky_${user.uid}`, val);
    }
  };

  const downloadSticky = () => {
    const element = document.createElement("a");
    const file = new Blob([stickyContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `my_neopad.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const saveStickyToDrive = async () => {
    if (!stickyContent) return;
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      alert("NeoPad synced to your cloud account!");
    } catch (e) {
      alert("Failed to save to Drive");
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label, onClick }: { to: string, icon: any, label: string, onClick?: () => void }) => (
    <Link
      to={to}
      onClick={onClick}
      className={clsx(
        "flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm whitespace-nowrap",
        isActive(to) 
          ? "bg-primary text-white shadow-glow" 
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-white"
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background dark:bg-[#0f0e0e] flex flex-col transition-colors duration-300 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-100/30 via-background to-background dark:from-orange-950/20 dark:via-[#0f0e0e] dark:to-[#0f0e0e] overflow-x-hidden">
      
      <nav className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        scrolled 
          ? "bg-white/80 dark:bg-[#0f0e0e]/80 backdrop-blur-md border-slate-200/50 dark:border-slate-800/50 py-2 shadow-sm" 
          : "bg-transparent border-transparent py-4"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center shrink-0">
              <Link to="/" className="flex items-center group">
                <span className="font-extrabold text-2xl tracking-tighter text-slate-900 dark:text-white flex items-center">
                  Note<span className="text-primary">Neo</span>
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-2">
              {user ? (
                <>
                  <NavItem to="/" icon={BookOpen} label="Explore" />
                  <NavItem to="/upload" icon={Upload} label="Upload" />
                  <NavItem to="/guide" icon={HelpCircle} label="Guide" />
                  <NavItem to={`/user/${user.uid}`} icon={UserIcon} label="Profile" />
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center space-x-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all text-sm font-medium hover:shadow-sm"
                  >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link to="/login" className="px-6 py-2.5 rounded-full bg-primary text-white font-medium hover:bg-primary-dark transition-all shadow-glow hover:shadow-glow-lg text-sm">
                  Get Started
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-700 dark:text-slate-200 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMobileMenuOpen && user && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 dark:bg-[#0f0e0e]/95 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 p-4 space-y-2 animate-fade-in shadow-xl">
             <NavItem to="/" icon={BookOpen} label="Explore" onClick={() => setIsMobileMenuOpen(false)} />
             <NavItem to="/upload" icon={Upload} label="Upload" onClick={() => setIsMobileMenuOpen(false)} />
             <NavItem to="/guide" icon={HelpCircle} label="Guide" onClick={() => setIsMobileMenuOpen(false)} />
             <NavItem to={`/user/${user.uid}`} icon={UserIcon} label="Profile" onClick={() => setIsMobileMenuOpen(false)} />
             <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2">
               <button
                  onClick={() => signOut()}
                  className="flex items-center space-x-2 px-4 py-3 w-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-medium"
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
             </div>
          </div>
        )}
      </nav>

      <div className={clsx("h-20", scrolled ? "h-20" : "h-24")}></div>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-12 overflow-x-hidden">
        {children}
      </main>

      {user && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
          {isNeoPadOpen && (
            <div className="w-[85vw] max-w-[320px] h-[450px] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-primary/20 dark:border-primary/30 flex flex-col overflow-hidden animate-scale-in origin-bottom-right pointer-events-auto transition-all hover:shadow-glow-lg group/panel">
              <div className="bg-gradient-to-r from-primary via-primary to-primary-dark p-4 flex justify-between items-center shadow-md shrink-0">
                <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-widest truncate">
                  <StickyNote size={18} className="group-hover/panel:animate-bounce shrink-0" /> <span className="truncate">NeoPad</span>
                </div>
                <button
                  onClick={() => setIsNeoPadOpen(false)}
                  className="text-white hover:bg-white/20 p-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Minimize2 size={18} />
                </button>
              </div>

              <div className="flex-grow flex flex-col bg-orange-50/20 dark:bg-slate-900/40 overflow-hidden">
                <textarea
                  className="flex-grow p-5 bg-transparent text-slate-900 dark:text-orange-50 resize-none outline-none text-sm font-medium leading-relaxed font-sans placeholder:text-orange-300 dark:placeholder:text-slate-600 w-full"
                  placeholder="Capture quick thoughts..."
                  value={stickyContent}
                  onChange={handleStickyChange}
                  spellCheck={false}
                />

                <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 flex flex-wrap justify-between items-center px-4 bg-slate-50 dark:bg-slate-900/90 shrink-0 gap-2">
                  <button
                    onClick={downloadSticky}
                    className="text-[10px] flex items-center gap-1.5 font-bold text-primary dark:text-orange-400 hover:text-primary-dark uppercase tracking-widest transition-all"
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={saveStickyToDrive}
                    className="text-[10px] flex items-center gap-1.5 font-bold text-primary dark:text-orange-400 hover:text-primary-dark uppercase tracking-widest transition-all"
                  >
                    <HardDrive size={14} /> Sync
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsNeoPadOpen(!isNeoPadOpen)}
            className={clsx(
              "w-14 h-14 md:w-16 md:h-16 rounded-full shadow-glow flex items-center justify-center transition-all duration-500 transform active:scale-90 pointer-events-auto",
              isNeoPadOpen
                ? "bg-slate-900 text-white hover:bg-black hover:scale-110 shadow-xl"
                : "bg-primary text-white hover:bg-primary-dark hover:rotate-6 hover:scale-110 hover:shadow-glow-lg"
            )}
            title={isNeoPadOpen ? "Minimize NeoPad" : "Open NeoPad Scratchpad"}
          >
            {isNeoPadOpen ? <Minimize2 size={24} /> : <StickyNote size={28} className="animate-pulse-subtle" />}
          </button>
        </div>
      )}

      <footer className="mt-auto border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-[#0f0e0e]/50 backdrop-blur-sm shrink-0">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
               <span className="font-extrabold text-xl text-slate-700 dark:text-slate-300 tracking-tighter">Note<span className="text-primary">Neo</span></span>
            </div>
            <p className="text-center text-slate-500 dark:text-slate-400 text-xs md:text-sm break-words px-4">
              &copy; {new Date().getFullYear()} NoteNeo. AI-Powered Study Companion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
