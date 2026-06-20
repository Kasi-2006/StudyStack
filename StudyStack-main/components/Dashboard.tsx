
import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, FlaskConical, ChevronRight, Loader2, RefreshCw, Wifi, AlertTriangle, X, Send, History, Flag, Check, Star, Mail } from 'lucide-react';
import { UserProfile, ViewState, Message } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  user: UserProfile;
  onSelectView: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onSelectView }) => {
  const [stats, setStats] = useState({ subjects: 0, files: 0, checkouts: 0, loading: true });
  const [isOnline, setIsOnline] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMessages, setShowMessages] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getStats();
      setStats({ subjects: data.subjects, files: data.files, checkouts: data.checkouts, loading: false });
      setIsOnline(true);
    } catch (error) {
      console.error(error);
      setIsOnline(false);
    } finally {
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const data = await api.getMessages(user.id);
      setMessages(data || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { 
    fetchStats(); 
    fetchMessages();
  }, []);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim() || isReporting) return;

    setIsReporting(true);
    try {
      await api.createReport({
        description: reportText.trim(),
        reported_by: user.username || 'Guest Student',
        user_id: user.id
      });
      setReportSuccess(true);
      setReportText('');
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
      }, 2000);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsReporting(false);
    }
  };

  const options = [
    { id: 'assignments', title: 'Assignments', description: 'Course work & tasks', icon: <BookOpen />, color: 'bg-blue-500', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { id: 'notes', title: 'Notes', description: 'Lecture summaries', icon: <FileText />, color: 'bg-emerald-500', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { id: 'lab-resources', title: 'Lab Resources', description: 'Lab guides & data', icon: <FlaskConical />, color: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { id: 'prev-year-qs', title: 'Previous Papers', description: 'PYQ for Mid & Sem', icon: <History />, color: 'bg-orange-500', light: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  ];

  return (
    <div className="space-y-8 py-4 animate-in fade-in duration-500 relative">
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 relative">
            <button onClick={() => setShowReportModal(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                <Flag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Report a Problem</h3>
              <p className="text-sm text-slate-500 font-medium mt-1">Found a bug or missing content?</p>
            </div>
            {reportSuccess ? (
              <div className="py-8 text-center animate-in zoom-in">
                <div className="inline-flex p-3 bg-emerald-100 text-emerald-600 rounded-full mb-3">
                  <Check className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800">Submitted!</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit}>
                <textarea
                  autoFocus
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  placeholder="Describe the issue..."
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 font-medium resize-none mb-4"
                />
                <button
                  type="submit"
                  disabled={isReporting || !reportText.trim()}
                  className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isReporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessages && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 relative max-h-[80vh] flex flex-col">
            <button onClick={() => setShowMessages(false)} className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Message Box</h3>
                <p className="text-sm text-slate-500 font-medium">Updates and messages from Administration</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading Messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <Mail className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold">No messages yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-6 rounded-3xl border transition-all ${msg.is_read ? 'bg-white border-slate-100' : 'bg-indigo-50/30 border-indigo-100 shadow-sm'}`}
                      onClick={() => !msg.is_read && api.markMessageAsRead(msg.id).then(fetchMessages)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{msg.sender_name}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 font-medium leading-relaxed">{msg.content}</p>
                      {!msg.is_read && (
                        <div className="mt-4 flex justify-end">
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-white rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center p-2 border border-slate-100 shrink-0">
            <img src="https://img.icons8.com/fluency/96/graduation-cap.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">StudyStack</h2>
            <p className="text-slate-500 mt-1 font-medium">Academic Content Management</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 border rounded-2xl shadow-sm ${isOnline ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-xs font-black uppercase tracking-widest">{isOnline ? 'Database Linked' : 'Database Error'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => onSelectView(option.id as any)}
            className={`group text-left p-6 rounded-[2rem] border-2 ${option.border} ${option.light} hover:shadow-2xl hover:-translate-y-2 transition-all duration-300`}
          >
            <div className={`inline-flex p-4 rounded-2xl ${option.color} text-white shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
              {React.cloneElement(option.icon as React.ReactElement<any>, { className: 'w-6 h-6' })}
            </div>
            <h3 className={`text-xl font-black ${option.text} mb-2 tracking-tight`}>{option.title}</h3>
            <p className="text-slate-600 text-xs leading-relaxed mb-6 font-medium">{option.description}</p>
            <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${option.text}`}>
              Open Library <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setShowMessages(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-2xl text-xs font-black uppercase tracking-widest border border-indigo-100 transition-all relative"
        >
          <Mail className="w-4 h-4" /> 
          Messages
          {messages.some(m => !m.is_read) && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
          )}
        </button>
        <button
          onClick={() => setShowReportModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 transition-all"
        >
          <Flag className="w-4 h-4" /> Report Problem
        </button>
      </div>

      {/* Stats */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl mt-8">
        <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-indigo-500" /> System Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatBox label="Modules" value={stats.subjects} loading={stats.loading} />
          <StatBox label="Files" value={stats.files} loading={stats.loading} />
          <StatBox label="Checkouts" value={stats.checkouts} loading={stats.loading} highlight />
          <StatBox label="User Role" value={user.role} loading={false} />
        </div>
      </div>
    </div>
  );
};

const StatBox = ({ label, value, loading, highlight = false }: any) => (
  <div className="space-y-1">
    <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${highlight ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</p>
    <div className={`text-2xl font-black tracking-tighter ${highlight ? 'text-indigo-600' : 'text-slate-900'} flex items-center gap-2`}>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-200" /> : value}
    </div>
  </div>
);

export default Dashboard;

