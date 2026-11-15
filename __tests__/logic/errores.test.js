const { mensajeDeError } = require("../../src/services/errores");

// Este modulo existe por un fallo real: a dos negocios nuevos no les subieron
// las fotos y la pantalla solo dijo 'No se pudo guardar'. El motivo (tiempo
// agotado, archivo grande, o el texto que el backend ya manda) se perdia.

describe("mensajeDeError", () => {
  it("prefiere el mensaje que manda el backend", () => {
    const error = {
      response: {
        status: 400,
        data: {
          statusCode: 400,
          error: "Bad Request",
          message: "Este registro admite como maximo 6 imagenes y ya tiene 6",
        },
      },
    };
    expect(mensajeDeError(error)).toBe(
      "Este registro admite como maximo 6 imagenes y ya tiene 6"
    );
  });

  it("explica el tiempo agotado hablando de subir menos fotos", () => {
    const mensaje = mensajeDeError({ code: "ECONNABORTED" });
    expect(mensaje).toMatch(/tardo demasiado/i);
    expect(mensaje).toMatch(/menos fotos/i);
  });

  it("distingue la falta de red del tiempo agotado", () => {
    expect(mensajeDeError({ message: "Network Error" })).toMatch(
      /conexion/i
    );
  });

  it("traduce el 413, que lo devuelve el servidor web sin mensaje", () => {
    const mensaje = mensajeDeError({ response: { status: 413, data: "" } });
    expect(mensaje).toMatch(/pesan demasiado/i);
  });

  it("traduce la sesion caducada y el registro borrado", () => {
    expect(mensajeDeError({ response: { status: 401, data: {} } })).toMatch(
      /sesion caduco/i
    );
    expect(mensajeDeError({ response: { status: 404, data: {} } })).toMatch(
      /ya no existe/i
    );
  });

  it("no culpa a la persona de un fallo del servidor", () => {
    expect(mensajeDeError({ response: { status: 500, data: {} } })).toMatch(
      /servidor tuvo un problema/i
    );
  });

  it("cae al respaldo de la pantalla cuando no reconoce nada", () => {
    const error = { response: { status: 418, data: {} } };
    expect(mensajeDeError(error, "No se pudo crear el evento.")).toBe(
      "No se pudo crear el evento."
    );
  });

  it("no se rompe con un error vacio", () => {
    expect(typeof mensajeDeError(undefined)).toBe("string");
    expect(mensajeDeError(undefined).length).toBeGreaterThan(0);
  });
});
