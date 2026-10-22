/**
 * Release builds have no INTERNET permission (app.json blockedPermissions): the app never uses the network.
 * Debug builds still need it to load JavaScript from the Metro dev server, so this declares INTERNET in the
 * debug manifest only. The debug manifest has a higher merge priority than main, so main's
 * tools:node="remove" (from blockedPermissions) doesn't strip it there; release builds have no debug manifest.
 */
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

const PERMISSION = '<uses-permission android:name="android.permission.INTERNET"/>';

const withDebugInternet = (config) =>
  withDangerousMod(config, [
    'android',
    (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, 'app/src/debug/AndroidManifest.xml');
      if (!fs.existsSync(file)) throw new Error(`withDebugInternet: ${file} not found`);
      const xml = fs.readFileSync(file, 'utf8');
      if (!xml.includes('android.permission.INTERNET')) {
        if (!/<manifest[^>]*>/.test(xml)) throw new Error('withDebugInternet: no <manifest> element in the debug manifest');
        fs.writeFileSync(file, xml.replace(/(<manifest[^>]*>)/, `$1\n  ${PERMISSION}`));
      }
      return c;
    },
  ]);

module.exports = withDebugInternet;
