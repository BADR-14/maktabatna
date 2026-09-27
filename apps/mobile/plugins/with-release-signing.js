/**
 * Signs release builds with the family keystore in credentials/ so every APK can update the
 * previous one. Google sign-in's Android client is registered with this key's SHA-1.
 * (Committed on purpose: a private family repo, and losing the key would block updates.)
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING = `
        release {
            storeFile file('../../credentials/maktabatna-release.jks')
            storePassword 'maktabatna-family'
            keyAlias 'maktabatna'
            keyPassword 'maktabatna-family'
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("maktabatna-release.jks")) {
      g = g.replace(/signingConfigs \{\s*debug \{[\s\S]*?\n        \}/, (m) => m + SIGNING);
      g = g.replace(/(buildTypes \{[\s\S]*?release \{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
