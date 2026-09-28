import {
  CURATOR_ROLE,
  DEFAULT_USER_ROLE,
  EXPLORER_ROLE,
  USER_ROLES,
  isCurator,
} from "../../src/features/users/roles";

describe("roles de usuario", () => {
  it("arranca en Explorer", () => {
    expect(DEFAULT_USER_ROLE).toBe(EXPLORER_ROLE);
    expect(USER_ROLES[0]).toBe(EXPLORER_ROLE);
  });

  it("solo el curator puede registrar negocios", () => {
    expect(isCurator({ userRole: CURATOR_ROLE })).toBe(true);
    expect(isCurator({ userRole: EXPLORER_ROLE })).toBe(false);
  });

  it("trata como explorer al usuario sin rol", () => {
    expect(isCurator(null)).toBe(false);
    expect(isCurator({})).toBe(false);
    expect(isCurator({ userRole: "" })).toBe(false);
  });

  it("tolera espacios sobrantes en el valor guardado", () => {
    expect(isCurator({ userRole: ` ${CURATOR_ROLE} ` })).toBe(true);
  });
});
