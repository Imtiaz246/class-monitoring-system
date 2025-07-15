import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error.message, {
        action: {
          label: "retry",
          onClick: () => {
            queryClient.invalidateQueries();
          },
        },
      });
    },
  }),
});

// Token refresh utility
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  });
  
  failedQueue = [];
};

const refreshToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch(`${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/api/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Refresh-Token': refreshToken,
    },
  });
  
  if (!response.ok) {
    // Refresh token is invalid, clear storage and redirect to login
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/sign-in';
    throw new Error('Refresh token expired');
  }
  
  const data = await response.json();
  
  if (data.tokens) {
    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    return data.tokens.accessToken;
  }
  
  throw new Error('Invalid refresh response');
};

// API client for Hono backend
export const apiClient = {
  baseURL: import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get access token from localStorage
    const accessToken = localStorage.getItem('accessToken');
    
    // Prepare headers with authorization if token exists
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };
    
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    
    const makeRequest = async (token?: string): Promise<Response> => {
      const requestHeaders = { ...headers };
      if (token) {
        requestHeaders.Authorization = `Bearer ${token}`;
      }
      
      return fetch(url, {
        ...options,
        credentials: 'include',
        headers: requestHeaders,
      });
    };
    
    let response = await makeRequest();
    
    // Handle 401 Unauthorized - attempt token refresh
    if (response.status === 401 && accessToken) {
      if (isRefreshing) {
        // If already refreshing, wait for the current refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          return this.request<T>(endpoint, options);
        });
      }
      
      isRefreshing = true;
      
      try {
        const newToken = await refreshToken();
        processQueue(null, newToken);
        isRefreshing = false;
        
        // Retry the original request with new token
        response = await makeRequest(newToken);
      } catch (error) {
        processQueue(error as Error, null);
        isRefreshing = false;
        throw error;
      }
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Network error' } }));
      throw new Error(errorData.error?.message || 'Request failed');
    }
    
    return response.json();
  },
  
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },
  
  post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },
  
  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};
