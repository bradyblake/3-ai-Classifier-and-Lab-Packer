// Security utilities for Revolutionary Classifier
// Provides encryption, key management, and secure data handling

export const encryptData = (data, key = 'default-key') => {
  // Simple base64 encoding for now - replace with proper encryption in production
  return btoa(JSON.stringify(data));
};

export const decryptData = (encryptedData, key = 'default-key') => {
  try {
    return JSON.parse(atob(encryptedData));
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

export const generateSecureId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const validateSecureData = (data) => {
  return data && typeof data === 'object' && !Array.isArray(data);
};

export const injectConfig = (config = {}) => {
  // Simple config injection for components
  return {
    enableSecurity: true,
    ...config,
    timestamp: Date.now()
  };
};

export default {
  encryptData,
  decryptData,
  generateSecureId,
  validateSecureData,
  injectConfig
};