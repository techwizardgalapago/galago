import { Platform } from "react-native";
import { configureStore } from "@reduxjs/toolkit";
import usersReducer, {
  fetchUsers,
  addUser,
  selectAllUsers,
} from "../../src/store/slices/userSlice";
import * as usersDB from "../../src/db/users";

jest.mock("../../src/db/users");

const isWeb = Platform.OS === "web";

const sampleUser = {
  userID: "123",
  firstName: "Carlos",
  lastName: "Dominguez",
  userEmail: "carlos@example.com",
  countryOfOrigin: "Ecuador",
  dateOfBirth: "1990-01-01",
  reasonForTravel: "Tourism",
  userRole: "user",
};

describe(`usersSlice en ${Platform.OS}`, () => {
  let store;

  beforeEach(() => {
    jest.clearAllMocks();
    store = configureStore({ reducer: { users: usersReducer } });
  });

  it("carga usuarios desde SQLite en nativo y queda vacio en web", async () => {
    usersDB.selectAllUsers.mockResolvedValue([sampleUser]);

    await store.dispatch(fetchUsers());
    const state = store.getState();

    expect(state.users.status).toBe("succeeded");
    if (isWeb) {
      expect(usersDB.selectAllUsers).not.toHaveBeenCalled();
      expect(selectAllUsers(state)).toEqual([]);
    } else {
      expect(selectAllUsers(state)).toHaveLength(1);
      expect(selectAllUsers(state)[0]).toEqual(sampleUser);
    }
  });

  it("agrega el usuario a Redux de forma optimista en ambas plataformas", async () => {
    usersDB.insertUser.mockResolvedValue();

    await store.dispatch(addUser(sampleUser));
    const state = store.getState();

    // El alta es optimista: entra a Redux tambien en web, donde no hay SQLite.
    expect(selectAllUsers(state)).toContainEqual(sampleUser);
    if (isWeb) {
      expect(usersDB.insertUser).not.toHaveBeenCalled();
    } else {
      expect(usersDB.insertUser).toHaveBeenCalledWith(sampleUser);
    }
  });

  it("propaga los errores reales de SQLite al estado", async () => {
    usersDB.selectAllUsers.mockRejectedValue(new Error("DB error"));

    await store.dispatch(fetchUsers());
    const state = store.getState();

    if (isWeb) {
      // En web nunca se llama a SQLite, asi que no hay error que propagar.
      expect(state.users.status).toBe("succeeded");
    } else {
      expect(state.users.status).toBe("failed");
      expect(state.users.error).toBe("DB error");
    }
    expect(selectAllUsers(state)).toEqual([]);
  });

  it("tolera que la BD no este inicializada", async () => {
    // ignoreDBIfWeb() solo traga este error concreto: la app debe seguir viva.
    usersDB.selectAllUsers.mockRejectedValue(
      new Error("Database not initialized. Call initializeDatabase() first.")
    );

    await store.dispatch(fetchUsers());
    const state = store.getState();

    expect(state.users.status).toBe("succeeded");
    expect(selectAllUsers(state)).toEqual([]);
  });
});
