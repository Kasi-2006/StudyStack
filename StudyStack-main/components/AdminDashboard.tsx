
import React, { useState, useEffect, useRef } from 'react';

import { Subject, AcademicFile, Category, UserProfile, Report, Announcement, CheckoutLog, Message, COURSES, SEMESTERS, CourseItem, RegulationItem } from '../types';
import Uploader from './Uploader';
import {
  ChevronLeft, Plus, Trash2, Loader2, RefreshCcw, Search, ShieldAlert, CheckCircle2,
  Copy, Check, X, Database, Edit2, Eye, MoreVertical, Layers, FileText, Mail, Flag, Megaphone, Clock, AlertTriangle, Eraser, MessageSquare
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
  onBack: () => void;
}

type ModalType = 'none' | 'edit-subject' | 'rename-file' | 'delete-confirm-subject' | 'delete-confirm-file';

import { api } from '../services/api';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onBack }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [files, setFiles] = useState<AcademicFile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [checkouts, setCheckouts] = useState<CheckoutLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'subjects' | 'files' | 'logs' | 'upload' | 'reports' | 'broadcast' | 'users'>('subjects');
  const [loading, setLoading] = useState(true);

  // Menu & Modal States
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<ModalType>('none');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editSubjectData, setEditSubjectData] = useState<Partial<Subject>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Reply Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [replyText, setReplyText] = useState('');

  const [announcementMsg, setAnnouncementMsg] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);

  // Messaging State
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messageText, setMessageText] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [subs, fs, reps, ann, checks] = await Promise.all([
        api.getSubjects(),
        api.getFiles(),
        api.getReports(),
        api.getAnnouncements(),
        api.getCheckouts()
      ]);

      setSubjects(subs || []);
      setFiles(fs || []);
      setReports(reps || []);
      setActiveAnnouncement(ann || null);
      setCheckouts(checks || []);

      // Fetch all announcements for the broadcast center
      const allAnn = await api.getAnnouncements(true);
      setAllAnnouncements(allAnn as any || []);

      const allUsers = await api.getUsers();
      setUsers(allUsers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementMsg.trim()) return;
    try {
      await api.postAnnouncement({ message: announcementMsg.trim(), is_active: true, type: 'info' });
      setAnnouncementMsg('');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleClearAnnouncement = async () => {
    if (!activeAnnouncement) return;
    try {
      await api.deactivateAnnouncement(activeAnnouncement.id);
      fetchData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unknown error'); }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    try {
      // Assuming a delete method exists or using deactivate then filtering
      // For now, let's just deactivate it. If the DB supports delete, we should use it.
      // Looking at api.ts, there's no deleteAnnouncement, so I'll use deactivate.
      await api.deactivateAnnouncement(id);
      fetchData();
    } catch (err) { alert(err instanceof Error ? err.message : 'Unknown error'); }
  };

  const handleReplySubmit = async () => {
    if (!selectedReport || !replyText.trim()) return;
    setIsProcessing(true);
    try {
      await api.updateReport(selectedReport.id, { reply: replyText.trim(), status: 'Replied' });
      setReplyModalOpen(false);
      setReplyText('');
      setSelectedReport(null);
      fetchData();
    } catch (err) { alert(err.message); }
    setIsProcessing(false);
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !messageText.trim()) return;
    setIsProcessing(true);
    try {
      await api.sendMessage({
        sender_id: user.id,
        sender_name: user.username,
        receiver_id: selectedUser.id,
        content: messageText.trim()
      });
      setMessageModalOpen(false);
      setMessageText('');
      setSelectedUser(null);
      alert('Message sent successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message');
    }
    setIsProcessing(false);
  };

  const handleRename = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      if (modalType === 'edit-subject') {
        if (!editSubjectData.name?.trim()) { setIsProcessing(false); return; }
        await api.updateSubject(selectedItem.id, editSubjectData);
      } else {
        if (!renameValue.trim()) { setIsProcessing(false); return; }
        await api.updateFile(selectedItem.id, { file_name: renameValue.trim() });
      }
      setModalType('none');
      fetchData();
    } catch (err) { alert(err.message); }
    setIsProcessing(false);
  };

  const handleDeletePermanent = async () => {
    if (!selectedItem) return;
    setIsProcessing(true);
    try {
      if (modalType === 'delete-confirm-subject') {
        await api.deleteSubject(selectedItem.id);
      } else {
        await api.deleteFile(selectedItem.id);
      }
      setModalType('none');
      fetchData();
    } catch (err) { alert(err.message); }
    setIsProcessing(false);
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Assignments': return 'bg-blue-100 text-blue-700';
      case 'Notes': return 'bg-emerald-100 text-emerald-700';
      case 'Lab Resources': return 'bg-purple-100 text-purple-700';
      case 'Previous Year Question Papers': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const ActionMenu = ({ item, type }: { item: any, type: 'subject' | 'file' | 'dept' | 'reg' }) => (
    <div className="relative" ref={activeMenuId === item.id ? menuRef : null}>
      <button
        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {activeMenuId === item.id && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1.5 animate-in zoom-in-95 duration-75">
          {type === 'file' && (
            <button
              onClick={async () => {
                setActiveMenuId(null);
                try {
                  if (item.file_url === 'db') {
                    const { content } = await api.getFileContent(item.id);
                    let blob;
                    if (content.startsWith('data:')) {
                      const res = await fetch(content);
                      blob = await res.blob();
                    } else {
                      const byteCharacters = atob(content);
                      const byteNumbers = new Array(byteCharacters.length);
                      for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                      }
                      const byteArray = new Uint8Array(byteNumbers);
                      blob = new Blob([byteArray], { type: 'application/pdf' });
                    }
                    const url = window.URL.createObjectURL(blob);
                    window.open(url, '_blank');
                  } else {
                    window.open(item.file_url, '_blank');
                  }
                } catch (err) {
                  console.error("View failed:", err);
                  alert("Failed to load file for viewing.");
                }
              }}
              className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
            >
              <Eye className="w-4 h-4 text-indigo-500" /> View
            </button>
          )}
          <button
            onClick={() => {
              setSelectedItem(item);
              if (type === 'subject') {
                setEditSubjectData({
                  name: item.name,
                  category: item.category
                });
                setModalType('edit-subject');
              } else {
                setRenameValue(type === 'dept' || type === 'reg' ? item.name : item.file_name);
                setModalType(type === 'dept' ? 'rename-dept' : type === 'reg' ? 'rename-reg' : 'rename-file');
              }
              setActiveMenuId(null);
            }}
            className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
          >
            <Edit2 className="w-4 h-4 text-amber-500" /> Edit
          </button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button
            onClick={() => {
              setSelectedItem(item);
              setModalType(
                type === 'subject' ? 'delete-confirm-subject' :
                  type === 'dept' ? 'delete-confirm-dept' :
                    type === 'reg' ? 'delete-confirm-reg' : 'delete-confirm-file'
              );
              setActiveMenuId(null);
            }}
            className="w-full text-left px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      {/* Dynamic Action Modals */}
      {modalType !== 'none' && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 p-6 animate-in zoom-in-95">
            {modalType === 'edit-subject' ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Edit Subject</h3>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Subject Name</label>
                    <input value={editSubjectData.name || ''} onChange={e => setEditSubjectData({ ...editSubjectData, name: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-indigo-500 transition-colors" placeholder="Subject Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1">Category</label>
                    <select value={editSubjectData.category || ''} onChange={e => setEditSubjectData({ ...editSubjectData, category: e.target.value as Category })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-medium outline-none focus:border-indigo-500 transition-colors">
                      <option value="Assignments">Assignments</option>
                      <option value="Notes">Notes</option>
                      <option value="Lab Resources">Lab Resources</option>
                      <option value="Previous Year Question Papers">Previous Papers</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setModalType('none')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all">Cancel</button>
                  <button disabled={isProcessing || !editSubjectData.name} onClick={handleRename} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Save'}
                  </button>
                </div>
              </>
            ) : modalType.startsWith('rename') ? (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Rename Item</h3>
                </div>
                <p className="text-sm text-slate-500 mb-5">Enter a new name for this resource.</p>
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-medium mb-6 outline-none focus:border-indigo-500 transition-colors"
                  placeholder="New name..."
                />
                <div className="flex gap-3">
                  <button onClick={() => setModalType('none')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all">Cancel</button>
                  <button disabled={isProcessing || !renameValue.trim()} onClick={handleRename} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Rename'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Delete Permanently?</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-slate-900">"{selectedItem?.name || selectedItem?.file_name}"</span>?
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setModalType('none')} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all">Cancel</button>
                  <button disabled={isProcessing} onClick={handleDeletePermanent} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg shadow-sm hover:bg-red-700 transition-all flex items-center justify-center gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reply Modal */}
      {replyModalOpen && selectedReport && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reply to Report</h3>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 mb-5">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">User Issue</p>
              <p className="text-sm font-medium text-slate-600 italic">"{selectedReport.description}"</p>
            </div>

            <textarea
              autoFocus
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-medium mb-6 outline-none focus:border-indigo-500 min-h-[120px] resize-none transition-colors"
              placeholder="Type your reply..."
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setReplyModalOpen(false); setSelectedReport(null); setReplyText(''); }}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing || !replyText.trim()}
                onClick={handleReplySubmit}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between bg-white px-6 py-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <div className="h-6 w-px bg-slate-200"></div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchData()} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-all">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-indigo-600" /> : <RefreshCcw className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Broadcast Center (Always Visible) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-500 mb-6 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <Megaphone className="w-5 h-5 transition-transform hover:scale-110" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Broadcast Center</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Send announcements to all users</p>
            </div>
          </div>
          {activeAnnouncement && (
            <button
              onClick={handleClearAnnouncement}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-black text-[10px] uppercase tracking-widest bg-red-50 px-4 py-2 rounded-lg border border-red-100 transition-all hover:bg-red-100/50 hover:shadow-md active:scale-95"
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear Broadcast
            </button>
          )}
        </div>

        <form onSubmit={handlePostAnnouncement} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <input
              value={announcementMsg}
              onChange={(e) => setAnnouncementMsg(e.target.value)}
              placeholder="Type your announcement here..."
              className="w-full pl-5 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-red-400 focus:bg-white transition-all shadow-inner placeholder:text-slate-300"
            />
            {activeAnnouncement && (
               <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                 <span className="flex h-2 w-2 relative">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Live Now</span>
               </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!announcementMsg.trim() || isProcessing}
            className="px-8 py-3.5 bg-red-600 text-white font-black text-xs uppercase tracking-[0.15em] rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Broadcast
          </button>
        </form>

        {allAnnouncements.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Recent Broadcasts</p>
               <button onClick={() => setActiveTab('logs' as any)} className="text-[9px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest">View Activity</button>
             </div>
             <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                {allAnnouncements.slice(0, 5).map(ann => (
                  <div key={ann.id} className={`flex-shrink-0 snap-start px-4 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-4 ${ann.is_active ? 'bg-red-50 border-red-100 text-red-700 ring-4 ring-red-50' : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-slate-200'}`}>
                    <span className="max-w-[180px] truncate">{ann.message}</span>
                    {!ann.is_active && (
                       <button 
                        onClick={async () => {
                          try {
                            await api.postAnnouncement({ message: ann.message, is_active: true });
                            fetchData();
                          } catch (err) { alert(err instanceof Error ? err.message : 'Error'); }
                        }} 
                        className="p-1.5 hover:bg-white rounded-lg transition-colors text-red-400 hover:text-red-600 shadow-sm"
                        title="Re-broadcast"
                       >
                         <RefreshCcw className="w-3.5 h-3.5" />
                       </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-lg w-fit shadow-sm">
        {['subjects', 'files', 'upload', 'reports', 'users', 'logs'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-5 py-2.5 rounded-md text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
            {tab === 'logs' ? 'History' : tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 min-h-[500px]">
        {activeTab === 'upload' ? (
          <Uploader user={user} onBack={() => setActiveTab('subjects')} />
        ) : activeTab === 'subjects' ? (
          <div className="space-y-8">
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newSubjectName.trim() || selectedCategories.length === 0) { alert('Please provide a subject name and select at least one category'); return; }
              setIsProcessing(true);
              try {
                const promises = selectedCategories.map(cat => api.createSubject(newSubjectName.trim(), cat));
                await Promise.all(promises);
                setNewSubjectName('');
                setSelectedCategories([]);
                fetchData();
              } catch (err) { console.error(err); } finally { setIsProcessing(false); }
            }} className="flex flex-col gap-5 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-indigo-500" />
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Quick Create Subject</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Subject Name</label>
                  <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Computer Networks" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-indigo-400 transition-colors shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-0.5">Categories (Multi)</label>
                  <div className="flex flex-wrap gap-2">
                    {(['Assignments', 'Notes', 'Lab Resources', 'Previous Year Question Papers'] as Category[]).map(cat => {
                      const isSelected = selectedCategories.includes(cat);
                      const labels: Record<string, string> = { 'Assignments': 'Assign', 'Notes': 'Notes', 'Lab Resources': 'Labs', 'Previous Year Question Papers': 'PYQs' };
                      return (
                        <button type="button" key={cat} onClick={() => isSelected ? setSelectedCategories(selectedCategories.filter(c => c !== cat)) : setSelectedCategories([...selectedCategories, cat])} className={`px-3 py-1.5 rounded-md border text-[10px] font-black uppercase transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}>{labels[cat]}</button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <button disabled={isProcessing} className="bg-indigo-600 text-white py-3.5 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Add Subject to Selected Categories
              </button>
            </form>
            <div className="space-y-10 mt-8">
              {Object.entries(subjects.reduce((acc, sub) => { const name = sub.name || 'Unknown'; if (!acc[name]) acc[name] = []; acc[name].push(sub); return acc; }, {} as Record<string, Subject[]>)).sort(([a], [b]) => a.localeCompare(b)).map(([name, group]) => (
                <div key={name} className="group">
                  <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-2 transition-colors group-hover:border-indigo-100">
                    <Layers className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
                    <h3 className="text-base font-bold text-slate-800 tracking-tight">{name}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(group as Subject[]).map(sub => (
                      <div key={sub.id} className="p-3.5 bg-white rounded-lg border border-slate-100 flex justify-between items-center hover:border-indigo-200 hover:shadow-sm transition-all group/card">
                        <div className="overflow-hidden"><span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getCategoryColor(sub.category)}`}>{sub.category === 'Previous Year Question Papers' ? 'PYQ' : sub.category}</span></div>
                        <ActionMenu item={sub} type="subject" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'files' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black tracking-widest"><th className="pb-4">FILE</th><th className="pb-4">CATEGORY</th><th className="pb-4">STUDENT</th><th className="pb-4 text-right">ACTIONS</th></tr></thead>
              <tbody>
                {files.map(f => (
                  <tr key={f.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-bold text-sm text-slate-700">{f.file_name}</td>
                    <td className="py-4"><span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${getCategoryColor(f.category)}`}>{f.category}</span></td>
                    <td className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{f.student_name}</td>
                    <td className="py-4 text-right"><ActionMenu item={f} type="file" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'logs' ? (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Clock className="w-5 h-5 text-indigo-500" /> Checkout History</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Activity</span>
            </div>
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black tracking-widest"><th className="pb-4">RESOURCE</th><th className="pb-4">BY</th><th className="pb-4">TIMESTAMP</th><th className="pb-4 text-right">ACTIONS</th></tr></thead>
              <tbody>
                {checkouts.map(log => (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4"><div className="flex flex-col"><span className="font-bold text-slate-700 text-sm">{log.file_name}</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{log.category}</span></div></td>
                    <td className="py-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{log.user_role}</span></td>
                    <td className="py-4 text-[11px] font-medium text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-4 text-right"><button onClick={async () => { await api.deleteCheckout(log.id); fetchData(); }} className="p-2 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'users' ? (
          <div className="overflow-x-auto">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Mail className="w-5 h-5 text-indigo-500" /> User Directory</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Message specific users</p>
            </div>
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black tracking-widest"><th className="pb-4">USERNAME</th><th className="pb-4">EMAIL</th><th className="pb-4">ROLE</th><th className="pb-4 text-right">ACTIONS</th></tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-bold">No users detected in system activity</p>
                        <p className="text-[10px] text-slate-300 uppercase tracking-widest font-black">Waiting for student interactions (Reports, Uploads, or Checkouts)</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 font-bold text-sm text-slate-700">{u.username}</td>
                      <td className="py-4 text-sm text-slate-500">{u.email || 'N/A'}</td>
                      <td className="py-4"><span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${u.role === 'Admin' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{u.role}</span></td>
                      <td className="py-4 text-right">
                        <button 
                          onClick={() => { setSelectedUser(u); setMessageModalOpen(true); }}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all flex items-center gap-2 ml-auto"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-xs font-bold">Message</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black tracking-widest"><th className="pb-4">STATUS</th><th className="pb-4">ISSUE</th><th className="pb-4">BY</th><th className="pb-4 text-right">ACTIONS</th></tr></thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4"><span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${r.status === 'Resolved' || r.status === 'Replied' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{r.status}</span></td>
                    <td className="py-4 font-medium text-sm text-slate-700">
                      <div>{r.description}</div>
                      {r.reply && <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100"><span className="font-bold text-indigo-600 uppercase text-[9px] mr-2">Reply:</span>{r.reply}</div>}
                    </td>
                    <td className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">{r.reported_by}</td>
                    <td className="py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => { setSelectedReport(r); setReplyText(r.reply || ''); setReplyModalOpen(true); }} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 rounded-md transition-colors"><MessageSquare className="w-4 h-4" /></button>
                        <button onClick={async () => { await api.updateReport(r.id, { status: r.status === 'Open' ? 'Resolved' : 'Open' }); fetchData(); }} className={`p-2 rounded-md ${r.status === 'Open' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300'}`}><CheckCircle2 className="w-4 h-4" /></button>
                        <button onClick={async () => { await api.deleteReport(r.id); fetchData(); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {messageModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl border border-slate-200 p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Message to {selectedUser.username}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Student Messaging</p>
              </div>
            </div>

            <textarea
              autoFocus
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-medium mb-6 outline-none focus:border-indigo-500 min-h-[150px] resize-none transition-all"
              placeholder={`Write something to ${selectedUser.username}...`}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setMessageModalOpen(false); setSelectedUser(null); setMessageText(''); }}
                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing || !messageText.trim()}
                onClick={handleSendMessage}
                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Send & Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
