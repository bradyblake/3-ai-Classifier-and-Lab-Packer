import React, { useState } from 'react';
import { User, LogOut, Shield, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const UserProfile = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { currentUser, logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || !currentUser) {
    return null;
  }

  const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
  const email = currentUser.email;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-gray-900">{displayName}</div>
          <div className="text-xs text-gray-500 truncate max-w-32">{email}</div>
        </div>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{displayName}</div>
                <div className="text-sm text-gray-500">{email}</div>
              </div>
            </div>
          </div>

          <div className="py-2">
            <div className="px-4 py-2 text-sm text-gray-600 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Shield size={16} className="text-green-600" />
                <span>Data is private to your account</span>
              </div>
            </div>

            <div className="px-4 py-2">
              <div className="text-xs text-gray-500 mb-1">Account Status</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-green-600">Active & Synchronized</span>
              </div>
            </div>

            <div className="border-t border-gray-100 mt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        ></div>
      )}
    </div>
  );
};

export default UserProfile;