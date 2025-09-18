import React, { createContext, useContext, useState } from 'react';

const SessionContext = createContext();

export function SessionProvider({ children }) {
  const [sessionData, setSessionData] = useState({});

  const updateSession = (key, value) => {
    setSessionData((prev) => ({ ...prev, [key]: value }));
  };

  const clearSession = () => {
    setSessionData({});
  };

  return (
    <SessionContext.Provider value={{ sessionData, updateSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}