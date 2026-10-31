import React, { useState, useEffect } from 'react';
import { Subject, Category, UserProfile } from '../types';
import { 
  ChevronLeft, Upload, CheckCircle2, AlertCircle, Loader2, 
  Type as TypeIcon, Image as ImageIcon, FileText, Link as LinkIcon, 
  ExternalLink, Info, Globe, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

interface UploaderProps {
  user: UserProfile;
  onBack: () => void;
}

const UNITS = ['All Units', 'Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'];
const EXAM_TYPES = ['Mid', 'Sem'];

const Uploader: React.FC<UploaderProps> = ({ user, onBack }) => {
  const [uploadType, setUploadType] = useState<'file' | 'drive'>('file');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | ''>('');
  const [tagValue, setTagValue] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [studentName, setStudentName] = useState(user.id !== 'guest' ? user.username : '');
  const [rollNo, setRollNo] = useState(user.rollNo || '');

  // File Upload state
  const [file, setFile] = useState<File | null>(null);
  
  // Google Drive Link state
  const [driveLink, setDriveLink] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!selectedCategory) return;
    const fetchSubjects = async () => {
      try {
        const data = await api.getSubjects(selectedCategory);
        setSubjects(data || []);
        setSelectedSubjectId('');
      } catch (err) { 
        console.error(err); 
      }
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

  // Helper to convert file to base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const isValidUrl = (url: string) => {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isGoogleDriveUrl = (url: string) => {
    return url.includes('drive.google.com') || url.includes('docs.google.com');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isPYQ = selectedCategory === 'Previous Year Question Papers';
    const isUnitRequired = selectedCategory === 'Assignments' || selectedCategory === 'Notes';
    const tagRequired = isPYQ || isUnitRequired;

    if (!selectedSubjectId || !selectedCategory || !studentName.trim() || !rollNo.trim() || !displayName.trim() || (tagRequired && !tagValue)) {
      setMessage({ type: 'error', text: 'Please complete all required fields' });
      return;
    }

    if (uploadType === 'file' && !file) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      return;
    }

    if (uploadType === 'drive') {
      const trimmedUrl = driveLink.trim();
      if (!trimmedUrl) {
        setMessage({ type: 'error', text: 'Please enter a valid Google Drive or Resource Link' });
        return;
      }
      if (!isValidUrl(trimmedUrl)) {
        setMessage({ type: 'error', text: 'Please enter a valid URL starting with https:// or http://' });
        return;
      }
    }

    setUploading(true);
    setMessage(null);

    try {
      if (uploadType === 'file' && file) {
        setMessage({ type: 'success', text: '📤 Uploading to Main Database Storage...' });
        const base64File = await toBase64(file);

        setMessage({ type: 'success', text: '💾 Saving to Database Storage...' });

        await api.createFile({
          subject_id: selectedSubjectId,
          category: selectedCategory,
          file_name: displayName.trim(),
          file_url: '',
          student_name: studentName.trim(),
          roll_no: rollNo.trim(),
          unit_no: tagValue || null,
          file_content: base64File
        });

        setMessage({ type: 'success', text: '✅ File uploaded to Academic Library successfully!' });
      } else {
        setMessage({ type: 'success', text: '💾 Linking Google Drive resource...' });

        await api.createFile({
          subject_id: selectedSubjectId,
          category: selectedCategory,
          file_name: displayName.trim(),
          file_url: driveLink.trim(),
          student_name: studentName.trim(),
          roll_no: rollNo.trim(),
          unit_no: tagValue || null
        });

        setMessage({ type: 'success', text: '✅ Google Drive resource added successfully!' });
      }

      setFile(null);
      setDriveLink('');
      setSelectedSubjectId('');
      setTagValue('');
      setDisplayName('');
    } catch (error: any) {
      console.error("UPLOAD ERROR DETAIL:", error);
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
    } finally { 
      setUploading(false); 
    }
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
          <p className="text-slate-500 text-sm">Contribute to the Academic Repository via File Upload or Google Drive</p>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden">
        {uploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 text-center px-4">
            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            <div className="space-y-1">
              <p className="font-black text-slate-800 text-lg">Processing Upload</p>
              <p className="text-slate-500 font-bold">{message?.text || "Please wait..."}</p>
            </div>
          </div>
        )}

        {/* Upload Mode Selector */}
        <div className="mb-6 p-1.5 bg-slate-100 rounded-2xl flex gap-2 border border-slate-200/80">
          <button
            type="button"
            onClick={() => { setUploadType('file'); setMessage(null); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              uploadType === 'file'
                ? 'bg-white text-indigo-600 shadow-md scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (PDF / Images)</span>
          </button>
          <button
            type="button"
            onClick={() => { setUploadType('drive'); setMessage(null); }}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              uploadType === 'drive'
                ? 'bg-white text-indigo-600 shadow-md scale-[1.01]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
            }`}
          >
            <LinkIcon className="w-4 h-4 text-emerald-600" />
            <span>Google Drive / Cloud Link</span>
            {user.role === 'Admin' && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700 rounded-md">
                Admin
              </span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">Full Name</label>
              <input 
                type="text" 
                value={studentName} 
                onChange={e => setStudentName(e.target.value)} 
                placeholder="Full Name" 
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border rounded-xl sm:rounded-2xl font-bold outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all" 
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">Roll Number</label>
              <input 
                type="text" 
                value={rollNo} 
                onChange={e => setRollNo(e.target.value)} 
                placeholder="Roll No" 
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border rounded-xl sm:rounded-2xl font-bold outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">Category</label>
              <select
                value={selectedCategory}
                onChange={e => { setSelectedCategory(e.target.value as Category); setTagValue(''); }}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border rounded-xl sm:rounded-2xl font-bold outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all"
              >
                <option value="">-- Choose Category --</option>
                <option value="Assignments">Assignments</option>
                <option value="Notes">Notes</option>
                <option value="Lab Resources">Lab Resources</option>
                <option value="Previous Year Question Papers">Previous Papers</option>
              </select>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border rounded-xl sm:rounded-2xl font-bold outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">Display Name</label>
            <div className="relative">
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Unit 1 Notes / Complete Lab Manual / 2024 Mid Paper"
                className="w-full pl-10 sm:pl-12 pr-4 sm:pr-5 py-3 sm:py-4 bg-indigo-50 border border-indigo-100 rounded-xl sm:rounded-2xl font-black text-indigo-900 outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all"
              />
              <TypeIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-indigo-300" />
            </div>
          </div>

          {selectedCategory && selectedCategory !== 'Lab Resources' && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">{tagLabel}</label>
              <select 
                value={tagValue} 
                onChange={e => setTagValue(e.target.value)} 
                className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl font-bold outline-none text-xs sm:text-base focus:border-indigo-400 focus:bg-white transition-all"
              >
                <option value="">-- Choose {tagLabel} --</option>
                {(isPYQ ? EXAM_TYPES : UNITS).map(t => <option key={t} value={t}>{t} {isPYQ ? 'Exam' : ''}</option>)}
              </select>
            </div>
          )}

          {/* Source Section: Either File Dropzone OR Drive Link input */}
          {uploadType === 'file' ? (
            <div className="space-y-1.5 sm:space-y-2 animate-in fade-in duration-300">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 ml-1">
                File <span className="text-slate-400 font-medium">(PDF, JPG, JPEG, PNG)</span>
              </label>
              <label className="w-full flex flex-col items-center justify-center gap-3 p-6 sm:p-8 border-2 border-dashed rounded-2xl sm:rounded-3xl bg-slate-50 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-all group">
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
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="block text-xs sm:text-sm font-bold text-slate-700">
                    Google Drive Link / URL
                  </label>
                  {driveLink && isGoogleDriveUrl(driveLink) && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                      <Sparkles className="w-3 h-3" /> Valid Drive Link Detected
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={driveLink}
                    onChange={e => {
                      const val = e.target.value;
                      setDriveLink(val);
                      if (!displayName && val.trim()) {
                        // Extract a cleaner name if it has a file name or url
                        try {
                          const urlObj = new URL(val);
                          const lastPart = urlObj.pathname.split('/').filter(Boolean).pop();
                          if (lastPart && lastPart !== 'view' && lastPart !== 'edit' && lastPart !== 'preview') {
                            setDisplayName(decodeURIComponent(lastPart).replace(/\.[^/.]+$/, "").replace(/[_-]/g, " "));
                          }
                        } catch {}
                      }
                    }}
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    className="w-full pl-10 sm:pl-12 pr-4 sm:pr-5 py-3.5 sm:py-4 bg-emerald-50/50 border border-emerald-200 rounded-xl sm:rounded-2xl font-bold text-emerald-950 placeholder-slate-400 outline-none text-xs sm:text-base focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                  />
                  <LinkIcon className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                </div>
              </div>

              {/* Helpful info callout */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1 leading-relaxed">
                  <p className="font-bold text-slate-800">How to share Google Drive links:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                    <li>Open your file or folder in Google Drive.</li>
                    <li>Click <strong>Share</strong> &gt; set General access to <strong>&quot;Anyone with the link&quot;</strong> (Viewer).</li>
                    <li>Click <strong>Copy link</strong> and paste it into the field above.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-bold">{message.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-slate-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {uploadType === 'drive' ? (
              <>
                <LinkIcon className="w-5 h-5" />
                <span>Save Google Drive Resource</span>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span>Upload to Academic Library</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Uploader;
