// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('❌ Firebase configuration missing. Please check your .env file.');
  console.log('Required environment variables:');
  console.log('- VITE_FIREBASE_API_KEY');
  console.log('- VITE_FIREBASE_AUTH_DOMAIN');
  console.log('- VITE_FIREBASE_PROJECT_ID');
  console.log('- VITE_FIREBASE_STORAGE_BUCKET');
  console.log('- VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.log('- VITE_FIREBASE_APP_ID');
}

// Initialize Firebase
console.log('🔥 Initializing Firebase with config:', {
  apiKey: firebaseConfig.apiKey ? '✅ Set' : '❌ Missing',
  authDomain: firebaseConfig.authDomain ? '✅ Set' : '❌ Missing',
  projectId: firebaseConfig.projectId || '❌ Missing',
  storageBucket: firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing',
  messagingSenderId: firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing',
  appId: firebaseConfig.appId ? '✅ Set' : '❌ Missing'
});

const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(firebaseApp);
const storage = getStorage(firebaseApp);
const db = getFirestore(firebaseApp);

export { auth };

// Storage Functions
export const uploadFileToFirebase = async (file, path = 'uploads') => {
  try {
    const timestamp = new Date().getTime();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `${path}/${fileName}`);

    console.log('📤 Uploading file to Firebase:', fileName);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log('✅ File uploaded successfully:', url);

    return {
      url,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Firebase upload error:', error);
    throw error;
  }
};

// Firestore Functions for Kanban Data
export const saveCardsToFirebase = async (cards, userId = 'default') => {
  try {
    const cardsCollection = collection(db, `users/${userId}/cards`);

    // Clear existing cards first (or implement update logic)
    const existingCards = await getDocs(cardsCollection);
    const deletePromises = existingCards.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Add new cards
    const savePromises = cards.map(card => addDoc(cardsCollection, {
      ...card,
      updatedAt: new Date().toISOString()
    }));

    await Promise.all(savePromises);
    console.log('✅ Cards saved to Firebase:', cards.length);
    return true;
  } catch (error) {
    console.error('❌ Firebase save error:', error);
    throw error;
  }
};

export const loadCardsFromFirebase = async (userId = 'default') => {
  try {
    const cardsCollection = collection(db, `users/${userId}/cards`);
    const snapshot = await getDocs(cardsCollection);

    const cards = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));

    console.log('✅ Cards loaded from Firebase:', cards.length);
    return cards;
  } catch (error) {
    console.error('❌ Firebase load error:', error);
    return [];
  }
};

export const saveLanesToFirebase = async (lanes, userId = 'default') => {
  try {
    const lanesCollection = collection(db, `users/${userId}/lanes`);

    // Clear existing lanes
    const existingLanes = await getDocs(lanesCollection);
    const deletePromises = existingLanes.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    // Add new lanes
    const savePromises = lanes.map(lane => addDoc(lanesCollection, {
      ...lane,
      updatedAt: new Date().toISOString()
    }));

    await Promise.all(savePromises);
    console.log('✅ Lanes saved to Firebase:', lanes.length);
    return true;
  } catch (error) {
    console.error('❌ Firebase lanes save error:', error);
    throw error;
  }
};

export const loadLanesFromFirebase = async (userId = 'default') => {
  try {
    const lanesCollection = collection(db, `users/${userId}/lanes`);
    const snapshot = await getDocs(lanesCollection);

    const lanes = snapshot.docs.map(doc => ({
      firebaseId: doc.id,
      ...doc.data()
    }));

    console.log('✅ Lanes loaded from Firebase:', lanes.length);
    return lanes;
  } catch (error) {
    console.error('❌ Firebase lanes load error:', error);
    return [];
  }
};

// Archive functions for EOP system
export const saveEopArchiveToFirebase = async (archiveData, userId = 'default') => {
  try {
    const archiveCollection = collection(db, `users/${userId}/eopArchives`);
    const docRef = await addDoc(archiveCollection, {
      ...archiveData,
      archivedAt: new Date().toISOString()
    });

    console.log('✅ EOP archive saved to Firebase:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Firebase EOP archive error:', error);
    throw error;
  }
};

export const loadEopArchivesFromFirebase = async (userId = 'default') => {
  try {
    const archiveCollection = collection(db, `users/${userId}/eopArchives`);
    const snapshot = await getDocs(archiveCollection);

    const archives = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log('✅ EOP archives loaded from Firebase:', archives.length);
    return archives;
  } catch (error) {
    console.error('❌ Firebase EOP archives load error:', error);
    return [];
  }
};

// Data Migration Function to preserve existing data
export const migrateExistingDataToUser = async (userId) => {
  try {
    console.log('🔄 Starting data migration for user:', userId);

    // Load existing data from localStorage
    const existingCards = JSON.parse(localStorage.getItem('kanbanCards') || '[]');
    const existingLanes = JSON.parse(localStorage.getItem('kanbanLanes') || '[]');
    const existingArchives = JSON.parse(localStorage.getItem('eopArchives') || '[]');

    if (existingCards.length === 0 && existingLanes.length === 0 && existingArchives.length === 0) {
      console.log('ℹ️ No existing data to migrate');
      return { success: true, migrated: { cards: 0, lanes: 0, archives: 0 } };
    }

    // Check if user already has data in Firebase
    const existingUserCards = await loadCardsFromFirebase(userId);

    if (existingUserCards.length > 0) {
      console.log('ℹ️ User already has data in Firebase, skipping migration');
      return { success: true, message: 'User already has data', migrated: { cards: 0, lanes: 0, archives: 0 } };
    }

    // Migrate data to user's Firebase account
    const migrations = [];

    // Migrate cards
    if (existingCards.length > 0) {
      await saveCardsToFirebase(existingCards, userId);
      migrations.push(`${existingCards.length} cards`);
    }

    // Migrate lanes
    if (existingLanes.length > 0) {
      await saveLanesToFirebase(existingLanes, userId);
      migrations.push(`${existingLanes.length} lanes`);
    }

    // Migrate archives
    for (const archive of existingArchives) {
      await saveEopArchiveToFirebase(archive, userId);
    }
    if (existingArchives.length > 0) {
      migrations.push(`${existingArchives.length} archives`);
    }

    // Create backup of localStorage data with timestamp
    const backupData = {
      cards: existingCards,
      lanes: existingLanes,
      archives: existingArchives,
      migratedAt: new Date().toISOString(),
      migratedToUserId: userId
    };

    localStorage.setItem('dataBackup_beforeMigration', JSON.stringify(backupData));

    console.log('✅ Data migration completed:', migrations.join(', '));

    return {
      success: true,
      migrated: {
        cards: existingCards.length,
        lanes: existingLanes.length,
        archives: existingArchives.length
      },
      message: `Successfully migrated: ${migrations.join(', ')}`
    };

  } catch (error) {
    console.error('❌ Data migration error:', error);
    throw error;
  }
};

// Export Firebase instances
export { firebaseApp, storage, db };