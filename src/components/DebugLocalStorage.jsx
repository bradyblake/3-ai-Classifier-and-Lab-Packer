import React, { useState, useEffect } from 'react';

const DebugLocalStorage = () => {
  const [data, setData] = useState({});

  useEffect(() => {
    const platformSetup = localStorage.getItem('platformSetup');
    const kanbanCards = localStorage.getItem('kanbanCards');

    setData({
      platformSetup: platformSetup ? JSON.parse(platformSetup) : null,
      kanbanCards: kanbanCards ? JSON.parse(kanbanCards) : null,
      raw: {
        platformSetup,
        kanbanCards
      }
    });
  }, []);

  const clearData = () => {
    localStorage.removeItem('platformSetup');
    localStorage.removeItem('kanbanCards');
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      fontSize: '12px',
      maxWidth: '400px',
      maxHeight: '300px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <h4>Debug LocalStorage</h4>
      <button onClick={clearData} style={{marginBottom: '10px', background: 'red', color: 'white'}}>
        Clear All Data
      </button>

      <div>
        <strong>Platform Setup:</strong>
        <pre>{JSON.stringify(data.platformSetup, null, 2)}</pre>
      </div>

      <div style={{marginTop: '10px'}}>
        <strong>Kanban Cards:</strong>
        <pre>{JSON.stringify(data.kanbanCards, null, 2)}</pre>
      </div>
    </div>
  );
};

export default DebugLocalStorage;