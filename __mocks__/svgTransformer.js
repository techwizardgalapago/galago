// Los .svg en las pruebas.
//
// En la app los convierte Metro con react-native-svg-transformer, que los
// entrega como componentes de react-native-svg. Jest no usa Metro: su preset
// trata cualquier .svg como un asset y devuelve una ruta, asi que al pintar
// <Mascota /> la prueba reventaria con 'Element type is invalid'.
//
// Aqui cada .svg se convierte en un componente propio y distinguible. Importa
// que sea distinto por archivo y no uno compartido: asi una prueba puede
// comprobar que una ficha pinta LA mascota de su categoria y no la de otra,
// que es justo el fallo que se cometio al repartirlas a mano.
const path = require("path");

module.exports = {
  process(_src, filename) {
    const nombre = path.basename(filename, ".svg");
    const code = `
      const React = require('react');
      const { View } = require('react-native');
      const Mascota = React.forwardRef(function Mascota(props, ref) {
        return React.createElement(View, Object.assign({}, props, { ref: ref }));
      });
      Mascota.displayName = ${JSON.stringify(nombre)};
      Mascota.svgName = ${JSON.stringify(nombre)};
      module.exports = Mascota;
      module.exports.default = Mascota;
    `;
    return { code };
  },
  getCacheKey() {
    return "galago-svg-mock-v1";
  },
};
