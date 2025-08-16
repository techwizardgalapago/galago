import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";
import debounce from "lodash.debounce";
import { rehydrateReduxFromSQLite } from "../store/rehydration";
import { initializeDatabase } from "../db";
import { syncAllOfflineData } from "../services/syncService";

export const useAppInitializer = () => {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const initializedRef = useRef(false);

  const syncWithIndicator = async () => {
    setSyncing(true);
    try {
      await syncAllOfflineData();
    } catch (err) {
      console.error("❌ Sync failed:", err);
    }
    setSyncing(false);
  };

  const debouncedSync = useRef(
    debounce(() => {
      if (!initializedRef.current) return;
      console.log("📡 Connection stable, syncing...");
      syncWithIndicator();
    }, 5000)
  ).current;

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        await dispatch(rehydrateReduxFromSQLite());
        initializedRef.current = true;
        setReady(true);

        const state = await NetInfo.fetch();
        if (state.isConnected && state.isInternetReachable) {
          debouncedSync();
        }
      } catch (err) {
        console.error("❌ App initialization failed:", err);
      }
    };

    init();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        debouncedSync();
      }
    });

    return () => {
      unsubscribe();
      debouncedSync.cancel(); // avoid memory leaks
    };
  }, []);

  return { ready, syncing };
};
