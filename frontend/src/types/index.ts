export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export type User = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  enabled?: boolean;
  createdAt?: string;
};

export type Folder = {
  id: number;
  name: string;
  description?: string;
  parentId?: number | null;
  parentName?: string;
  createdBy?: string;
  createdAt?: string;
  documentCount?: number;
};

export type DocumentItem = {
  id: number;
  title: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  extension?: string;
  sizeInBytes?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;
  folderId?: number | null;
  folderName?: string;
  programId?: number | null;
  programName?: string;
  uploadedByName?: string;
  uploadedAt?: string;
  viewCount?: number;
  downloadCount?: number;
  status?: string;
};

export type DashboardStats = {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClasses: number;
  totalPrograms: number;
  totalDocuments: number;
  totalDownloads: number;
  totalViews: number;
};
