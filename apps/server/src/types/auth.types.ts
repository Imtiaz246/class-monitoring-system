export interface RegisterStudentData {
  email: string;
  password: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  studentId: string;
  semester: number;
  batchId: string;
  sectionId: string;
}

export interface LoginData {
  email: string;
  password: string;
}