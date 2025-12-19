
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, Zap, Brain, Rocket, ShieldCheck, 
  Users, Trophy, StickyNote, QrCode, Search, 
  FileText, MessageSquare, Target, Star, 
  Lightbulb, ChevronRight, HardDrive, Share2,
  Trash2, ExternalLink, Library, Fingerprint,
  ShieldAlert, Gavel, Camera, Linkedin, Image as ImageIcon
} from 'lucide-react';
import { clsx } from 'clsx';

const FeatureCard = ({ icon: Icon, title, description, tags, color }: { icon: any, title: string, description: string, tags: string[], color: string }) => (
  <div className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-glow transition-all duration-300 flex flex-col h-full">
    <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 shadow-sm", color)}>
      <Icon size={28} />
    </div>
    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 flex-grow">{description}</p>
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <span key={tag} className="px-3 py-1 bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400 rounded-lg border border-slate-100 dark:border-slate-800">
          {tag}
        </span>
      ))}
    </div>
  </div>
);

const SectionHeader = ({ title, subtitle }: { title: string, subtitle: string }) => (
  <div className="mb-12">
    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
      <div className="w-1.5 h-8 bg-primary rounded-full" />
      {title}
    </h2>
    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">{subtitle}</p>
  </div>
);

export const Guide: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto py-12 animate-fade-in-up">
      {/* HERO SECTION */}
      <div className="text-center mb-24">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6">
          <Rocket size={14} /> Platform Guide v3.0
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-6 leading-none">
          Master the <span className="text-primary italic">NoteNeo</span> Experience
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Unlock the full potential of your study sessions with our AI-integrated ecosystem designed for elite students.
        </p>
      </div>

      {/* COPYRIGHT & PROTECTION */}
      <section className="mb-24">
        <SectionHeader 
          title="Copyright & Integrity" 
          subtitle="Our YouTube-inspired protection system ensures original authors are always respected." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Gavel} 
            title="Copyright Claims" 
            description="Original owners can claim copyright on re-uploaded content. Infringing notes are removed immediately upon owner request."
            tags={['Takedown', 'Originality', 'Gavel']}
            color="bg-red-500/10 text-red-500"
          />
          <FeatureCard 
            icon={ShieldAlert} 
            title="Purity Penalty" 
            description="Users caught re-uploading others' work face an automatic 50-point deduction from their Scholar Reputation score."
            tags={['-50 Points', 'Penalty', 'Policy']}
            color="bg-amber-500/10 text-amber-500"
          />
          <FeatureCard 
            icon={Zap} 
            title="Fingerprint Guard" 
            description="Our system generates a unique content hash during upload to proactively block exact duplicates before publication."
            tags={['Anti-Piracy', 'Auto-Block', 'Hash']}
            color="bg-primary/10 text-primary"
          />
        </div>
      </section>

      {/* PROFESSIONAL IDENTITY */}
      <section className="mb-24">
        <SectionHeader 
          title="Digital Identity" 
          subtitle="Build a professional profile that showcases your academic contributions." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Camera} 
            title="Visual Presence" 
            description="Customize your profile with high-resolution profile pictures and beautiful banners to stand out in the community."
            tags={['Custom DP', 'Banners', 'Visuals']}
            color="bg-indigo-500/10 text-indigo-500"
          />
          <FeatureCard 
            icon={Linkedin} 
            title="LinkedIn Sync" 
            description="Connect your professional network. Linked profiles get a verified badge, helping you connect with fellow scholars."
            tags={['Networking', 'Verification', 'Connect']}
            color="bg-[#0077b5]/10 text-[#0077b5]"
          />
          <FeatureCard 
            icon={QrCode} 
            title="ID QR Card" 
            description="Generate a unique QR code for your profile. Other students can scan it to view your entire public library instantly."
            tags={['Quick Share', 'ID Card', 'Scanner']}
            color="bg-purple-500/10 text-purple-500"
          />
        </div>
      </section>

      {/* AI LEARNING HUB */}
      <section className="mb-24">
        <SectionHeader 
          title="AI Learning Core" 
          subtitle="Your personal tutor is embedded in every single note." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={MessageSquare} 
            title="Direct Consult" 
            description="Chat directly with Gemini AI about any part of the note. Get explanations, missing formulas, or clarification in real-time."
            tags={['Gemini 3.1', 'Tutor', 'Chat']}
            color="bg-cyan-500/10 text-cyan-500"
          />
          <FeatureCard 
            icon={Target} 
            title="Smart Quizzes" 
            description="AI-generated 5-question assessments tailored to the content. Test your mastery and get instant rationale for every answer."
            tags={['Assessment', 'Scores', 'Exam Prep']}
            color="bg-emerald-500/10 text-emerald-500"
          />
          <FeatureCard 
            icon={Brain} 
            title="Recall Cards" 
            description="Study using interactive flashcards. AI automatically picks the most important concepts to ensure you remember the essentials."
            tags={['Active Recall', 'Memory', 'Study']}
            color="bg-pink-500/10 text-pink-500"
          />
        </div>
      </section>

      {/* DISCOVERY & PRODUCTIVITY */}
      <section className="mb-24">
        <SectionHeader 
          title="Productivity Tools" 
          subtitle="Tools designed to keep your personal resources organized and accessible." 
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={Fingerprint} 
            title="Serial Codes" 
            description="Every upload gets a unique NN-shortcode. Type this into the search bar to find specific physical notes digitally."
            tags={['NN-ID', 'Shortcode', 'Search']}
            color="bg-blue-500/10 text-blue-500"
          />
          <FeatureCard 
            icon={StickyNote} 
            title="The NeoPad" 
            description="A persistent scratchpad available on every page. Sync your quick thoughts to the cloud or download them as text files."
            tags={['Sticky Note', 'Cloud Sync', 'Tool']}
            color="bg-amber-500/10 text-amber-500"
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="Gatekeeper Audit" 
            description="Every upload undergoes a 'Zero-Trust' AI audit to ensure only educational materials are shared in the ecosystem."
            tags={['AI Filter', 'Security', 'Quality']}
            color="bg-slate-500/10 text-slate-500"
          />
        </div>
      </section>

      {/* CALL TO ACTION */}
      <div className="bg-primary p-12 md:p-16 rounded-[3.5rem] text-center text-white shadow-glow-lg animate-float">
        <h2 className="text-3xl md:text-4xl font-black mb-6 tracking-tighter">Ready to start studying smarter?</h2>
        <p className="text-orange-50/80 mb-10 max-w-xl mx-auto font-bold">
          Jump back into your dashboard or start your first upload to experience the power of NoteBuddy.
        </p>
        <Link 
          to="/"
          className="bg-white text-primary px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 inline-flex items-center gap-2"
        >
          Go to Dashboard <ChevronRight size={18} strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
};
