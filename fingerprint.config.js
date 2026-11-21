// What counts as a "native change" for over-the-air updates (runtime version = fingerprint).
// Editing package.json script shortcuts or .gitignore can't change the native app, so ignore them;
// otherwise a harmless edit stops updates reaching installed phones.
/** @type {import('expo/fingerprint').Config} */
const config = {
  sourceSkips: [
    'ExpoConfigRuntimeVersionIfString',
    'ExpoConfigVersions',
    'PackageJsonScriptsAll',
    'GitIgnore',
  ],
};
module.exports = config;
