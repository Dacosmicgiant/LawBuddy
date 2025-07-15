// src/components/auth/PasswordManager.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useUI } from '../../contexts/UIContext.js';
import { VALIDATION } from '../../services/constants.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const PasswordManager = ({ className = '' }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { changePassword } = useAuth();
  const { showSuccessToast, showErrorToast } = useUI();

  const calculatePasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      newErrors.newPassword = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`;
    } else if (!VALIDATION.PASSWORD_REGEX.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      showSuccessToast('Password changed successfully');
      
      // Clear form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setPasswordStrength(0);
      
    } catch (error) {
      showErrorToast(error.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Update password strength for new password
    if (name === 'newPassword') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const toggleShowPassword = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-red-500';
    if (passwordStrength <= 2) return 'bg-orange-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 1) return 'Very weak';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  const PasswordField = ({ 
    id, 
    name, 
    label, 
    value, 
    placeholder, 
    showPassword, 
    error, 
    onToggleShow 
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 pr-10 ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          {showPassword ? (
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
            </svg>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );

  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
          <p className="text-sm text-gray-600 mt-1">
            Ensure your account is using a long, random password to stay secure.
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Current Password */}
            <PasswordField
              id="currentPassword"
              name="currentPassword"
              label="Current Password"
              value={formData.currentPassword}
              placeholder="Enter current password"
              showPassword={showPasswords.current}
              error={errors.currentPassword}
              onToggleShow={() => toggleShowPassword('current')}
            />

            {/* New Password */}
            <div>
              <PasswordField
                id="newPassword"
                name="newPassword"
                label="New Password"
                value={formData.newPassword}
                placeholder="Enter new password"
                showPassword={showPasswords.new}
                error={errors.newPassword}
                onToggleShow={() => toggleShowPassword('new')}
              />
              
              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-600">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm New Password"
              value={formData.confirmPassword}
              placeholder="Confirm new password"
              showPassword={showPasswords.confirm}
              error={errors.confirmPassword}
              onToggleShow={() => toggleShowPassword('confirm')}
            />

            {/* Password Requirements */}
            <div className="bg-gray-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Password Requirements</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <svg className={`h-4 w-4 mr-2 ${formData.newPassword.length >= 8 ? 'text-green-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  At least 8 characters long
                </li>
                <li className="flex items-center">
                  <svg className={`h-4 w-4 mr-2 ${/[a-z]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Contains lowercase letter
                </li>
                <li className="flex items-center">
                  <svg className={`h-4 w-4 mr-2 ${/[A-Z]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Contains uppercase letter
                </li>
                <li className="flex items-center">
                  <svg className={`h-4 w-4 mr-2 ${/[0-9]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Contains number
                </li>
                <li className="flex items-center">
                  <svg className={`h-4 w-4 mr-2 ${/[^A-Za-z0-9]/.test(formData.newPassword) ? 'text-green-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Contains special character
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Changing Password...</span>
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>

        {/* Security Tips */}
        <div className="px-6 py-4 bg-blue-50 border-t">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Security Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use a unique password that you don't use anywhere else</li>
            <li>• Consider using a password manager to generate and store strong passwords</li>
            <li>• Never share your password with anyone</li>
            <li>• Change your password if you suspect it has been compromised</li>
            <li>• Enable two-factor authentication for additional security</li>
          </ul>
        </div>

        {/* Additional Security Options */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Additional Security</h4>
          <div className="space-y-3">
            <button
              onClick={() => alert('Two-factor authentication coming soon!')}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Enable Two-Factor Authentication</span>
              </div>
              <span className="text-xs text-gray-500">Coming Soon</span>
            </button>
            
            <button
              onClick={() => alert('Security audit coming soon!')}
              className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>View Security Audit</span>
              </div>
              <span className="text-xs text-gray-500">Coming Soon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordManager;