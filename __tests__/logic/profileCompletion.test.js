import {
  isProfileComplete,
  splitFullName,
  joinFullName,
} from "../../src/features/users/profileComplition";

// Perfil incompleto => useAuthGuard redirige a /perfil/settings/register,
// asi que estas reglas deciden si el usuario puede entrar a la app.
const completoRemoto = {
  fullName: "Ana Perez",
  userEmail: "ana@example.com",
  userRole: "turista",
  countryOfOrigin: "Ecuador",
  reasonForTravel: ["Turismo"],
};

const completoLocal = {
  firstName: "Ana",
  lastName: "Perez",
  userEmail: "ana@example.com",
  userRole: "turista",
  countryOfOrigin: "Ecuador",
  reasonForTravel: "Turismo, Estudio",
};

describe("isProfileComplete", () => {
  it("acepta la forma remota (fullName + array)", () => {
    expect(isProfileComplete(completoRemoto)).toBe(true);
  });

  it("acepta la forma local (firstName/lastName + string)", () => {
    expect(isProfileComplete(completoLocal)).toBe(true);
  });

  it("rechaza null o undefined", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });

  it.each([
    ["userEmail", { userEmail: "" }],
    ["userRole", { userRole: "" }],
    ["countryOfOrigin", { countryOfOrigin: "" }],
  ])("rechaza el perfil si falta %s", (_campo, patch) => {
    expect(isProfileComplete({ ...completoRemoto, ...patch })).toBe(false);
  });

  it("rechaza campos que solo tienen espacios", () => {
    expect(isProfileComplete({ ...completoRemoto, countryOfOrigin: "   " })).toBe(
      false
    );
  });

  it("exige al menos un motivo de viaje", () => {
    expect(isProfileComplete({ ...completoRemoto, reasonForTravel: [] })).toBe(false);
    expect(isProfileComplete({ ...completoLocal, reasonForTravel: "" })).toBe(false);
    expect(isProfileComplete({ ...completoLocal, reasonForTravel: " , " })).toBe(false);
  });

  it("exige nombre y apellido en la forma local", () => {
    expect(isProfileComplete({ ...completoLocal, lastName: "" })).toBe(false);
    expect(isProfileComplete({ ...completoLocal, firstName: "  " })).toBe(false);
  });

  it("no acepta un fullName de una sola letra", () => {
    expect(isProfileComplete({ ...completoRemoto, fullName: "A" })).toBe(false);
  });
});

describe("splitFullName", () => {
  it("usa la ultima palabra como apellido", () => {
    expect(splitFullName("Ana Perez")).toEqual({
      firstName: "Ana",
      lastName: "Perez",
    });
    expect(splitFullName("Ana Maria Perez")).toEqual({
      firstName: "Ana Maria",
      lastName: "Perez",
    });
  });

  it("deja el apellido vacio si solo hay una palabra", () => {
    expect(splitFullName("Ana")).toEqual({ firstName: "Ana", lastName: "" });
  });

  it("tolera espacios de sobra", () => {
    expect(splitFullName("  Ana   Perez  ")).toEqual({
      firstName: "Ana",
      lastName: "Perez",
    });
  });
});

describe("joinFullName", () => {
  it("une ignorando las partes vacias", () => {
    expect(joinFullName("Ana", "Perez")).toBe("Ana Perez");
    expect(joinFullName("Ana", "")).toBe("Ana");
    expect(joinFullName("", "Perez")).toBe("Perez");
    expect(joinFullName()).toBe("");
  });

  it("es el inverso de splitFullName", () => {
    const { firstName, lastName } = splitFullName("Ana Maria Perez");
    expect(joinFullName(firstName, lastName)).toBe("Ana Maria Perez");
  });
});
