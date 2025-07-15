import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { isAuthenticated, logout } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/sign-in',
      });
    }
  },
  component: HomeComponent,
});

function HomeComponent() {
  const [state, setState] = useState("");
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: '/sign-in' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Class Monitoring System
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to the Dashboard
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                You are successfully logged in to the Class Monitoring System.
              </p>
              
              <div className="space-y-4">
                <Button 
                  onClick={() => {
                    fetch("/api/health")
                      .then((res) => res.text())
                      .then((data) => {
                        setState(data);
                      });
                  }}
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Health Check
                </Button>

                <div className="mt-4">
                  {state === "" ? (
                    <p className="text-red-600 dark:text-red-400 font-medium">System Status: Not Checked</p>
                  ) : (
                    <p className="text-green-600 dark:text-green-400 font-medium">System Status: Healthy</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export { HomeComponent };