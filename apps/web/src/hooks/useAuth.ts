import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { apiClient } from '../utils/api';

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
      return apiClient.post<AuthResponse>('/api/auth/login', data);
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
      return apiClient.post<AuthResponse>('/api/auth/register/student', data);
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
      return apiClient.get<{ data: Batch[] }>('/api/v1/batches');
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
      
      return apiClient.get<{ data: Section[] }>(`/api/v1/sections/${batchId}`);
    },
    enabled: !!batchId,
  });
};

// Utility functions
export const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  toast.success('Logged out successfully');
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('accessToken');
};

export const getStoredUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Test function to manually trigger token refresh (for development/testing)
export const testTokenRefresh = async (): Promise<void> => {
  try {
    const response = await apiClient.get('/api/auth/me');
    console.log('Token refresh test successful:', response);
    toast.success('Token refresh working correctly!');
  } catch (error) {
    console.error('Token refresh test failed:', error);
    toast.error('Token refresh failed: ' + (error as Error).message);
  }
};