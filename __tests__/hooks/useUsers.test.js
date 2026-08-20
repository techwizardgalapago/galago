import React from "react";
import { Platform, Text } from "react-native";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import usersReducer from "../../src/store/slices/userSlice";
import * as usersDB from "../../src/db/users";
import { useUsers } from "../../src/hooks/useUsers";

jest.mock("../../src/db/users");

const isWeb = Platform.OS === "web";

const sampleUser = {
  userID: "u1",
  firstName: "Alice",
  lastName: "Smith",
  userEmail: "alice@example.com",
  countryOfOrigin: "Canada",
  reasonForTravel: "Study",
  userRole: "student",
};

const Probe = () => {
  const { users, status } = useUsers();
  return (
    <>
      <Text testID="status">{status}</Text>
      <Text testID="count">{String(users.length)}</Text>
    </>
  );
};

const setup = () => {
  const store = configureStore({ reducer: { users: usersReducer } });
  const utils = render(
    <Provider store={store}>
      <Probe />
    </Provider>
  );
  return { store, ...utils };
};

describe(`useUsers en ${Platform.OS}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usersDB.selectAllUsers.mockResolvedValue([sampleUser]);
    usersDB.insertUser.mockResolvedValue();
  });

  it("carga los usuarios al montar", async () => {
    setup();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("succeeded");
    });

    // En web no hay SQLite: el hook resuelve con lista vacia, sin romper.
    expect(screen.getByTestId("count")).toHaveTextContent(isWeb ? "0" : "1");
  });

  it("refleja en la UI el alta optimista de un usuario", async () => {
    const { store } = setup();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("succeeded");
    });

    const { addUser } = require("../../src/store/slices/userSlice");
    await act(async () => {
      await store.dispatch(addUser({ ...sampleUser, userID: "u2" }));
    });

    expect(screen.getByTestId("count")).toHaveTextContent(isWeb ? "1" : "2");
  });
});
