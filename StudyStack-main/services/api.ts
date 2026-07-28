
/**
 * api.ts — Full Supabase API Layer
 * All database operations go directly through Supabase (PostgreSQL + Storage).
 * Firebase Auth is kept for authentication only.
 */

import { auth } from './firebaseClient';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { supabase } from './supabaseClient';

const googleProvider = new GoogleAuthProvider();

export const api = {

  // ── AUTH (Firebase) ─────────────────────────────────────────────────────────

  signInWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const user = {
        id: fbUser.uid,
        username: fbUser.displayName || 'Google User',
        email: fbUser.email,
        rollNo: '',
        role: 'User'
      };
      const token = await fbUser.getIdToken();
      
      // Sync to Supabase profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        last_login: new Date().toISOString()
      });

      return { user, token };
    } catch (error) { throw error; }
  },

  login: async ({ email, password }: any) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const user = {
        id: fbUser.uid,
        username: fbUser.displayName || 'User',
        email: fbUser.email,
        rollNo: '',
        role: 'User'
      };
      const token = await fbUser.getIdToken();
      
      // Sync to Supabase profiles
      await supabase.from('profiles').upsert({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        last_login: new Date().toISOString()
      });

      return { user, token };
    } catch (error) { throw error; }
  },

  signup: async ({ email, password, username }: any) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      await updateProfile(fbUser, { displayName: username });
      
      // Sync to Supabase profiles
      await supabase.from('profiles').insert({
        id: fbUser.uid,
        username: username,
        email: fbUser.email,
        role: 'User',
        created_at: new Date().toISOString()
      });

      return fbUser;
    } catch (error) { throw error; }
  },

  logout: async () => { await signOut(auth); },

  // ── SUBJECTS ────────────────────────────────────────────────────────────────

  getSubjects: async (category?: string) => {
    let query = supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  createSubject: async (name: string, category: string) => {
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name, category }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateSubject: async (id: string, updateData: any) => {
    const { data, error } = await supabase
      .from('subjects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteSubject: async (id: string) => {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ── FILES ───────────────────────────────────────────────────────────────────

  getFiles: async (subjectId?: string, category?: string, unitNo?: string) => {
    let query = supabase
      .from('files')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (subjectId) query = query.eq('subject_id', subjectId);
    if (category)  query = query.eq('category', category);
    if (unitNo && unitNo !== 'all') query = query.eq('unit_no', unitNo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  /**
   * createFile — uploads file to Google Drive via backend API, then saves metadata to Supabase 'files' table.
   * Features atomic consistency: if metadata save fails, Google Drive file is deleted automatically.
   */
  createFile: async (fileData: any) => {
    const response = await fetch('/api/drive/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fileData)
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || 'Failed to upload file to Google Drive');
    }
    return resData.data;
  },

  updateFile: async (id: string, updateData: any) => {
    if (updateData.file_content) {
      const response = await fetch(`/api/drive/file/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to update file in Google Drive');
      }
      return resData.data;
    }

    const { data, error } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteFile: async (id: string) => {
    const response = await fetch(`/api/drive/file/${id}`, {
      method: 'DELETE'
    });

    const resData = await response.json();
    if (!response.ok) {
      // Fallback: delete record directly from Supabase if backend drive deletion fails
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw new Error(resData.error || error.message);
    }
  },

  /** getFileContent — returns the Google Drive shareable URL for a stored file */
  getFileContent: async (id: string) => {
    const { data, error } = await supabase
      .from('files')
      .select('file_url, file_name')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return {
      content: data.file_url,
      name: data.file_name
    };
  },


  // ── REPORTS ─────────────────────────────────────────────────────────────────

  getReports: async (userId?: string) => {
    let query = supabase
      .from('reports')
      .select('*')
      .order('timestamp', { ascending: false });

    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  createReport: async (reportData: any) => {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...reportData, status: 'Open' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateReport: async (id: string, updateData: any) => {
    const { data, error } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteReport: async (id: string) => {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

  /** Returns single active announcement (or null). Pass all=true for admin. */
  getAnnouncements: async (all = false) => {
    if (all) {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data || null;
  },

  postAnnouncement: async (announcementData: any) => {
    // Deactivate existing announcements first
    await supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('announcements')
      .insert([announcementData])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deactivateAnnouncement: async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ── CHECKOUTS (Activity Logs) ────────────────────────────────────────────────

  getCheckouts: async () => {
    const { data, error } = await supabase
      .from('checkouts')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  logCheckout: async (checkoutData: any) => {
    const { error } = await supabase
      .from('checkouts')
      .insert([checkoutData]);
    if (error) console.warn('Checkout log failed:', error.message);
  },

  deleteCheckout: async (id: string) => {
    const { error } = await supabase
      .from('checkouts')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // ── REVIEWS ─────────────────────────────────────────────────────────────────

  getReviews: async (fileIds: string[]) => {
    if (!fileIds.length) return [];
    const { data, error } = await supabase
      .from('file_reviews')
      .select('*')
      .in('file_id', fileIds);
    if (error) return [];
    return data || [];
  },

  postReview: async (reviewData: any) => {
    const { error } = await supabase
      .from('file_reviews')
      .insert([reviewData]);
    if (error) throw new Error(error.message);
  },

  // ── SEARCH ──────────────────────────────────────────────────────────────────

  searchFiles: async (query: string) => {
    if (!query.trim()) return { subjects: [], files: [] };

    const [{ data: subjects }, { data: files }] = await Promise.all([
      supabase
        .from('subjects')
        .select('*')
        .ilike('name', `%${query}%`),
      supabase
        .from('files')
        .select('*')
        .or(`file_name.ilike.%${query}%,student_name.ilike.%${query}%`)
    ]);

    return {
      subjects: subjects || [],
      files: files || []
    };
  },

  searchLibrary: async (subjectName: string, category: string, unitNo?: string) => {
    // Find subject by name and category
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('name', subjectName)
      .eq('category', category)
      .limit(1);

    if (!subjects || subjects.length === 0) return [];

    let query = supabase
      .from('files')
      .select('*')
      .eq('subject_id', subjects[0].id)
      .eq('category', category);

    if (unitNo) query = query.eq('unit_no', unitNo);

    const { data } = await query;
    return data || [];
  },

  // ── STATS ───────────────────────────────────────────────────────────────────

  getStats: async () => {
    const [
      { count: subjects },
      { count: files },
      { count: reports },
      { count: checkouts }
    ] = await Promise.all([
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('files').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }),
      supabase.from('checkouts').select('*', { count: 'exact', head: true })
    ]);
    return { subjects, files, reports, checkouts };
  },

  // ── MESSAGES ───────────────────────────────────────────────────────────────

  getMessages: async (userId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', userId)
      .order('timestamp', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  },

  sendMessage: async (messageData: any) => {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        ...messageData, 
        timestamp: new Date().toISOString(),
        is_read: false 
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  markMessageAsRead: async (id: string) => {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  getUsers: async () => {
    // 1. Try to get users from profiles table if it exists
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.warn('Profiles table not found, extracting users from all activities');
      
      // Fallback: extract unique users from multiple sources
      // Wrap each in try-catch to handle missing tables gracefully
      const fetchReports = async () => { try { return await api.getReports(); } catch { return []; } };
      const fetchFiles = async () => { try { return await api.getFiles(); } catch { return []; } };

      const [reps, fs] = await Promise.all([
        fetchReports(),
        fetchFiles()
      ]);
      
      const userMap = new Map();
      
      // Extract from Reports (has user_id)
      reps.forEach((r: any) => {
        // Prioritize user_id as the unique key
        const id = r.user_id;
        if (id && !userMap.has(id)) {
          userMap.set(id, { 
            id, 
            username: r.reported_by || 'User', 
            email: r.user_email || '',
            role: 'User' 
          });
        }
      });
      
      // Extract from Files (might have user_id or use email as fallback)
      fs.forEach((f: any) => {
        const id = f.user_id || f.user_email;
        if (id && !userMap.has(id)) {
          userMap.set(id, { 
            id, 
            username: f.student_name || 'Contributor', 
            email: f.user_email || '',
            role: 'User' 
          });
        }
      });
      
      return Array.from(userMap.values());
    }
    
    return profiles || [];
  }
};
