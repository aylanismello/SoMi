const IS_DEV = process.env.EAS_BUILD_PROFILE === 'development'

module.exports = {
  expo: {
    name: IS_DEV ? 'SoMi (Dev)' : 'SoMi',
    slug: 'somi',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: IS_DEV ? 'somi-dev' : 'somi',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: IS_DEV ? 'com.azorean.somi.dev' : 'com.azorean.somi',
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['audio'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-video',
      'expo-audio',
      'expo-apple-authentication',
      [
        '@react-native-google-signin/google-signin',
        {
          iosUrlScheme: 'com.googleusercontent.apps.142962859647-9lnhsgdi79vs57b2guh87kbrob3dab8k.apps.googleusercontent.com',
        },
      ],
      'expo-router',
    ],
    extra: {
      eas: {
        projectId: '0dd8656c-858f-4ed6-8001-0eca007cd8b2',
      },
    },
    owner: 'azorean',
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/0dd8656c-858f-4ed6-8001-0eca007cd8b2',
    },
    experiments: {
      autolinkingModuleResolution: true,
    },
  },
}
