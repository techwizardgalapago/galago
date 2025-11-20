// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Asegurar que Metro trate `.wasm` como asset válido
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
