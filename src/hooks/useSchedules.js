import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchSchedules, addSchedule } from "../store/slices/schedulesSlice";

export const useSchedules = () => {
  const dispatch = useDispatch();

  const schedules = useSelector((state) => state.schedules.list);
  const status = useSelector((state) => state.schedules.status);
  const error = useSelector((state) => state.schedules.error);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchSchedules());
    }
  }, [dispatch, status]);

  const createSchedule = (schedule) => {
    dispatch(addSchedule(schedule));
  };

  return { schedules, status, error, createSchedule };
};
