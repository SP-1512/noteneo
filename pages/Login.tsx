import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, CheckCircle, ArrowRight, WifiOff, Sparkles, Globe } from 'lucide-react';
import { api } from '../services/firebase';
import { clsx } from 'clsx';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLocalMode = api.isLocalMode;

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isReset) {
        await resetPassword(email);
        setSuccess('Password reset email sent. Check your inbox.');
        setIsReset(false);
      } else if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Sign In Error:", err);
      setError(err.message || "Google Sign In failed.");
    }
  };

  return (
    <div className="min-h-screen flex bg-background dark:bg-[#0f0e0e] text-slate-800 dark:text-slate-100 font-sans">
      
      {/* Left Section - Hero/Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900 items-center justify-center p-12">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-900/90 to-orange-800/90 mix-blend-multiply"></div>
        <div className="relative z-10 max-w-lg text-center">
            <div className="mb-8 flex justify-center animate-float">
                <span className="font-extrabold text-7xl tracking-tighter text-white drop-shadow-2xl">
                    Note<span className="text-primary">Neo</span>
                </span>
            </div>
            <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
                Unlock Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">Academic Potential</span>
            </h1>
            <p className="text-lg text-orange-50 mb-8 leading-relaxed">
                Join thousands of students sharing notes, creating AI flashcards, and mastering their subjects together.
            </p>
            <div className="flex gap-4 justify-center">
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-400"/> AI Powered
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-full text-sm text-white flex items-center gap-2">
                    <Globe size={16} className="text-orange-400"/> Community Driven
                </div>
            </div>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="max-w-md w-full space-y-8 animate-fade-in-up">
            
            {/* Header Mobile */}
            <div className="text-center lg:text-left">
                <div className="lg:hidden flex justify-center mb-6">
                    <span className="font-extrabold text-4xl tracking-tighter text-slate-900 dark:text-white">
                        Note<span className="text-primary">Neo</span>
                    </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {isReset ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create an account'}
                </h2>
                <p className="mt-2 text-slate-500 dark:text-slate-400">
                    {isReset 
                        ? 'Enter your email to receive recovery instructions.' 
                        : isLogin 
                            ? 'Enter your details to access your notes.' 
                            : 'Start your journey with Note Neo today.'}
                </p>
            </div>

            {/* Local Mode Badge */}
            {isLocalMode && (
                <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-4 py-2 rounded-lg text-sm border border-orange-200 dark:border-orange-800/50 flex items-center justify-center lg:justify-start">
                    <WifiOff size={16} className="mr-2" /> 
                    <span>Running in <strong>Local Offline Mode</strong></span>
                </div>
            )}

            {/* Error/Success */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl text-sm flex items-start animate-fade-in">
                    <AlertCircle size={18} className="mr-2 mt-0.5 shrink-0" />
                    <span>{error.replace('Firebase: ', '')}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 p-4 rounded-xl text-sm flex items-center animate-fade-in">
                    <CheckCircle size={18} className="mr-2" />
                    <span>{success}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {!isReset && !isLogin && (
                    <div className="space-y-1.5 animate-fade-in">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                required 
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                placeholder="John Doe"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="email" 
                            required 
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                            placeholder="student@university.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                {!isReset && (
                    <div className="space-y-1.5 animate-fade-in">
                        <div className="flex justify-between items-center ml-1">
                             <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                             {isLogin && (
                                <button type="button" onClick={() => setIsReset(true)} className="text-xs font-medium text-primary hover:text-primary-dark hover:underline">
                                    Forgot password?
                                </button>
                             )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="password" 
                                required 
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl transition-all shadow-glow hover:shadow-glow-lg flex items-center justify-center transform hover:scale-[1.01] active:scale-[0.99]"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            {isReset ? 'Send Reset Link' : isLogin ? 'Sign In' : 'Create Account'}
                            {!isReset && <ArrowRight size={18} className="ml-2" />}
                        </>
                    )}
                </button>
            </form>

            {!isReset && (
                <>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-700"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-background dark:bg-[#0f0e0e] text-slate-500">Or continue with</span></div>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full flex items-center justify-center space-x-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-white font-medium py-3 rounded-xl transition-all hover:shadow-md"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        <span>Google Account</span>
                    </button>
                </>
            )}

            <div className="text-center text-sm pt-4">
                {isReset ? (
                    <button onClick={() => setIsReset(false)} className="text-primary font-semibold hover:underline">Back to Sign In</button>
                ) : (
                    <span className="text-slate-600 dark:text-slate-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-semibold hover:underline">
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </span>
                )}
            </div>

        </div>
      </div>
    </div>
  );
};