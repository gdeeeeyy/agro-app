# Production Deployment Guide (Android & iOS)

This guide walks you through preparing, building, and publishing the app to Google Play and Apple App Store using Expo (EAS).

## Prerequisites
- Expo account and EAS CLI installed: `npm i -g eas-cli`
- App identifiers configured in app.json:
  - ios.bundleIdentifier: com.agriismart.app
  - android.package: com.agriismart.app
- Apple Developer Program membership (paid) and Google Play Developer account (paid)
- Icons, splash, and permissions configured (already set in app.json)

## 1) Configure EAS
- Log in: `eas login`
- Initialize EAS (if not already): `eas init`
- Review eas.json profiles (production profile builds for stores)

## 2) Secrets & Environment
- Put your public env in .env (already used by Expo via EXPO_PUBLIC_*).
- For sensitive secrets, use: `eas secret:create --name NAME --value VALUE --scope project`

## 3) iOS Certificates & Provisioning
- Run: `eas build:configure`
- Let EAS manage credentials (recommended). Follow prompts to create distribution certificates, app IDs, and provisioning profiles.

## 4) Create Store Builds
- Update version in app.json (done: 1.1.0) reflecting new recommendations feature
- Android (AAB): `eas build -p android --profile production`
- iOS (IPA): `eas build -p ios --profile production`
- Monitor builds: EAS dashboard or CLI logs. When complete, download artifacts.

## 5) Test Distributions
- Android: install .apk from development profile (or use internal testing in Play Console)
- iOS: use TestFlight (requires `eas submit` or Xcode Transporter upload)

## 6) Submitting to Stores

### Android (Google Play)
1. Create a new app in Google Play Console (Production or Internal testing track)
2. Upload the AAB from EAS build
3. Fill in required listing: Title, Short/Full description (Tamil and English if needed), Screenshots, Category, Content rating, Privacy policy
4. Highlight new feature: "AI-based recommendations using plant scan keywords and related products"
4. Set app signing (Play App Signing is recommended)
5. Rollout to an internal test first, then to production

Automate submission:
- Configure a service account JSON and set as secret: `GOOGLE_SERVICE_ACCOUNT_JSON`
- Run: `eas submit -p android --latest --key @GOOGLE_SERVICE_ACCOUNT_JSON`

### iOS (Apple App Store)
1. In App Store Connect, create the app with the exact bundle ID
2. Upload the .ipa (via `eas submit -p ios --latest` or Transporter)
3. Fill App Information, Pricing, Privacy Nutrition Labels, Screenshots, Review details
4. In "What’s New" for 1.1.0, mention Tamil-first UI and smarter product recommendations
4. Submit for review, then release when approved

Automate submission:
- Authenticate: `eas build:configure` (Apple)
- Submit latest build: `eas submit -p ios --latest`

## 7) Versioning & Changelogs
- Update `version` in app.json for each release
- Current: 1.1.0 — adds Tamil-first UI and improved product recommendations (keyword + related by name)
- Android versionCode and iOS buildNumber auto-managed by EAS (can override via app.json or eas.json if needed)

## 8) Store Localization (Tamil)
- Use Tamil app name in app.json (configured)
- Provide Tamil descriptions, screenshots with Tamil UI
- Ensure in-app permission strings are Tamil (configured in plugin settings)

## 9) Post-Release
- Monitor crashes/analytics (e.g., Sentry/Expo services)
- Respond to review feedback
- Plan staged rollouts for safer releases

## Common Commands
- Lint: `npm run lint`
- Start (dev): `npm run start`
- Android dev build: `eas build -p android --profile development`
- iOS dev build: `eas build -p ios --profile development`
- Production store builds: see section 4
