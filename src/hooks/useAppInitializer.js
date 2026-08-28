import { useEffect, useState, useRef } from "react";
import { useDispatch } from "react-redux";
import NetInfo from "@react-native-community/netinfo";
import debounce from "lodash.debounce";
import { rehydrateReduxFromSQLite } from "../store/rehydration";
import { initializeDatabase } from "../db";
import { pushAllChanges } from "../services/syncService";
import { OFFLINE_ENABLED } from "../constants/plataform";
import { setUnauthorizedHandler } from "../services/api";
import { logout } from "../store/slices/authSlice";
import { fetchEventsRemote } from "../store/slices/eventsSlice";
import { fetchAllVenuesRemote } from "../store/slices/venueSlice";
import { fetchTouristSitesRemote } from "../store/slices/touristSitesSlice";
import { initImageCache, prefetchImages } from "../utils/imageCache";
import { collectImageUrls } from "../utils/images";

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
      syncWithIndicator();
    }, 5000)
  ).current;

  // Sesion expirada (401): limpia auth y deja que useAuthGuard mande a login.
  useEffect(() => {
    setUnauthorizedHandler(() => dispatch(logout()));
    return () => setUnauthorizedHandler(null);
  }, [dispatch]);

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

        // Fetch remoto de datos públicos — independiente de qué tab se visite primero
        const remotos = [
          [dispatch(fetchEventsRemote()), "eventImage"],
          [dispatch(fetchAllVenuesRemote()), "venueImage"],
          [dispatch(fetchTouristSitesRemote()), "siteImage"],
        ];

        // Con los datos ya en mano, bajar las imágenes a disco para que la
        // próxima apertura sin conexión las tenga. Es best-effort y no debe
        // retrasar ni bloquear la UI, por eso no se espera aquí.
        if (OFFLINE_ENABLED) {
          initImageCache();
          Promise.all(
            remotos.map(async ([accion, campo]) => {
              try {
                const lista = await accion.unwrap();
                return collectImageUrls(lista, campo);
              } catch {
                return [];
              }
            })
          )
            .then((grupos) => prefetchImages(grupos.flat()))
            .catch(() => {});
        }

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
