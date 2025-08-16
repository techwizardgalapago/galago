import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVenues, addVenue } from '../store/slices/venuesSlice';

export const useVenues = () => {
  const dispatch = useDispatch();

  const venues = useSelector((state) => state.venues.list);
  const status = useSelector((state) => state.venues.status);
  const error = useSelector((state) => state.venues.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchVenues());
    }
  }, [dispatch, status]);

  const createVenue = (venueData) => {
    dispatch(addVenue(venueData));
  };

  return { venues, status, error, createVenue };
};
