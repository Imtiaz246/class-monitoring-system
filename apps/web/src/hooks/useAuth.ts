import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Types based on server schemas
interface LoginData {
  email: string;
  password: string;
}

interface RegisterStudentData {
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

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
}

interface AuthResponse {
  message: string;
  user: User;
  tokens?: {
    accessToken: string;
    refreshToken: string;
  };
}

interface Batch {
  batchId: string;
  batchName: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: string;
  };
}

interface Section {
  sectionId: string;
  sectionName: string;
  semester: number;
  batchId?: string;
  batch?: {
    batchId: string;
    batchName: string;
  };
  updatedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: string;
  } | null;
}

// Auth hooks
export const useLogin = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async (data: LoginData): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorResponse = await response.json();
        const errorMessage = errorResponse.error?.message || errorResponse.message || 'Login failed';
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Store tokens in localStorage
      if (data.tokens) {
        localStorage.setItem('accessToken', data.tokens.accessToken);
        localStorage.setItem('refreshToken', data.tokens.refreshToken);
      }
      
      toast.success(data.message || 'Login successful!');
      navigate({ to: '/' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Login failed');
    },
  });
};

export const useRegisterStudent = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: async (data: RegisterStudentData): Promise<AuthResponse> => {
      const response = await fetch(`${API_BASE_URL}/api/auth/register/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorResponse = await response.json();
        const errorMessage = errorResponse.error?.message || errorResponse.message || 'Registration failed';
        throw new Error(errorMessage);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Registration successful! Please check your email to verify your account.');
      navigate({ to: '/sign-in' });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Registration failed');
    },
  });
};

// Data fetching hooks
export const useBatches = () => {
  return useQuery({
    queryKey: ['batches'],
    queryFn: async (): Promise<{ data: Batch[] }> => {
      const response = await fetch(`${API_BASE_URL}/api/v1/batches`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch batches');
      }
      
      return response.json();
    },
  });
};

export const useSections = (batchId: string | null) => {
  return useQuery({
    queryKey: ['sections', batchId],
    queryFn: async (): Promise<{ data: Section[] }> => {
      if (!batchId) {
        return { data: [] };
      }
      
      const response = await fetch(`${API_BASE_URL}/api/v1/sections/${batchId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to fetch sections: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      return data;
    },
    enabled: !!batchId,
  });
};

// Utility functions
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  toast.success('Logged out successfully');
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};