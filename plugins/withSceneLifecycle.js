/**
 * Adopts the UIScene life cycle on iOS. Apps built with the iOS 27 SDK (Xcode 27) that don't
 * adopt it are killed at launch ("UIScene life cycle is required for apps built with this SDK").
 *
 * Expo SDK 57 already ships the runtime pieces (ExpoAppSceneDelegate, ExpoReactNativeFactoryProvider),
 * but only the SDK 58 template turns them on. This plugin makes the same three changes as that template:
 *   1. Info.plist: UIApplicationSceneManifest pointing at SceneDelegate
 *   2. SceneDelegate.swift (subclass of ExpoAppSceneDelegate), added to the app target
 *   3. AppDelegate: conforms to ExpoReactNativeFactoryProvider and no longer creates the window
 *      (the scene delegate creates it and starts React Native)
 *
 * Remove this plugin after upgrading to SDK 58: its template does all of this already
 * (the plugin detects that and skips each step, so leaving it in is harmless).
 */
const fs = require('fs');
const path = require('path');
const { IOSConfig, withAppDelegate, withDangerousMod, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

const FILE = 'SceneDelegate.swift';
const SCENE_DELEGATE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const withSceneManifest = (config) =>
  withInfoPlist(config, (c) => {
    c.modResults.UIApplicationSceneManifest ??= {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return c;
  });

const withSceneDelegateFile = (config) =>
  withDangerousMod(config, [
    'ios',
    (c) => {
      const file = path.join(c.modRequest.platformProjectRoot, c.modRequest.projectName, FILE);
      if (!fs.existsSync(file)) fs.writeFileSync(file, SCENE_DELEGATE);
      return c;
    },
  ]);

const withSceneDelegateInProject = (config) =>
  withXcodeProject(config, (c) => {
    const name = c.modRequest.projectName;
    if (!c.modResults.hasFile(`${name}/${FILE}`)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({ filepath: `${name}/${FILE}`, groupName: name, project: c.modResults });
    }
    return c;
  });

const WINDOW_SETUP = /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/;

const withProviderAppDelegate = (config) =>
  withAppDelegate(config, (c) => {
    if (c.modResults.language !== 'swift') throw new Error('withSceneLifecycle: expected a Swift AppDelegate');
    let src = c.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    }
    src = src.replace(
      WINDOW_SETUP,
      '\n    // The window is created and React Native is started by `SceneDelegate` under the\n' +
        '    // scene-based life cycle (required by the iOS 27 SDK).\n',
    );
    // Fail the build loudly if the template changed, rather than shipping an app that won't launch
    if (!src.includes('ExpoReactNativeFactoryProvider') || /window = UIWindow\(frame:/.test(src)) {
      throw new Error('withSceneLifecycle: AppDelegate.swift has an unexpected shape; update plugins/withSceneLifecycle.js');
    }
    c.modResults.contents = src;
    return c;
  });

module.exports = (config) =>
  [withSceneManifest, withSceneDelegateFile, withSceneDelegateInProject, withProviderAppDelegate].reduce(
    (acc, plugin) => plugin(acc),
    config,
  );
