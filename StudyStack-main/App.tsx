
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ViewState, Announcement } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import FileViewer from './components/FileViewer';
import StudentLogin from './components/StudentLogin';
import { LogOut, ShieldCheck, X, GraduationCap, Megaphone, Loader2, MessageSquare } from 'lucide-react';
import { api } from './services/api';
import { auth } from './services/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import Chatbot from './components/Chatbot';
import ReportModal from './components/ReportModal';
import GlobalSearch from './components/GlobalSearch';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // Handle Global Search Navigation
  useEffect(() => {
    const handleViewChange = (e: any) => {
      if (e.detail) {
        setCurrentView(e.detail as ViewState);
      }
    };
    window.addEventListener('changeView', handleViewChange);
    return () => window.removeEventListener('changeView', handleViewChange);
  }, []);

  // Initialize Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          username: firebaseUser.displayName || 'User',
          rollNo: '',
          role: 'User'
        };
        setUser(profile);
      } else {
        // Only reset if not hardcoded admin
        setUser(prev => prev?.id === '78945612130' ? prev : null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  // Fetch Announcement
  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const data = await api.getAnnouncements();
        if (data) {
          setAnnouncement(data);
        } else {
          setAnnouncement(null);
        }
      } catch (err) {
        console.warn('Could not fetch announcements');
      }
    };

    if (user) {
      fetchAnnouncement();
    }
  }, [currentView, user]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setCurrentView('home');
    setShowAdminLogin(false);
  };

  const handleManualAdminLogin = () => {
    // Hardcoded Admin Profile
    setUser({
      id: '78945612130',
      username: 'System Administrator',
      role: 'Admin',
      email: 'admin@college.edu',
      rollNo: 'SYS-ADMIN'
    });
    setCurrentView('admin');
    setShowAdminLogin(false); // Reset this so if they logout they go back to main screen
  };

  // Authenticated View Router
  const renderContent = () => {
    if (!user) return null;

    if (currentView === 'admin' && user.role === 'Admin') {
      return <AdminDashboard user={user} onBack={() => setCurrentView('home')} />;
    }

    switch (currentView) {
      case 'assignments':
        return <FileViewer user={user} category="Assignments" onBack={() => setCurrentView('home')} />;
      case 'notes':
        return <FileViewer user={user} category="Notes" onBack={() => setCurrentView('home')} />;
      case 'lab-resources':
        return <FileViewer user={user} category="Lab Resources" onBack={() => setCurrentView('home')} />;
      case 'prev-year-qs':
        return <FileViewer user={user} category="Previous Year Question Papers" onBack={() => setCurrentView('home')} />;
      case 'home':
      default:
        return <Dashboard user={user} onSelectView={setCurrentView} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold tracking-widest text-xs uppercase">Authenticating...</p>
      </div>
    );
  }

  // Main Render Logic
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!user ? (
        // Unauthenticated View
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          {showAdminLogin ? (
            <div className="w-full max-w-md relative">
              <button
                onClick={() => setShowAdminLogin(false)}
                className="absolute -top-12 left-0 text-slate-400 hover:text-slate-600 font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" /> Back to Student Login
              </button>
              <Login onLogin={handleManualAdminLogin} />
            </div>
          ) : (
            <StudentLogin
              onJoin={() => { }} // Not needed as auth listener handles it
              onAdminRequest={() => setShowAdminLogin(true)}
            />
          )}
        </div>
      ) : (
        // Authenticated View
        <>
          {/* Announcement Bar */}
          {announcement && (
            <div className="bg-white border-b border-red-100 relative z-[60] overflow-hidden h-10 flex items-center shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 z-20 bg-white px-4 flex items-center gap-2 border-r border-red-50 shadow-[4px_0_15px_rgba(220,38,38,0.05)]">
                <div className="bg-red-50 p-1.5 rounded-lg">
                   <Megaphone className="w-4 h-4 text-red-600 animate-pulse" />
                </div>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] hidden md:block">Announcement Bar</span>
              </div>
              <div className="w-full flex items-center relative z-10">
                <div className="whitespace-nowrap animate-marquee-massive text-red-600 font-bold text-sm tracking-wide py-1">
                  {announcement.message}
                </div>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none"></div>
            </div>
          )}

          {/* Navigation */}
          <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
            <div
              className="flex items-center gap-4 cursor-pointer group"
              onClick={() => setCurrentView('home')}
              title="Go to Home"
            >
              <div className="w-12 h-12 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 flex items-center justify-center p-1 border border-slate-100 group-hover:scale-110 group-hover:shadow-indigo-200/50 transition-all duration-300 overflow-hidden">
                <img
                  src="https://img.icons8.com/fluency/96/graduation-cap.png"
                  alt="StudyStack Logo"
                  className="w-10 h-10 object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">StudyStack</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {user.role === 'Admin' ? 'Management Active' : 'Student Portal'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{user.username}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${user.role === 'Admin' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                  {user.role}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {user.role === 'Admin' && (
                  <button
                    onClick={() => setCurrentView('admin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentView === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Console
                  </button>
                )}
                <button
                  onClick={() => setReportModalOpen(true)}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                  title="Support & Feedback"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <main className="flex-1 max-w-7xl mx-auto w-full p-6 pb-20">
            {user && currentView !== 'admin' && <GlobalSearch />}
            {renderContent()}
          </main>

          <footer className="py-10 border-t border-slate-100 bg-white/50 text-center">
            <p className="text-slate-400 text-sm font-medium">StudyStack Management System &copy; 2024</p>
          </footer>
        </>
      )}

      {/* Alex Bot - Available for every user */}
      <Chatbot />
      
      {user && (
        <ReportModal
          user={user}
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
        />
      )}
    </div>
  );
};

export default App;
