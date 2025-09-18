export const decryptPayload = (payload, secret) => {
  try {
    return payload;
  } catch (err) {
    throw new Error("Decryption failed: " + err.message);
  }
};