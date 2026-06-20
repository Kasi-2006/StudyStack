
export type UserRole = 'User' | 'Admin';

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  rollNo?: string;
  role: UserRole;
}

export interface Subject {
  id: string;
  name: string;
  category: Category;
  course?: string;
  regulation?: string;
  semester?: string;
  syllabus?: string;
  created_at: string;
}

export interface CourseItem {
  id: string;
  name: string;
}

export interface RegulationItem {
  id: string;
  name: string;
}

export const COURSES = ['B.Tech', 'M.Tech', 'MCA', 'MBA', 'B.Pharmacy', 'M.Pharmacy'];

export const SEMESTERS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

export interface AcademicFile {
  id: string;
  subject_id: string;
  category: Category;
  file_name: string;
  file_url: string;
  uploaded_at: string;
  student_name: string;
  roll_no: string;
  user_email?: string;
  unit_no?: string;
}

export interface CheckoutLog {
  id: string;
  file_id: string;
  file_name: string;
  category: string;
  timestamp: string;
  user_role: string;
}

export interface Report {
  id: string;
  description: string;
  reported_by: string;
  user_id: string;
  reply?: string;
  status: 'Open' | 'Resolved' | 'Replied';
  timestamp: string;
}

export interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'alert' | 'success';
  is_active: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  receiver_id: string;
  content: string;
  timestamp: string;
  is_read: boolean;
}

export type Category = 'Assignments' | 'Notes' | 'Lab Resources' | 'Previous Year Question Papers';
export type ViewState = 'home' | 'assignments' | 'notes' | 'lab-resources' | 'prev-year-qs' | 'admin' | 'messages';
