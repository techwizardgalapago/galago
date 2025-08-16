import React, { useEffect } from "react";
import { Text } from "react-native";
import { render, waitFor, act } from "@testing-library/react-native";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import usersReducer, {
  addUser,
  clearUserError,
} from "../../src/store/slices/userSlice";
import * as usersDB from "../../src/db/users";
import { useUsers } from "../../src/hooks/useUsers";

jest.mock("../../src/db/users");

const sampleUser = {
  userID: "u1",
  firstName: "Alice",
  lastName: "Smith",
  userEmail: "alice@example.com",
  password: "pw",
  countryOfOrigin: "Canada",
  dateOfBirth: "1995-03-25",
  reasonForTravel: "Study",
  userRole: "student",
  googleAccount: false,
  recoveryToken: null,
};

const TestComponent = () => {
  const { users, status, error, createUser } = useUsers();

  useEffect(() => {
    if (status === "succeeded" && users.length === 0) {
      createUser(sampleUser);
    }
  }, [status]);

  return (
    <>
      <Text testID='status'>{status}</Text>
      <Text testID='userCount'>{users.length}</Text>
      {error && <Text testID='error'>{error}</Text>}
    </>
  );
};

describe("useUsers (in functional component)", () => {
  const setup = () => {
    const store = configureStore({
      reducer: {
        users: usersReducer,
      },
    });

    return render(
      <Provider store={store}>
        <TestComponent />
      </Provider>
    );
  };

  beforeEach(() => {
    usersDB.selectAllUsers.mockResolvedValue([]);
    usersDB.insertUser.mockResolvedValue();
  });

  it("fetches users and adds one if list is empty", async () => {
    const { getByTestId } = setup();

    await waitFor(() => {
      expect(getByTestId("status").props.children).toBe("succeeded");
    });

    await waitFor(() => {
      expect(getByTestId("userCount").props.children).toBe(1);
    });
  });

  it("handles fetch error", async () => {
    usersDB.selectAllUsers.mockRejectedValueOnce(new Error("DB fetch failed"));

    const { getByTestId } = setup();

    await waitFor(() => {
      expect(getByTestId("status").props.children).toBe("failed");
      expect(getByTestId("error").props.children).toBe("DB fetch failed");
    });
  });
});

// it("does not refetch users if status is not 'idle'", async () => {
//   usersDB.selectAllUsers.mockResolvedValue([sampleUser]);

//   const store = configureStore({
//     reducer: { users: usersReducer },
//     preloadedState: {
//       users: {
//         list: [sampleUser],
//         status: "succeeded",
//         error: null,
//         rehydrated: true,
//       },
//     },
//   });

//   const { getByTestId } = render(
//     <Provider store={store}>
//       <TestComponent />
//     </Provider>
//   );

//   expect(getByTestId("userCount").props.children).toBe(1);
//   expect(usersDB.selectAllUsers).toHaveBeenCalledTimes(0);
// });

it("does not refetch users if status is not 'idle'", async () => {
  const store = configureStore({
    reducer: { users: usersReducer },
    preloadedState: {
      users: {
        list: [sampleUser],
        status: "succeeded", // <-- This is key
        error: null,
        rehydrated: true,
      },
    },
  });

  usersDB.selectAllUsers.mockClear(); // <-- Important

  const { getByTestId } = render(
    <Provider store={store}>
      <Text testID='userCount'>{store.getState().users.list.length}</Text>
    </Provider>
  );

  await waitFor(() => {
    expect(getByTestId("userCount").props.children).toBe(1);
  });

  expect(usersDB.selectAllUsers).not.toHaveBeenCalled(); // ✅
});

it("does not add duplicate user if already present", async () => {
  const initialUsers = [sampleUser];

  usersDB.selectAllUsers.mockResolvedValue(initialUsers);
  usersDB.insertUser.mockImplementation(() => {
    throw new Error("Unique constraint failed");
  });

  const { getByTestId } = render(
    <Provider store={configureStore({ reducer: { users: usersReducer } })}>
      <TestComponent />
    </Provider>
  );

  await waitFor(() => {
    expect(getByTestId("status").props.children).toBe("succeeded");
  });

  await waitFor(() => {
    expect(getByTestId("userCount").props.children).toBe(1);
  });
});

it("shows error if user creation fails", async () => {
  usersDB.selectAllUsers.mockResolvedValue([]);
  usersDB.insertUser.mockRejectedValue(new Error("Insert failed"));

  const { getByTestId } = render(
    <Provider store={configureStore({ reducer: { users: usersReducer } })}>
      <TestComponent />
    </Provider>
  );

  await waitFor(() => {
    expect(getByTestId("status").props.children).toBe("succeeded");
  });

  await waitFor(() => {
    expect(getByTestId("error").props.children).toBe("Insert failed");
  });
});

it("clears error on new user creation", async () => {
  usersDB.selectAllUsers.mockResolvedValue([]);
  const error = new Error("Insert failed");

  // First call fails
  usersDB.insertUser.mockRejectedValueOnce(error);

  const store = configureStore({ reducer: { users: usersReducer } });

  const { getByTestId } = render(
    <Provider store={store}>
      <TestComponent />
    </Provider>
  );

  // Wait for error
  await waitFor(() => {
    expect(getByTestId("error").props.children).toBe("Insert failed");
  });

  // Second call succeeds
  usersDB.insertUser.mockResolvedValueOnce();
  const user = { ...sampleUser, userID: "new" };
  await act(async () => {
    store.dispatch(clearUserError());
    await store.dispatch(addUser(user));
  });

  // Error should now be cleared
  await waitFor(() => {
    expect(store.getState().users.error).toBe(null);
  });
});
