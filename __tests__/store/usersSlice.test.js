import { configureStore } from "@reduxjs/toolkit";
import usersReducer, {
  fetchUsers,
  addUser,
} from "../../src/store/slices/userSlice";
import * as usersDB from "../../src/db/users";

jest.mock("../../src/db/users");

describe("usersSlice", () => {
  let store;

  const sampleUser = {
    userID: "123",
    firstName: "Carlos",
    lastName: "Dominguez",
    userEmail: "carlos@example.com",
    password: "secret",
    countryOfOrigin: "Ecuador",
    dateOfBirth: "1990-01-01",
    reasonForTravel: "Tourism",
    userRole: "user",
    googleAccount: false,
    recoveryToken: null,
  };

  beforeEach(() => {
    store = configureStore({
      reducer: {
        users: usersReducer,
      },
    });
  });

  it("should fetch users and populate state", async () => {
    usersDB.selectAllUsers.mockResolvedValue([sampleUser]);

    await store.dispatch(fetchUsers());

    const state = store.getState().users;
    expect(state.list).toHaveLength(1);
    expect(state.list[0]).toEqual(sampleUser);
    expect(state.status).toBe("succeeded");
  });

  it("should add a user to the state", async () => {
    usersDB.insertUser.mockResolvedValue(); // no return needed

    await store.dispatch(addUser(sampleUser));

    const state = store.getState().users;
    expect(state.list).toContainEqual(sampleUser);
  });

  it("should handle errors in fetchUsers", async () => {
    usersDB.selectAllUsers.mockRejectedValue(new Error("DB error"));

    await store.dispatch(fetchUsers());

    const state = store.getState().users;
    expect(state.status).toBe("failed");
    expect(state.error).toBe("DB error");
  });
});
