# Build a standalone APK for testing (no npm on the phone)

This produces an installable Android APK you can sideload to any device, without needing npm on that device.

## 0) Prep the app config (optional but recommended)
- If your app talks to a hosted API, set the URL now so it’s baked into the APK:
  ```env
  EXPO_PUBLIC_API_URL=https://<your-api-host>
  ```
- Save this in a `.env` file in the project root, then build.

## 1) Install build prerequisites (on your computer)
- Java JDK 17
- Android SDK command-line tools
- ADB (android-tools-adb)

Example setup (Linux):
```bash
# Tools
sudo apt-get update -y && sudo apt-get install -y unzip curl android-tools-adb openjdk-17-jdk

# Android SDK cmdline-tools
SDK_ROOT="$HOME/Android/Sdk"
mkdir -p "$SDK_ROOT/cmdline-tools" && cd "$SDK_ROOT/cmdline-tools"
curl -L -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip -q cmdline-tools.zip && rm cmdline-tools.zip
[ -d cmdline-tools ] && mv cmdline-tools latest

# Env for this shell (consider adding to your shell rc file)
export ANDROID_SDK_ROOT="$SDK_ROOT" ANDROID_HOME="$SDK_ROOT"
export PATH="$SDK_ROOT/cmdline-tools/latest/bin:$SDK_ROOT/platform-tools:$PATH"

# Accept licenses & install required packages (SDK 36 as used by this app)
yes | sdkmanager --licenses >/dev/null || true
yes | sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

## 2) Ensure Gradle knows your SDK path
From the project root:
```bash
printf "sdk.dir=%s\n" "$HOME/Android/Sdk" > android/local.properties
```

## 3) Build a debug APK
```bash
bash -lc 'cd android && ./gradlew --no-daemon assembleDebug'
```
- Artifact path: `android/app/build/outputs/apk/debug/app-debug.apk`

## 4) Install to a device (USB)
```bash
adb devices            # ensure your device shows as "device"
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 5) Share to testers
- Send the APK file directly (email, Drive, etc.).
- Testers should enable “Install unknown apps” for the file manager/browser used to open the APK.

## Optional: Signed release APK (for production-like testing)
```bash
# Generate keystore (save passwords)
keytool -genkeypair -v -storetype PKCS12 \
  -keystore android/app/release.keystore -alias agriismart \
  -keyalg RSA -keysize 2048 -validity 10000

# android/app/keystore.properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=agriismart
storeFile=release.keystore

# Build
bash -lc 'cd android && ./gradlew --no-daemon assembleRelease'
# Artifact: android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting
- SDK location not found:
  - Create `android/local.properties` as shown above; ensure cmdline-tools are installed; run `yes | sdkmanager ...` lines.
- CMake/codegen GLOB mismatch:
  - Clean and regenerate: 
    ```bash
    rm -rf android/app/.cxx android/app/build android/build android/.gradle
    rm -rf node_modules package-lock.json && npm ci
    npx expo prebuild -p android --clean
    printf "sdk.dir=%s\n" "$HOME/Android/Sdk" > android/local.properties
    bash -lc 'cd android && ./gradlew --no-daemon clean assembleDebug'
    ```
- Node non-zero exit from settings.gradle:
  - Ensure Node is installed and `npm ci` succeeded; re-run `npx expo prebuild -p android --clean`.
- Device not detected:
  - Enable USB debugging and “File Transfer” mode; run `adb kill-server && adb start-server`.

That’s it—your testers can install the APK and use the app without npm or Expo Go.