import React from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';

const FirebaseSyncStatus = ({
  isEnabled,
  isSyncing,
  lastSyncTime,
  error,
  onForceSync
}) => {
  if (!isEnabled) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 text-sm">
        <CloudOff size={16} />
        <span>Firebase Disabled</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      {/* Sync Status Icon */}
      <div className="flex items-center space-x-1">
        {isSyncing ? (
          <>
            <RefreshCw size={16} className="animate-spin text-blue-500" />
            <span className="text-sm text-blue-600">Syncing...</span>
          </>
        ) : error ? (
          <>
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-600">Sync Error</span>
          </>
        ) : (
          <>
            <Cloud size={16} className="text-green-500" />
            <Check size={12} className="text-green-500" />
          </>
        )}
      </div>

      {/* Last Sync Time */}
      {lastSyncTime && !isSyncing && (
        <span className="text-xs text-gray-500">
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </span>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}

      {/* Force Sync Button */}
      {onForceSync && !isSyncing && (
        <button
          onClick={onForceSync}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
          title="Force sync to Firebase"
        >
          Sync Now
        </button>
      )}
    </div>
  );
};

// Mini version for compact display
export const FirebaseSyncStatusMini = ({ isEnabled, isSyncing, error }) => {
  if (!isEnabled) {
    return <CloudOff size={14} className="text-gray-400" title="Firebase Disabled" />;
  }

  if (isSyncing) {
    return <RefreshCw size={14} className="animate-spin text-blue-500" title="Syncing..." />;
  }

  if (error) {
    return <AlertCircle size={14} className="text-red-500" title={`Error: ${error}`} />;
  }

  return <Cloud size={14} className="text-green-500" title="Firebase Connected" />;
};

export default FirebaseSyncStatus;