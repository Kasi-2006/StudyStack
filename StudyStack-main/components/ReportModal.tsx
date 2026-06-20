import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { UserProfile, Report } from '../types';

interface ReportModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ user, isOpen, onClose }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(user.id);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Messages</h3>
              <p className="text-xs text-slate-500 font-medium">Updates from Admin</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
          
          {/* History */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">
                No messages yet.
              </div>
            ) : (
              reports.map((report) => (
                <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-xs font-medium text-slate-500 leading-relaxed italic">"{report.description}"</p>
                    <span className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      report.status === 'Resolved' || report.status === 'Replied' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                    <span>{new Date(report.timestamp).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {report.reply && (
                    <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/50 -mx-4 -mb-4 p-4 rounded-b-2xl">
                      <div className="flex items-start gap-3">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                          <MessageSquare className="w-3 h-3" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-indigo-900 mb-1">Admin Response</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{report.reply}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportModal;
