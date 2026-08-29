// Arregla el build de iOS con Xcode 16.3+ / Apple clang 17+.
//
// React Native 0.79 fija fmt 11.0.2 a traves de RCT-Folly. En esa version,
// FMT_STRING se apoya en `consteval` de una forma que los Clang nuevos
// rechazan con "call to consteval function ... is not a constant expression",
// y el build falla al compilar Pods/fmt.
//
// fmt lo resolvio en 11.1, pero no podemos subirlo: RCT-Folly lo pina exacto.
// La cabecera decide sola si usar consteval y no respeta un -D externo, porque
// el bloque no esta envuelto en #ifndef. Asi que se parchea el archivo, y se
// hace en post_install porque CocoaPods lo vuelve a descargar cada vez.
//
// Se puede quitar cuando el proyecto suba a un SDK de Expo cuyo React Native
// traiga fmt 11.1 o superior.

const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARCA = "# --- parche fmt/consteval (withFmtConstevalFix) ---";

const SNIPPET = `
    ${MARCA}
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      contenido = File.read(fmt_base)
      parcheado = contenido.gsub('#  define FMT_USE_CONSTEVAL 1', '#  define FMT_USE_CONSTEVAL 0')
      if parcheado != contenido
        # CocoaPods deja las fuentes en solo lectura.
        File.chmod(0644, fmt_base)
        File.write(fmt_base, parcheado)
        Pod::UI.puts '[withFmtConstevalFix] fmt/base.h parcheado: FMT_USE_CONSTEVAL = 0'
      end
    end
`;

module.exports = function withFmtConstevalFix(config) {
  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contenido = fs.readFileSync(podfile, "utf8");

      if (!contenido.includes(MARCA)) {
        contenido = contenido.replace(
          /post_install do \|installer\|\n/,
          (match) => match + SNIPPET
        );
        fs.writeFileSync(podfile, contenido);
      }
      return cfg;
    },
  ]);
};
