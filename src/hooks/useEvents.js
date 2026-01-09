import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, addEvent, fetchEventsRemote } from '../store/slices/eventsSlice';

export const useEvents = () => {
  const dispatch = useDispatch();
  const fetchedRemoteRef = useRef(false);

  const events = useSelector((state) => state.events.list);
  const status = useSelector((state) => state.events.status);
  const error = useSelector((state) => state.events.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchEvents());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (error) {
      console.warn("useEvents - fetch failed", error);
    }
  }, [error]);

  useEffect(() => {
    if (fetchedRemoteRef.current) return;
    fetchedRemoteRef.current = true;
    dispatch(fetchEventsRemote());
  }, [dispatch]);

  const createEvent = (newEvent) => {
    dispatch(addEvent(newEvent));
  };

  return { events, status, error, createEvent };
};
