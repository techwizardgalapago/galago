import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, addUser, clearUserError } from "../store/slices/userSlice";

export const useUsers = () => {
  const dispatch = useDispatch();
  const hasFetched = useRef(false);

  const users = useSelector((state) => state.users.list);
  const status = useSelector((state) => state.users.status);
  const error = useSelector((state) => state.users.error);

  useEffect(() => {
    console.log("User status in useEffect:", status);
    if (status === "idle" && !hasFetched.current) {
      dispatch(fetchUsers());
      hasFetched.current = true;
    }
  }, [dispatch, status]);

  const createUser = (user) => {
    dispatch(clearUserError());
    dispatch(addUser(user));
  };

  return { users, status, error, createUser };
};
