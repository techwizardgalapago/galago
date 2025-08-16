import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, addEvent } from '../store/slices/eventsSlice';

export const useEvents = () => {
  const dispatch = useDispatch();

  const events = useSelector((state) => state.events.list);
  const status = useSelector((state) => state.events.status);
  const error = useSelector((state) => state.events.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchEvents());
    }
  }, [dispatch, status]);

  const createEvent = (newEvent) => {
    dispatch(addEvent(newEvent));
  };

  return { events, status, error, createEvent };
};
