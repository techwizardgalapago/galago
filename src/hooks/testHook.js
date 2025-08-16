import { useState } from 'react';

export const useTestHook = () => {
  const [ready, setReady] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  return { ready, syncing };
};