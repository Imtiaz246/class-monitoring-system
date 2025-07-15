import { useState, useEffect } from 'react';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRegisterStudent, useBatches, useSections, isAuthenticated } from '@/hooks/useAuth';

export const Route = createFileRoute('/sign-up')({ 
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({
        to: '/',
      });
    }
  },
  component: SignUpComponent,
});

function SignUpComponent() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    phone: '',
    address: '',
    studentId: '',
    semester: '',
    batchId: '',
    sectionId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const registerMutation = useRegisterStudent();
  const { data: batchesData, isLoading: batchesLoading } = useBatches();
  const { data: sectionsData, isLoading: sectionsLoading } = useSections(formData.batchId || null);
  
  // Reset section when batch changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, sectionId: '' }));
  }, [formData.batchId]);
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.studentId) {
      newErrors.studentId = 'Student ID is required';
    }
    
    if (!formData.semester) {
      newErrors.semester = 'Semester is required';
    } else if (isNaN(Number(formData.semester)) || Number(formData.semester) <= 0) {
      newErrors.semester = 'Semester must be a positive number';
    }
    
    if (!formData.batchId) {
      newErrors.batchId = 'Batch is required';
    }
    
    if (!formData.sectionId) {
      newErrors.sectionId = 'Section is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Prepare data for submission (exclude confirmPassword)
    const { confirmPassword, ...submitData } = formData;
    const finalData = {
      ...submitData,
      semester: Number(submitData.semester),
      gender: submitData.gender || undefined,
      phone: submitData.phone || undefined,
      address: submitData.address || undefined,
    };

    registerMutation.mutate(finalData);
  };
  
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      <div className="max-w-2xl w-full space-y-8">
        {/* Header Section */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Join Our Community
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Create your student account to access the Class Monitoring System
          </p>
        </div>
        
        {/* Registration Card */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-gray-900 dark:text-white">
              Student Registration
            </CardTitle>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300">
              Fill in your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Full Name *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.name ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <Input
                        id="name"
                        type="text"
                        placeholder="👤 Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 text-gray-900 dark:text-white ${
                          errors.name 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500'
                        }`}
                        style={{
                            WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                            WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                            caretColor: 'var(--tw-text-opacity, 1)'
                         }}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email Address *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.email ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="📧 Enter your email address"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className={`relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:text-white ${
                          errors.email 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500'
                        }`}
                        style={{
                            WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                            WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                            caretColor: 'var(--tw-text-opacity, 1)'
                         }}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Security Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.password ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="🔒 Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className={`relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:text-white ${
                          errors.password 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500'
                        }`}
                        style={{
                            WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                            WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                            caretColor: 'var(--tw-text-opacity, 1)'
                         }}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.password}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Confirm Password *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.confirmPassword ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="🔐 Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className={`relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:text-white ${
                          errors.confirmPassword 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500'
                        }`}
                        style={{
                            WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                            WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                            caretColor: 'var(--tw-text-opacity, 1)'
                         }}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Optional Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gender
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    <select
                      id="gender"
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="relative flex h-12 w-full rounded-xl border-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50/80 dark:disabled:bg-gray-700/80 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 dark:text-white"
                    >
                      <option value="" className="text-gray-500 dark:text-gray-400 font-normal">👤 Select gender</option>
                      <option value="male" className="text-gray-900 dark:text-white font-medium">👨 Male</option>
                      <option value="female" className="text-gray-900 dark:text-white font-medium">👩 Female</option>
                      <option value="other" className="text-gray-900 dark:text-white font-medium">🌈 Other</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-full p-1">
                        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Phone
                  </Label>
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="📱 Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 dark:text-white"
                      style={{
                        WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                        WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                        caretColor: 'var(--tw-text-opacity, 1)'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Address
                </Label>
                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                  <Input
                    id="address"
                    type="text"
                    placeholder="🏠 Enter your address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500 dark:text-white"
                    style={{
                        WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                        WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                        caretColor: 'var(--tw-text-opacity, 1)'
                       }}
                  />
                </div>
              </div>
              
              {/* Academic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Student ID *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.studentId ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <Input
                        id="studentId"
                        type="text"
                        placeholder="🆔 Enter your student ID"
                        value={formData.studentId}
                        onChange={(e) => handleInputChange('studentId', e.target.value)}
                        className={`relative h-12 rounded-xl border-2 bg-white dark:bg-gray-800 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 dark:text-white ${
                          errors.studentId 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 focus:border-blue-500'
                        }`}
                        style={{
                           WebkitBoxShadow: 'inset 0 0 0 30px var(--tw-bg-opacity, 1)',
                           WebkitTextFillColor: 'var(--tw-text-opacity, 1)',
                           caretColor: 'var(--tw-text-opacity, 1)'
                         }}
                      />
                    </div>
                    {errors.studentId && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.studentId}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="semester" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Semester *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.semester ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <select
                        id="semester"
                        value={formData.semester}
                        onChange={(e) => handleInputChange('semester', e.target.value)}
                        className={`relative flex h-12 w-full rounded-xl border-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50/80 dark:disabled:bg-gray-700/80 dark:text-white ${
                          errors.semester 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                      >
                        <option value="" className="text-gray-500 dark:text-gray-400 font-normal">✨ Select your semester</option>
                        <option value="1" className="text-gray-900 dark:text-white font-medium">📚 1st Semester</option>
                        <option value="2" className="text-gray-900 dark:text-white font-medium">📚 2nd Semester</option>
                        <option value="3" className="text-gray-900 dark:text-white font-medium">📚 3rd Semester</option>
                        <option value="4" className="text-gray-900 dark:text-white font-medium">📚 4th Semester</option>
                        <option value="5" className="text-gray-900 dark:text-white font-medium">📚 5th Semester</option>
                        <option value="6" className="text-gray-900 dark:text-white font-medium">📚 6th Semester</option>
                        <option value="7" className="text-gray-900 dark:text-white font-medium">📚 7th Semester</option>
                        <option value="8" className="text-gray-900 dark:text-white font-medium">📚 8th Semester</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-1">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {errors.semester && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.semester}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="batchId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Batch *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.batchId ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <select
                        id="batchId"
                        value={formData.batchId}
                        onChange={(e) => handleInputChange('batchId', e.target.value)}
                        className={`relative flex h-12 w-full rounded-xl border-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50/80 dark:disabled:bg-gray-700/80 dark:text-white ${
                          errors.batchId 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        disabled={batchesLoading}
                      >
                        <option value="" className="text-gray-500 dark:text-gray-400 font-normal">
                          {batchesLoading ? '🔄 Loading batches...' : '🎓 Select your batch'}
                        </option>
                        {batchesData?.data?.map((batch) => (
                          <option key={batch.batchId} value={batch.batchId} className="text-gray-900 dark:text-white font-medium">
                            📋 {batch.batchName}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-full p-1">
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {errors.batchId && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.batchId}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="sectionId" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Section *
                    </Label>
                    <div className="relative group">
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm ${
                        errors.sectionId ? 'from-red-500/30 to-red-500/30 opacity-100' : ''
                      }`}></div>
                      <select
                        id="sectionId"
                        value={formData.sectionId}
                        onChange={(e) => handleInputChange('sectionId', e.target.value)}
                        className={`relative flex h-12 w-full rounded-xl border-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 appearance-none cursor-pointer hover:bg-white dark:hover:bg-gray-800 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-blue-500/25 focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-50/80 dark:disabled:bg-gray-700/80 dark:text-white ${
                          errors.sectionId 
                            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/25 shadow-red-200/50' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                        disabled={!formData.batchId || sectionsLoading || (sectionsData?.data && sectionsData.data.length === 0)}
                      >
                        <option value="" className="text-gray-500 dark:text-gray-400 font-normal">
                          {!formData.batchId 
                            ? '⚠️ Please select a batch first' 
                            : sectionsLoading 
                            ? '🔄 Loading sections...' 
                            : sectionsData?.data && sectionsData.data.length === 0
                            ? '❌ No sections available for this batch'
                            : '📝 Select your section'
                          }
                        </option>
                        {sectionsData?.data?.map((section) => (
                          <option key={section.sectionId} value={section.sectionId} className="text-gray-900 dark:text-white font-medium">
                            🏫 {section.sectionName} (Semester {section.semester})
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                        <div className={`rounded-full p-1 transition-all duration-300 ${
                          (!formData.batchId || sectionsLoading || (sectionsData?.data && sectionsData.data.length === 0))
                            ? 'bg-gray-400'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}>
                          <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    {errors.sectionId && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.sectionId}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Account
                  </div>
                )}
              </Button>
            </form>
            
            <div className="mt-6 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link 
                  to="/sign-in" 
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { SignUpComponent };