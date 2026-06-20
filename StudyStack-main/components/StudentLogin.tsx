
import React, { useState } from 'react';
import { GraduationCap, ArrowRight, User, Mail, Hash, Lock, Loader2, LogIn, ChevronRight } from 'lucide-react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface StudentLoginProps {
  onJoin: (profile: UserProfile) => void;
  onAdminRequest: () => void;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onJoin, onAdminRequest }) => {
  const [isSignUp, setIsSignUp] = useState(false); // Default to Sign In
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { user } = await api.signInWithGoogle();
      onJoin(user);
    } catch (err: any) {
      setError(err.message || 'Google Authentication failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Email and Password are required.');
      return;
    }

    if (isSignUp) {
      if (!name.trim() || !rollNo.trim()) {
        setError('Full Name and Roll Number are required for registration.');
        return;
      }
      if (!validateEmail(email)) {
        setError('Please enter a valid email.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await api.signup({
          email,
          password,
          username: name.trim(),
          roll_no: rollNo.trim()
        });
        // Firebase auto-signs in after signup
      } else {
        const { user } = await api.login({
          email,
          password
        });
        onJoin(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-8 relative z-10">
          <div 
            onClick={onAdminRequest}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl text-white mb-4 shadow-xl shadow-indigo-200 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
          >
            <GraduationCap className="w-8 h-8 transition-transform group-hover:rotate-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-slate-500 font-medium">
            {isSignUp ? 'Join the future of academic learning' : 'Alex is waiting to help you today'}
          </p>
        </div>

        <div className="space-y-6 relative z-10">
          {/* Main Action Area */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Name"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll No</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={rollNo}
                      onChange={(e) => setRollNo(e.target.value)}
                      placeholder="21BCE..."
                      className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                    />
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-slate-700"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-[11px] font-bold p-3 rounded-2xl border border-red-100 animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-slate-900 border-b-4 border-slate-950 text-white font-black rounded-2xl hover:bg-indigo-600 hover:border-indigo-700 active:translate-y-1 active:border-b-0 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 disabled:opacity-50 mt-4 overflow-hidden relative group"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isSignUp ? 'Begin Journey' : 'Access Portal'}
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-100 w-full" />
            <span className="bg-white px-4 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] absolute">Or continue with</span>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign {isSignUp ? 'up' : 'in'} with Google
          </button>

          {/* Switch View Toggle */}
          <div className="text-center pt-4">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              className="text-slate-400 hover:text-indigo-600 text-sm font-bold transition-colors inline-flex items-center gap-1 group"
            >
              {isSignUp ? (
                <>
                  Already have an account? <span className="text-slate-700 group-hover:text-indigo-600 underline decoration-indigo-200 underline-offset-4 decoration-2">Sign in</span>
                </>
              ) : (
                <>
                  Don't have an account? <span className="text-slate-700 group-hover:text-indigo-600 underline decoration-indigo-200 underline-offset-4 decoration-2">Create one</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center opacity-30">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Studystack v4.0 • Secured by Firebase</p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
