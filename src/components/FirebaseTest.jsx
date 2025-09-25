import React, { useState } from 'react';
import { saveCardsToFirebase, loadCardsFromFirebase } from '../firebase';
import { useAuth } from '../hooks/useAuth';

const FirebaseTest = () => {
  const [testResult, setTestResult] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const testFirebase = async () => {
    setLoading(true);
    setTestResult('Testing Firebase connection...\n');

    try {
      const userId = currentUser?.uid || 'test-user';

      // Test data
      const testCards = [{
        id: 'test-card-' + Date.now(),
        title: 'Firebase Test Card',
        description: 'This is a test card to verify Firebase connection',
        location: 'Test Location',
        status: 'Test Status',
        createdAt: new Date().toISOString()
      }];

      setTestResult(prev => prev + '📝 Saving test card to Firebase...\n');

      // Save to Firebase
      await saveCardsToFirebase(testCards, userId);
      setTestResult(prev => prev + '✅ Save successful!\n');

      setTestResult(prev => prev + '📥 Loading cards from Firebase...\n');

      // Load from Firebase
      const loadedCards = await loadCardsFromFirebase(userId);
      setTestResult(prev => prev + `✅ Loaded ${loadedCards.length} cards from Firebase!\n`);

      if (loadedCards.length > 0) {
        setTestResult(prev => prev + '🎉 Firebase is working correctly!\n');
        setTestResult(prev => prev + `Latest card: ${JSON.stringify(loadedCards[loadedCards.length - 1], null, 2)}\n`);
      }

    } catch (error) {
      setTestResult(prev => prev + `❌ Firebase error: ${error.message}\n`);
      setTestResult(prev => prev + `Error details: ${error.stack}\n`);
    }

    setLoading(false);
  };

  const checkEnvironment = () => {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    const syncEnabled = import.meta.env.VITE_ENABLE_FIREBASE_SYNC;

    let result = 'Environment Variables Check:\n';
    result += `🔧 VITE_ENABLE_FIREBASE_SYNC: ${syncEnabled}\n`;
    result += `🔑 VITE_FIREBASE_API_KEY: ${firebaseConfig.apiKey ? '✅ Set' : '❌ Missing'}\n`;
    result += `🌐 VITE_FIREBASE_AUTH_DOMAIN: ${firebaseConfig.authDomain ? '✅ Set' : '❌ Missing'}\n`;
    result += `📋 VITE_FIREBASE_PROJECT_ID: ${firebaseConfig.projectId ? '✅ Set' : '❌ Missing'}\n`;
    result += `💾 VITE_FIREBASE_STORAGE_BUCKET: ${firebaseConfig.storageBucket ? '✅ Set' : '❌ Missing'}\n`;
    result += `📬 VITE_FIREBASE_MESSAGING_SENDER_ID: ${firebaseConfig.messagingSenderId ? '✅ Set' : '❌ Missing'}\n`;
    result += `🆔 VITE_FIREBASE_APP_ID: ${firebaseConfig.appId ? '✅ Set' : '❌ Missing'}\n`;
    result += `👤 Current User: ${currentUser ? currentUser.email || currentUser.uid : 'Not logged in'}\n`;

    setTestResult(result);
  };

  return (
    <div className="firebase-test" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '400px',
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>🔥 Firebase Test Panel</h3>

      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={checkEnvironment}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '8px'
          }}
        >
          Check Config
        </button>

        <button
          onClick={testFirebase}
          disabled={loading}
          style={{
            background: loading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Testing...' : 'Test Firebase'}
        </button>
      </div>

      <div style={{
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        padding: '12px',
        maxHeight: '300px',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        fontSize: '11px'
      }}>
        {testResult || 'Click "Check Config" to verify environment variables or "Test Firebase" to test connection.'}
      </div>
    </div>
  );
};

export default FirebaseTest;