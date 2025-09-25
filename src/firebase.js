// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

// Firebase config from your existing project
const firebaseConfig = {
  apiKey: "AIzaSyDr33OsWMmwc8JEqmTaJ3CLpG_Wxa8TTAA",
  authDomain: "unboxed-kanban.firebaseapp.com",
  projectId: "unboxed-kanban",
  storageBucket: "unboxed-kanban.firebasestorage.app",
  messagingSenderId: "1002789338824",
  appId: "1:1002789338824:web:fc15f89301edcaf594affd"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firebase services
const storage = getStorage(firebaseApp);
const db = getFirestore(firebaseApp);

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

// Export Firebase instances
export { firebaseApp, storage, db };