// src/components/auth/SubscriptionStatus.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext.js';
import { useUI } from '../../contexts/UIContext.js';
import { SUBSCRIPTION_TIERS } from '../../services/constants.js';

const SubscriptionStatus = ({ className = '' }) => {
  const { user, subscriptionTier, getSubscriptionLimits, isSubscriptionExpired } = useAuth();
  const { showInfoToast } = useUI();

  const subscription = user?.subscription;
  const limits = getSubscriptionLimits();
  const isExpired = isSubscriptionExpired();

  const getTierColor = (tier) => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.FREE:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case SUBSCRIPTION_TIERS.PREMIUM:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case SUBSCRIPTION_TIERS.PROFESSIONAL:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTierIcon = (tier) => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.FREE:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case SUBSCRIPTION_TIERS.PREMIUM:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        );
      case SUBSCRIPTION_TIERS.PROFESSIONAL:
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatExpiryDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysUntilExpiry = (dateString) => {
    if (!dateString) return null;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const timeDiff = expiryDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const handleUpgrade = () => {
    showInfoToast('Upgrade feature coming soon!');
  };

  const getPricingInfo = (tier) => {
    switch (tier) {
      case SUBSCRIPTION_TIERS.FREE:
        return { price: '$0', period: 'forever', description: 'Perfect for getting started' };
      case SUBSCRIPTION_TIERS.PREMIUM:
        return { price: '$9.99', period: 'month', description: 'Great for regular users' };
      case SUBSCRIPTION_TIERS.PROFESSIONAL:
        return { price: '$19.99', period: 'month', description: 'For power users and businesses' };
      default:
        return { price: '$0', period: 'month', description: '' };
    }
  };

  const currentPricing = getPricingInfo(subscriptionTier);
  const daysUntilExpiry = subscription?.expiresAt ? getDaysUntilExpiry(subscription.expiresAt) : null;

  return (
    <div className={`${className}`}>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Subscription Status</h3>
        </div>

        {/* Current Plan */}
        <div className="px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getTierColor(subscriptionTier)}`}>
                {getTierIcon(subscriptionTier)}
                <span className="ml-2">{subscriptionTier} Plan</span>
              </div>
              {isExpired && (
                <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Expired
                </span>
              )}
              {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                <span className="ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Expires in {daysUntilExpiry} days
                </span>
              )}
            </div>
            
            {subscriptionTier !== SUBSCRIPTION_TIERS.PROFESSIONAL && (
              <button
                onClick={handleUpgrade}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upgrade Plan
              </button>
            )}
          </div>

          {/* Pricing Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {currentPricing.price}
                  <span className="text-sm font-normal text-gray-500">/{currentPricing.period}</span>
                </div>
                <p className="text-sm text-gray-600">{currentPricing.description}</p>
              </div>
              {subscription?.autoRenew && !isExpired && (
                <div className="text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Auto-renewal enabled
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Plan Details */}
          {subscription?.expiresAt && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Plan Details</h4>
              <div className="text-sm text-gray-600">
                <p>
                  {isExpired ? 'Expired on' : 'Valid until'}: {formatExpiryDate(subscription.expiresAt)}
                </p>
                {subscription.startDate && (
                  <p className="mt-1">
                    Started: {formatExpiryDate(subscription.startDate)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Usage Limits */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Plan Limits</h4>
            <div className="space-y-3">
              {/* Chats per day */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Chats per day</span>
                <span className="text-sm font-medium text-gray-900">
                  {limits.limits.chatsPerDay === Infinity ? 'Unlimited' : limits.limits.chatsPerDay}
                </span>
              </div>
              
              {/* Messages per day */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Messages per day</span>
                <span className="text-sm font-medium text-gray-900">
                  {limits.limits.messagesPerDay === Infinity ? 'Unlimited' : limits.limits.messagesPerDay}
                </span>
              </div>
              
              {/* Features */}
              <div className="pt-3 border-t border-gray-200">
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Features Included
                </h5>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600">Chat History</span>
                  </div>
                  
                  <div className="flex items-center">
                    {limits.limits.hasAnalytics ? (
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${limits.limits.hasAnalytics ? 'text-gray-600' : 'text-gray-400'}`}>
                      Advanced Analytics
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    {limits.limits.hasExport ? (
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${limits.limits.hasExport ? 'text-gray-600' : 'text-gray-400'}`}>
                      Chat Export
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    {limits.limits.hasPrioritySupport ? (
                      <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-gray-300 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`text-sm ${limits.limits.hasPrioritySupport ? 'text-gray-600' : 'text-gray-400'}`}>
                      Priority Support
                    </span>
                  </div>

                  {subscriptionTier === SUBSCRIPTION_TIERS.PROFESSIONAL && (
                    <>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600">API Access</span>
                      </div>
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-gray-600">Custom Integrations</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        {user?.usageStats && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Current Usage</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {user.usageStats.chatsToday || 0}
                </div>
                <div className="text-xs text-gray-500">
                  Chats Today
                  {limits.limits.chatsPerDay !== Infinity && (
                    <span className="text-gray-400">
                      /{limits.limits.chatsPerDay}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">
                  {user.usageStats.messagesToday || 0}
                </div>
                <div className="text-xs text-gray-500">
                  Messages Today
                  {limits.limits.messagesPerDay !== Infinity && (
                    <span className="text-gray-400">
                      /{limits.limits.messagesPerDay}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA for Free/Premium users */}
        {subscriptionTier !== SUBSCRIPTION_TIERS.PROFESSIONAL && (
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  {subscriptionTier === SUBSCRIPTION_TIERS.FREE 
                    ? 'Unlock Premium Features' 
                    : 'Get the Full Experience'
                  }
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {subscriptionTier === SUBSCRIPTION_TIERS.FREE 
                    ? 'Upgrade to Premium for advanced analytics and unlimited exports.'
                    : 'Upgrade to Professional for unlimited everything and priority support.'
                  }
                </p>
                <div className="mt-2">
                  <div className="text-xs text-gray-500">
                    {subscriptionTier === SUBSCRIPTION_TIERS.FREE ? (
                      <>Starting at <span className="font-semibold text-blue-600">$9.99/month</span></>
                    ) : (
                      <>Upgrade to <span className="font-semibold text-purple-600">$19.99/month</span></>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform hover:scale-105 transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Upgrade
              </button>
            </div>
          </div>
        )}

        {/* Billing Information */}
        {subscription?.billingCycle && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Billing Information</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Billing Cycle:</span>
                <span className="font-medium">{subscription.billingCycle}</span>
              </div>
              {subscription.nextBillingDate && (
                <div className="flex justify-between">
                  <span>Next Billing Date:</span>
                  <span className="font-medium">{formatExpiryDate(subscription.nextBillingDate)}</span>
                </div>
              )}
              {subscription.paymentMethod && (
                <div className="flex justify-between">
                  <span>Payment Method:</span>
                  <span className="font-medium">•••• {subscription.paymentMethod.last4}</span>
                </div>
              )}
            </div>
            <div className="mt-3 flex space-x-3">
              <button
                onClick={() => showInfoToast('Billing management coming soon!')}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Manage Billing
              </button>
              <button
                onClick={() => showInfoToast('Invoice history coming soon!')}
                className="text-sm text-gray-600 hover:text-gray-500 font-medium"
              >
                View Invoices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionStatus;