// Firebase Sync Hook for Kanban Board
import { useState, useEffect, useCallback } from 'react';
import {
  saveCardsToFirebase,
  loadCardsFromFirebase,
  saveLanesToFirebase,
  loadLanesFromFirebase,
  saveEopArchiveToFirebase,
  migrateExistingDataToUser
} from '../firebase';
import { useAuth } from './useAuth';

const useFirebaseSync = (initialCards = [], initialLanes = []) => {
  const [isFirebaseEnabled] = useState(
    import.meta.env.VITE_ENABLE_FIREBASE_SYNC === 'true'
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [migrationStatus, setMigrationStatus] = useState(null);

  const { currentUser } = useAuth();
  const userId = currentUser?.uid || 'default';

  // Auto-sync and migration on mount if Firebase is enabled
  useEffect(() => {
    if (isFirebaseEnabled && currentUser) {
      handleUserAuthenticated();
    }
  }, [isFirebaseEnabled, currentUser]);

  const handleUserAuthenticated = async () => {
    try {
      // First, try to migrate existing data if this is the first login
      const migrationResult = await migrateExistingDataToUser(userId);
      setMigrationStatus(migrationResult);

      // Then load data (either migrated or existing user data)
      await loadFromFirebase();

      // Show migration success message if data was migrated
      if (migrationResult.migrated &&
          (migrationResult.migrated.cards > 0 ||
           migrationResult.migrated.lanes > 0 ||
           migrationResult.migrated.archives > 0)) {
        console.log('✅ Your existing data has been preserved and migrated to your account!');
      }
    } catch (error) {
      console.error('❌ User authentication setup error:', error);
      setSyncError(`Setup failed: ${error.message}`);
    }
  };

  const loadFromFirebase = useCallback(async () => {
    if (!isFirebaseEnabled) return { cards: initialCards, lanes: initialLanes };

    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('🔄 Loading data from Firebase...');

      const [cards, lanes] = await Promise.all([
        loadCardsFromFirebase(userId),
        loadLanesFromFirebase(userId)
      ]);

      setLastSyncTime(new Date());
      console.log('✅ Firebase data loaded successfully');

      return {
        cards: cards.length > 0 ? cards : initialCards,
        lanes: lanes.length > 0 ? lanes : initialLanes
      };

    } catch (error) {
      console.error('❌ Firebase load error:', error);
      setSyncError(`Load failed: ${error.message}`);

      // Return local data as fallback
      return { cards: initialCards, lanes: initialLanes };
    } finally {
      setIsSyncing(false);
    }
  }, [isFirebaseEnabled, initialCards, initialLanes, userId]);

  const saveToFirebase = useCallback(async (cards, lanes) => {
    if (!isFirebaseEnabled) {
      // Still save to localStorage as fallback
      localStorage.setItem('kanbanCards', JSON.stringify(cards));
      localStorage.setItem('kanbanLanes', JSON.stringify(lanes));
      return true;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('💾 Saving data to Firebase...');

      // Save to both Firebase and localStorage
      await Promise.all([
        saveCardsToFirebase(cards, userId),
        saveLanesToFirebase(lanes, userId)
      ]);

      // Backup to localStorage
      localStorage.setItem('kanbanCards', JSON.stringify(cards));
      localStorage.setItem('kanbanLanes', JSON.stringify(lanes));
      localStorage.setItem('lastFirebaseSync', new Date().toISOString());

      setLastSyncTime(new Date());
      console.log('✅ Data saved to Firebase successfully');

      return true;

    } catch (error) {
      console.error('❌ Firebase save error:', error);
      setSyncError(`Save failed: ${error.message}`);

      // Save to localStorage as fallback
      localStorage.setItem('kanbanCards', JSON.stringify(cards));
      localStorage.setItem('kanbanLanes', JSON.stringify(lanes));

      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isFirebaseEnabled, userId]);

  const saveEopArchive = useCallback(async (archiveData) => {
    if (!isFirebaseEnabled) {
      // Save to localStorage as fallback
      const existingArchives = JSON.parse(localStorage.getItem('eopArchives') || '[]');
      existingArchives.push({
        ...archiveData,
        id: Date.now().toString(),
        archivedAt: new Date().toISOString()
      });
      localStorage.setItem('eopArchives', JSON.stringify(existingArchives));
      return existingArchives[existingArchives.length - 1].id;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);

      console.log('📋 Saving EOP archive to Firebase...');

      const archiveId = await saveEopArchiveToFirebase(archiveData, userId);

      // Also backup to localStorage
      const existingArchives = JSON.parse(localStorage.getItem('eopArchives') || '[]');
      existingArchives.push({
        ...archiveData,
        id: archiveId,
        archivedAt: new Date().toISOString()
      });
      localStorage.setItem('eopArchives', JSON.stringify(existingArchives));

      console.log('✅ EOP archive saved successfully');
      return archiveId;

    } catch (error) {
      console.error('❌ Firebase EOP archive error:', error);
      setSyncError(`Archive failed: ${error.message}`);

      // Fallback to localStorage
      const existingArchives = JSON.parse(localStorage.getItem('eopArchives') || '[]');
      const fallbackId = Date.now().toString();
      existingArchives.push({
        ...archiveData,
        id: fallbackId,
        archivedAt: new Date().toISOString()
      });
      localStorage.setItem('eopArchives', JSON.stringify(existingArchives));

      return fallbackId;
    } finally {
      setIsSyncing(false);
    }
  }, [isFirebaseEnabled, userId]);

  const forceSync = useCallback(async (cards, lanes) => {
    console.log('🔄 Force syncing to Firebase...');
    return await saveToFirebase(cards, lanes);
  }, [saveToFirebase]);

  const getSyncStatus = useCallback(() => {
    return {
      isEnabled: isFirebaseEnabled,
      isSyncing,
      lastSyncTime,
      error: syncError,
      hasError: !!syncError
    };
  }, [isFirebaseEnabled, isSyncing, lastSyncTime, syncError]);

  return {
    isFirebaseEnabled,
    isSyncing,
    lastSyncTime,
    syncError,
    migrationStatus,
    loadFromFirebase,
    saveToFirebase,
    saveEopArchive,
    forceSync,
    getSyncStatus
  };
};

export default useFirebaseSync;