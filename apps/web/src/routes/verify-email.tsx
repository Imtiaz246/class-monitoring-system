import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

const verifyEmailSearchSchema = z.object({
  token: z.string(),
});

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailComponent,
  validateSearch: verifyEmailSearchSchema,
});

function VerifyEmailComponent() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        console.log("Verify email data: " + data)

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate({ to: '/' });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error?.message || 'Failed to verify email');
        }
      } catch (error) {
        console.log('Error:', error);
        setStatus('error');
        setMessage('Network error. Please try again.');
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link');
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <div className="text-green-600 text-5xl mb-4">✓</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to home page...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <div className="text-red-600 text-5xl mb-4">✗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Failed</h3>
              <p className="text-gray-600 mb-4">{message}</p>
              <button
                onClick={() => navigate({ to: '/' })}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
