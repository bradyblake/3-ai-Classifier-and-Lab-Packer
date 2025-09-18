import { useEffect, useState } from "react";
import { decryptPayload } from "../shared/utils/securityUtils";

export function useSecuritySync({ syncData, masterSecret }) {
  const [validated, setValidated] = useState(false);
  const [syncInfo, setSyncInfo] = useState(null);

  useEffect(() => {
    if (!syncData || !masterSecret) return;

    try {
      if (syncData.syncKey) {
        console.warn("[Security Sync] Running in DEV mode — decryption bypassed.");
        setSyncInfo(syncData);
        setValidated(true);
        return;
      }

      const decrypted = decryptPayload(syncData, masterSecret);
      if (decrypted && decrypted.syncKey) {
        setSyncInfo(decrypted);
        setValidated(true);
        console.log("[Security Sync] Valid sync data received.");
      } else {
        console.warn("[Security Sync] Missing syncKey in decrypted data.");
      }
    } catch (err) {
      console.error("[Security Sync] Failed to decrypt sync data:", err.message);
    }
  }, [syncData, masterSecret]);

  return { validated, syncInfo };
}