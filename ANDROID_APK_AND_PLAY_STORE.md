# Android APK (testing) + Google Play Store Deployment

This guide shows how to generate an installable APK for testing and how to ship to Google Play (AAB).

## Prerequisites
- Java JDK 17
- Android SDK cmdline-tools, `sdkmanager`, and `adb`
- Node/npm installed
- (Play Store) Google Play Developer account and an app created in Play Console

Quick setup for SDK (Linux):
```bash
sudo apt-get update -y && sudo apt-get install -y unzip curl android-tools-adb openjdk-17-jdk
SDK_ROOT="$HOME/Android/Sdk"; mkdir -p "$SDK_ROOT/cmdline-tools" && cd "$SDK_ROOT/cmdline-tools"
curl -L -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q cmdline-tools.zip && rm cmdline-tools.zip; [ -d cmdline-tools ] && mv cmdline-tools latest
export ANDROID_SDK_ROOT="$SDK_ROOT" ANDROID_HOME="$SDK_ROOT"
export PATH="$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$PATH"
yes | sdkmanager --licenses >/dev/null || true
yes | sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

From project root, ensure Gradle knows your SDK path:
```bash
printf "sdk.dir=%s\n" "$HOME/Android/Sdk" > android/local.properties
```

---
## A) Build a debug APK for testing (sideload)
1) (Optional) Set API env baked into the build in `.env`:
```env
EXPO_PUBLIC_API_URL=https://<your-api-host>
```
2) Build APK:
```bash
bash -lc 'cd android && ./gradlew --no-daemon assembleDebug'
```
3) Install to device (USB):
```bash
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```
Share `app-debug.apk` with testers.

---
## B) Build a signed release APK (optional sideload)
1) Create a keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/release.keystore -alias agriismart \
  -keyalg RSA -keysize 2048 -validity 10000
```
2) Create `android/app/keystore.properties`:
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=agriismart
storeFile=release.keystore
```
3) Build:
```bash
bash -lc 'cd android && ./gradlew --no-daemon assembleRelease'
```
Artifact: `android/app/build/outputs/apk/release/app-release.apk` (sideload only; Play requires AAB).

---
## C) Play Store build (AAB) and submission using EAS (recommended)
1) Install and init EAS:
```bash
npm i -g eas-cli
EAS_NO_VCS=1 eas init
```
2) Configure credentials (let EAS manage):
```bash
eas build:configure
```
3) Build production AAB:
```bash
eas build -p android --profile production
```
4) Submit to Play (manual or automated):
- Manual: download AAB from EAS and upload in Play Console → Internal Testing → Create Release.
- Automated:
```bash
# Use a Play service account JSON (set in EAS as a secret or local path)
eas submit -p android --path <path-to-aab>
# or submit latest from EAS
# eas submit -p android --latest
```

Play Console checklist:
- App details: Title, Short/Full description, Category
- Graphics: Icons, feature graphics, screenshots
- Content rating, Privacy policy URL
- Data safety form, Permissions
- Upload AAB to Internal testing first → Rollout

---
## D) Troubleshooting
- SDK location not found: ensure `android/local.properties` has your SDK path and cmdline-tools are installed; run `yes | sdkmanager` lines above.
- CMake/codegen "GLOB mismatch":
```bash
rm -rf android/app/.cxx android/app/build android/build android/.gradle
rm -rf node_modules package-lock.json && npm ci
npx expo prebuild -p android --clean
printf "sdk.dir=%s\n" "$HOME/Android/Sdk" > android/local.properties
bash -lc 'cd android && ./gradlew --no-daemon clean assembleDebug'
```
- Node error in settings.gradle: ensure Node is on PATH; run `npm ci` and `npx expo prebuild -p android --clean`.
- Device not detected: enable USB debugging; `adb kill-server && adb start-server`.

---
## E) Notes
- APKs are for sideload/testing; Google Play requires AAB for production.
- Rebuild whenever `.env` changes to embed new `EXPO_PUBLIC_API_URL`.
