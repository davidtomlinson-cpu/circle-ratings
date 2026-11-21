// Test and live versions of SofaClub, built from the same code.
//   Live (default):    "SofaClub",      com.davala.circleratings,      link scheme sofaclub://
//   Test (APP_VARIANT=test, set on Expo for the development and preview environments):
//                      "SofaClub Test", com.davala.circleratings.test, link scheme sofaclub-test://
// Different app ids let both sit on one phone. Test builds get updates on the "preview" channel,
// live store builds on "production" (see eas.json), so test changes can never reach customers.
const TEST = process.env.APP_VARIANT === 'test';

module.exports = ({ config }) => {
  if (!TEST) return { ...config, extra: { ...config.extra, appVariant: 'live' } };
  return {
    ...config,
    name: 'SofaClub Test',
    scheme: 'sofaclub-test',
    ios: { ...config.ios, bundleIdentifier: `${config.ios.bundleIdentifier}.test` },
    android: { ...config.android, package: `${config.android.package}.test` },
    extra: { ...config.extra, appVariant: 'test' },
  };
};
