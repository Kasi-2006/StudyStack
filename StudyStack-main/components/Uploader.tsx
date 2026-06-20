import React, { useState, useEffect } from 'react';
import { Subject, Category, UserProfile, COURSES, SEMESTERS, CourseItem, RegulationItem } from '../types';
import { ChevronLeft, Upload, CheckCircle2, AlertCircle, Loader2, FileType, AlertTriangle, User, Hash, History, Layers, Type as TypeIcon, Image as ImageIcon, FileText } from 'lucide-react';


interface UploaderProps {
  user: UserProfile;
  onBack: () => void;
}

const UNITS = ['All Units', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'];
const EXAM_TYPES = ['Mid', 'Sem'];

import { api } from '../services/api';



const Uploader: React.FC<UploaderProps> = ({ user, onBack }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [tagValue, setTagValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [studentName, setStudentName] = useState(user.id !== 'guest' ? user.username : '');
  const [rollNo, setRollNo] = useState(user.rollNo || '');

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!selectedCategory) return;
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects(selectedCategory);
        setSubjects(data || []);
        setSelectedSubjectId('');
      } catch (err) { console.error(err); }
    };
    fetchSubjects();
  }, [selectedCategory]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile && !displayName) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setDisplayName(cleanName);
    }
  };

  // Detect if file is an image
  const isImageFile = (f: File | null) =>
    f ? ['image/jpeg', 'image/jpg', 'image/png'].includes(f.type) : false;

  const isPdfFile = (f: File | null) =>
    f ? f.type === 'application/pdf' : false;


  // Helper to convert file to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPYQ = selectedCategory === 'Previous Year Question Papers';
    const isUnitRequired = selectedCategory === 'Assignments' || selectedCategory === 'Notes';
    const tagRequired = isPYQ || isUnitRequired;

    if (!selectedSubjectId || !selectedCategory || !file || !studentName || !rollNo || !displayName.trim() || (tagRequired && !tagValue)) {
      setMessage({ type: 'error', text: 'Please complete all required fields' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      setMessage({ type: 'success', text: '📤 Uploading to Supabase Storage...' });
      const base64File = await toBase64(file);

      setMessage({ type: 'success', text: '💾 Saving to Supabase Database...' });

      await api.createFile({
        subject_id: selectedSubjectId,
        category: selectedCategory,
        file_name: displayName.trim(),
        file_url: '',
        student_name: studentName,
        roll_no: rollNo,
        unit_no: tagValue || null,
        file_content: base64File
      });

      setMessage({ type: 'success', text: '✅ Resource uploaded to Supabase successfully!' });
      setFile(null);
      setSelectedSubjectId('');
      setTagValue('');
      setDisplayName('');
    } catch (error: any) {
      console.error("UPLOAD ERROR DETAIL:", error);
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
    } finally { setUploading(false); }
  };


  const isPYQ = selectedCategory === 'Previous Year Question Papers';
  const tagLabel = isPYQ ? 'Exam Type' : 'Unit Number';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors border border-slate-200 shadow-sm">
          <ChevronLeft className="w-6 h-6 text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Upload Content</h2>
          <p className="text-slate-500 text-sm">Contribute to the Academic Repository</p>
        </div>
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 text-center px-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <p className="font-black text-slate-800 text-lg">Processing Upload</p>
              <p className="text-slate-500 font-bold">{message?.text || "Please wait..."}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Full Name</label>
              <input type="text" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Full Name" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Roll Number</label>
              <input type="text" value={rollNo} onChange={e => setRollNo(e.target.value)} placeholder="Roll No" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Category</label>
              <select
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value as Category); setTagValue(''); }}
                className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold outline-none"
              >
                <option value="">-- Choose Category --</option>
                <option value="Assignments">Assignments</option>
                <option value="Notes">Notes</option>
                <option value="Lab Resources">Lab Resources</option>
                <option value="Previous Year Question Papers">Previous Papers</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold outline-none"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Unit 1 Notes"
                className="w-full pl-12 pr-5 py-4 bg-indigo-50 border border-indigo-100 rounded-2xl font-black text-indigo-900 outline-none"
              />
              <TypeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" />
            </div>
          </div>

          {selectedCategory && selectedCategory !== 'Lab Resources' && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">{tagLabel}</label>
              <select value={tagValue} onChange={e => setTagValue(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none">
                <option value="">-- Choose {tagLabel} --</option>
                {(isPYQ ? EXAM_TYPES : UNITS).map(t => <option key={t} value={t}>{t} {isPYQ ? 'Exam' : ''}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">
              File <span className="text-slate-400 font-medium">(PDF, JPG, JPEG, PNG)</span>
            </label>
            <label className="w-full flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed rounded-3xl bg-slate-50 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center gap-3 text-center">
                  {isImageFile(file) ? (
                    <ImageIcon className="w-8 h-8 text-indigo-500" />
                  ) : (
                    <FileText className="w-8 h-8 text-indigo-500" />
                  )}
                  <div className="text-left">
                    <p className="font-black text-indigo-700 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB • Click to change</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload className="w-8 h-8 group-hover:text-indigo-400 transition-colors" />
                  <p className="font-bold text-sm">Click to select file</p>
                  <p className="text-xs">PDF, JPG, JPEG or PNG (max 20MB)</p>
                </div>
              )}
            </label>
          </div>

          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50"
          >
            Upload to Academic Library
          </button>
        </form>
      </div>
    </div>
  );
};

export default Uploader;
