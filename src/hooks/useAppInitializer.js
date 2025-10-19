import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";
import debounce from "lodash.debounce";
import { rehydrateReduxFromSQLite } from "../store/rehydration";
import { initializeDatabase } from "../db";
import { pushAllChanges } from "../services/syncService";
import { OFFLINE_ENABLED } from "../constants/plataform";

export const useAppInitializer = () => {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const initializedRef = useRef(false);

  const syncWithIndicator = async () => {
    if (!OFFLINE_ENABLED) return;
    setSyncing(true);
    try {
      await pushAllChanges();
    } catch (err) {
      console.error("❌ Sync failed:", err);
    }
    setSyncing(false);
  };

  const debouncedSync = useRef(
    debounce(() => {
      if (!initializedRef.current || !OFFLINE_ENABLED) return;
      console.log("📡 Connection stable, syncing...");
      syncWithIndicator();
    }, 5000)
  ).current;

  useEffect(() => {
    const init = async () => {
      try {
        if (OFFLINE_ENABLED) { 
          await initializeDatabase();
          await dispatch(rehydrateReduxFromSQLite());
        } else {
          // web: skip DB entirely
          console.log("🌐 Web build detected: skipping SQLite init/rehydration.");
        }
        initializedRef.current = true;
        setReady(true);

        if (OFFLINE_ENABLED) {
          const state = await NetInfo.fetch();
          if (state.isConnected && state.isInternetReachable) {
            debouncedSync();
          }
        }
      } catch (err) {
        console.error("❌ App initialization failed:", err);
        // Even if DB init failed on native, surface UI so app isn't stuck
        setReady(true);
      }
    };

    init();

    const unsubscribe = OFFLINE_ENABLED ? NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        debouncedSync();
      }
    }) : () => {};

    return () => {
      unsubscribe();
      debouncedSync.cancel(); // avoid memory leaks
    };
  }, []);

  return { ready, syncing : OFFLINE_ENABLED ? syncing : false };
};
