// src/components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import { SUBSCRIPTION_TIERS } from '../../services/constants.js';
import LoadingSpinner from '../common/LoadingSpinner.jsx';

const ProtectedRoute = ({ 
  children, 
  requireAuth = true, 
  requiredTier = null, 
  requiredPermissions = [],
  fallback = null,
  redirectTo = '/login',
  showUpgradeModal = false 
}) => {
  const location = useLocation();
  const { 
    isAuthenticated, 
    isLoading, 
    isInitialized, 
    subscriptionTier, 
    hasPermission,
    canPerformAction,
    user
  } = useAuth();

  // Show loading while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    if (redirectTo && !fallback) {
      return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }
    
    return fallback || (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please log in to access this page.
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = redirectTo || '/login'}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </button>
              <button 
                onClick={() => window.location.href = '/register'}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check specific permissions
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      hasPermission(permission)
    );
    
    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(permission => 
        !hasPermission(permission)
      );
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Insufficient Permissions
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have the required permissions to access this page.
              </p>
              <div className="bg-red-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-red-700 font-medium mb-1">Missing permissions:</p>
                <ul className="text-sm text-red-600">
                  {missingPermissions.map((permission, index) => (
                    <li key={index}>• {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>
                  ))}
                </ul>
              </div>
              <button 
                onClick={() => window.history.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check subscription tier requirement
  if (requiredTier && subscriptionTier !== requiredTier) {
    const tierHierarchy = {
      [SUBSCRIPTION_TIERS.FREE]: 0,
      [SUBSCRIPTION_TIERS.PREMIUM]: 1,
      [SUBSCRIPTION_TIERS.PROFESSIONAL]: 2,
    };

    const userTierLevel = tierHierarchy[subscriptionTier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;

    if (userTierLevel < requiredTierLevel) {
      const getTierColor = (tier) => {
        switch (tier) {
          case SUBSCRIPTION_TIERS.PREMIUM:
            return 'from-blue-500 to-blue-600';
          case SUBSCRIPTION_TIERS.PROFESSIONAL:
            return 'from-purple-500 to-purple-600';
          default:
            return 'from-gray-500 to-gray-600';
        }
      };

      const getTierBenefits = (tier) => {
        switch (tier) {
          case SUBSCRIPTION_TIERS.PREMIUM:
            return [
              'Advanced analytics and insights',
              'Export chat history to multiple formats',
              'Priority response times',
              'Extended chat history (unlimited)',
              'Advanced search and filtering'
            ];
          case SUBSCRIPTION_TIERS.PROFESSIONAL:
            return [
              'All Premium features included',
              'Unlimited messages and chats',
              'Priority customer support (24/7)',
              'Advanced AI capabilities',
              'Custom integrations and API access',
              'White-label options',
              'Dedicated account manager'
            ];
          default:
            return [];
        }
      };

      const getTierPricing = (tier) => {
        switch (tier) {
          case SUBSCRIPTION_TIERS.PREMIUM:
            return { price: '$9.99', period: 'month', annual: '$99.99' };
          case SUBSCRIPTION_TIERS.PROFESSIONAL:
            return { price: '$19.99', period: 'month', annual: '$199.99' };
          default:
            return { price: '$0', period: 'month', annual: '$0' };
        }
      };

      const pricing = getTierPricing(requiredTier);

      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-lg mx-auto p-6">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r ${getTierColor(requiredTier)} mb-4`}>
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {requiredTier} Required
              </h3>
              <p className="text-gray-600 mb-4">
                This feature requires a {requiredTier} subscription to access.
              </p>
              
              {/* Current Plan Badge */}
              <div className="bg-white rounded-lg p-4 mb-6 border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Your current plan:</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 mt-1">
                      {subscriptionTier}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {pricing.price}
                      <span className="text-sm font-normal text-gray-500">/{pricing.period}</span>
                    </p>
                    {pricing.annual !== '$0' && (
                      <p className="text-xs text-green-600 font-medium">
                        Save 17% annually
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Benefits List */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  {requiredTier} includes:
                </h4>
                <ul className="text-sm text-gray-700 space-y-2">
                  {getTierBenefits(requiredTier).map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Usage Stats */}
              {user?.usageStats && (
                <div className="bg-white rounded-lg p-4 mb-6 border">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Your Usage</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {user.usageStats.totalChats || 0}
                      </div>
                      <div className="text-gray-500">Total Chats</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {user.usageStats.totalMessages || 0}
                      </div>
                      <div className="text-gray-500">Total Messages</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/upgrade'}
                  className={`w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r ${getTierColor(requiredTier)} hover:shadow-lg transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Upgrade to {requiredTier}
                </button>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={() => window.location.href = '/pricing'}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View All Plans
                  </button>
                  <button 
                    onClick={() => window.history.back()}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go Back
                  </button>
                </div>
              </div>

              {/* Contact Sales for Professional */}
              {requiredTier === SUBSCRIPTION_TIERS.PROFESSIONAL && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-2">
                    Need a custom solution for your business?
                  </p>
                  <button
                    onClick={() => window.location.href = '/contact-sales'}
                    className="text-sm font-medium text-purple-600 hover:text-purple-500"
                  >
                    Contact Sales →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // Check for account status issues
  if (isAuthenticated && user) {
    // Check if account is deactivated
    if (user.isActive === false) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Account Deactivated
              </h3>
              <p className="text-gray-600 mb-6">
                Your account has been deactivated. Please contact support to reactivate it.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/support'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Contact Support
                </button>
                <button 
                  onClick={() => window.location.href = '/logout'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Check if email verification is required
    if (user.emailVerified === false && location.pathname !== '/verify-email') {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Email Verification Required
              </h3>
              <p className="text-gray-600 mb-6">
                Please verify your email address to access this feature.
              </p>
              <div className="space-y-3">
                <button 
                  onClick={() => window.location.href = '/verify-email'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Verify Email
                </button>
                <button 
                  onClick={() => window.location.href = '/resend-verification'}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Resend Verification Email
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // All checks passed, render children
  return children;
};

// Higher-order component for easier usage
export const withAuth = (Component, options = {}) => {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
};

// Specific HOCs for common use cases
export const withPremium = (Component) => {
  return withAuth(Component, { requiredTier: SUBSCRIPTION_TIERS.PREMIUM });
};

export const withProfessional = (Component) => {
  return withAuth(Component, { requiredTier: SUBSCRIPTION_TIERS.PROFESSIONAL });
};

export const withPermissions = (permissions) => (Component) => {
  return withAuth(Component, { requiredPermissions: Array.isArray(permissions) ? permissions : [permissions] });
};

/*
USAGE EXAMPLES:

1. Basic authentication protection:
<ProtectedRoute>
  <DashboardComponent />
</ProtectedRoute>

2. Require specific subscription tier:
<ProtectedRoute requiredTier={SUBSCRIPTION_TIERS.PREMIUM}>
  <AdvancedAnalytics />
</ProtectedRoute>

3. Require specific permissions:
<ProtectedRoute requiredPermissions={['export_chat', 'advanced_analytics']}>
  <ExportFeature />
</ProtectedRoute>

4. Custom redirect:
<ProtectedRoute requireAuth={true} redirectTo="/custom-login">
  <SecureContent />
</ProtectedRoute>

5. Custom fallback component:
<ProtectedRoute fallback={<CustomLoginForm />}>
  <ProtectedContent />
</ProtectedRoute>

6. Using HOCs:
const PremiumFeature = withPremium(AdvancedAnalytics);
const AdminFeature = withPermissions(['admin_access'])(AdminPanel);

7. React Router integration:
import { Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/dashboard" element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } />
  
  <Route path="/analytics" element={
    <ProtectedRoute requiredTier={SUBSCRIPTION_TIERS.PREMIUM}>
      <Analytics />
    </ProtectedRoute>
  } />
  
  <Route path="/admin" element={
    <ProtectedRoute requiredPermissions={['admin_access']}>
      <AdminPanel />
    </ProtectedRoute>
  } />
</Routes>

8. Multiple conditions:
<ProtectedRoute 
  requireAuth={true}
  requiredTier={SUBSCRIPTION_TIERS.PROFESSIONAL}
  requiredPermissions={['advanced_features', 'api_access']}
>
  <EnterpriseFeatures />
</ProtectedRoute>

PROPS REFERENCE:
- children: React components to render if all checks pass
- requireAuth: boolean (default: true) - Whether authentication is required
- requiredTier: string - Minimum subscription tier required
- requiredPermissions: array - List of permissions required
- fallback: React component - Custom component to show when checks fail
- redirectTo: string (default: '/login') - URL to redirect to when auth fails
- showUpgradeModal: boolean - Whether to show upgrade modal for tier failures

FEATURES:
✅ Authentication checking
✅ Subscription tier validation with hierarchy
✅ Permission-based access control
✅ Account status validation (active/inactive)
✅ Email verification checks
✅ Beautiful upgrade prompts with pricing
✅ Usage statistics display
✅ React Router integration
✅ Custom fallback components
✅ Higher-order component helpers
✅ Comprehensive error states
✅ Mobile-responsive design
✅ Accessibility features
*/

export default ProtectedRoute;