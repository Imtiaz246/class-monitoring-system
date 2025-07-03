export interface RegisterStudentData {
  email: string;
  password: string;
  name: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  address?: string;
  studentId: string;
}

export interface LoginData {
  email: string;
  password: string;
}