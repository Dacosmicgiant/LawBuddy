// src/components/auth/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useUI } from '../../contexts/UIContext.js';
import { VALIDATION } from '../../services/constants.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const UserProfile = ({ className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    location: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  
  const { 
    user, 
    updateProfile, 
    isLoading, 
    authError, 
    refreshUserData 
  } = useAuth();
  const { showSuccessToast, showErrorToast } = useUI();

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.profile?.fullName || '',
        email: user.email || '',
        location: user.profile?.location || '',
        phone: user.profile?.phone || ''
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < VALIDATION.USERNAME_MIN_LENGTH) {
      newErrors.fullName = `Name must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters`;
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const result = await updateProfile({
        fullName: formData.fullName.trim(),
        location: formData.location.trim(),
        phone: formData.phone.trim()
      });

      if (result.success) {
        showSuccessToast('Profile updated successfully');
        setIsEditing(false);
      }
    } catch (error) {
      showErrorToast(error.message || 'Failed to update profile');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data
    if (user) {
      setFormData({
        fullName: user.profile?.fullName || '',
        email: user.email || '',
        location: user.profile?.location || '',
        phone: user.profile?.phone || ''
      });
    }
    setErrors({});
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
      }
      return nameParts[0].charAt(0).toUpperCase();
    }
    return email ? email.charAt(0).toUpperCase() : 'U';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center">
                <span className="text-2xl font-bold text-blue-600">
                  {getInitials(user.profile?.fullName, user.email)}
                </span>
              </div>
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-bold text-white">
                {user.profile?.fullName || 'User Profile'}
              </h2>
              <p className="text-blue-100">
                Member since {formatJoinDate(user.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <div className="px-6 py-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Profile Information
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-500' : ''
                } ${errors.fullName ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Email cannot be changed. Contact support if you need to update your email.
              </p>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="City, Country"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-500' : ''
                } ${errors.location ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="+1 (555) 123-4567"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-500' : ''
                } ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            {/* Form Actions */}
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Saving...</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Usage Stats */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {user.usageStats?.totalChats || 0}
              </div>
              <div className="text-sm text-gray-500">Total Chats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {user.usageStats?.totalMessages || 0}
              </div>
              <div className="text-sm text-gray-500">Messages Sent</div>
            </div>
          </div>
          
          {/* Last Activity */}
          {user.usageStats?.lastActive && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-500">Last Active</div>
                <div className="text-sm font-medium text-gray-900">
                  {new Date(user.usageStats.lastActive).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Account Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Account Management</h4>
              <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.href = '/change-password'}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Change Password
              </button>
              <button
                onClick={refreshUserData}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;