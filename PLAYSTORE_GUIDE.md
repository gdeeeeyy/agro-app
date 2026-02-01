# Publishing Agriismart to Google Play Store

This guide walks you through the complete process of publishing your Expo/React Native app to the Google Play Store.

## Prerequisites

Before you begin, ensure you have:
- A Google Play Developer account ($25 one-time fee) - [Register here](https://play.google.com/console/signup)
- EAS CLI installed (`npm install -g eas-cli`)
- An Expo account - [Sign up here](https://expo.dev/signup)
- Your app tested and ready for production

## Step 1: Configure EAS Build

### 1.1 Login to Expo

```bash
eas login
```

### 1.2 Configure EAS (if not already done)

```bash
eas build:configure
```

This creates an `eas.json` file. Update it for production:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./pc-api-key.json",
        "track": "production"
      }
    }
  }
}
```

### 1.3 Update app.json

Ensure your `app.json` has the correct configuration:

```json
{
  "expo": {
    "name": "Agriismart",
    "slug": "agriismart",
    "version": "1.1.0",
    "android": {
      "package": "com.agriismart.app",
      "versionCode": 2,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/icon.png",
        "backgroundColor": "#4caf50"
      }
    }
  }
}
```

**Important**: Increment `versionCode` for each new upload to Play Store.

## Step 2: Build the App Bundle

### 2.1 Create Production Build

```bash
eas build -p android --profile production
```

This will:
- Build an Android App Bundle (.aab) file
- Upload it to Expo's servers
- Provide a download link when complete

### 2.2 Download the Build

Once the build is complete, download the `.aab` file from the Expo dashboard or use the link provided in the terminal.

## Step 3: Create Google Play Console Listing

### 3.1 Create a New App

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in the details:
   - **App name**: Agriismart
   - **Default language**: English (United States) or your preferred language
   - **App or game**: App
   - **Free or paid**: Free (or Paid if applicable)
4. Accept the declarations and click **"Create app"**

### 3.2 Set Up Your Store Listing

Navigate to **"Grow" > "Store presence" > "Main store listing"**:

#### App Details
- **App name**: Agriismart
- **Short description** (80 chars max):
  ```
  AI-powered plant disease detection & agricultural products for farmers
  ```
- **Full description** (4000 chars max):
  ```
  Agriismart is your complete farming companion app designed to help farmers identify plant diseases, learn about crop management, and purchase quality agricultural products.

  🌱 PLANT DISEASE SCANNER
  • Take a photo of your plant leaves
  • Get instant AI-powered disease diagnosis
  • Receive treatment recommendations
  • Supports Tomato, Brinjal, and more crops

  🛒 AGRICULTURAL STORE
  • Browse quality farming products
  • Easy ordering with Cash on Delivery
  • Track your orders in real-time
  • Rate and review products

  📚 CROP GUIDES
  • Detailed cultivation guides
  • Pest and disease management
  • Available in English and Tamil

  🔬 IMPROVED TECHNOLOGIES
  • Learn modern farming techniques
  • Articles on Agronomy, Horticulture, Animal Husbandry
  • Post-harvest technology guides

  📱 KEY FEATURES
  • Bilingual support (English & Tamil)
  • Offline capability for saved data
  • Push notifications for order updates
  • User-friendly interface

  Perfect for:
  • Farmers looking to identify crop diseases
  • Agricultural enthusiasts
  • Anyone interested in modern farming practices

  Contact us at kvktvmalai91@gmail.com for support.
  ```

#### Graphics Assets

You'll need to prepare:

| Asset | Dimensions | Format |
|-------|------------|--------|
| App icon | 512 x 512 px | PNG (32-bit, no alpha) |
| Feature graphic | 1024 x 500 px | PNG or JPEG |
| Phone screenshots | Min 320px, Max 3840px | PNG or JPEG (2-8 images) |
| 7-inch tablet screenshots | Optional | PNG or JPEG |
| 10-inch tablet screenshots | Optional | PNG or JPEG |

**Tips for screenshots:**
- Show key features: Scanner, Store, Crop Info
- Use both English and Tamil UI if possible
- Add captions/annotations to highlight features

### 3.3 App Content

Navigate to **"Policy" > "App content"** and complete:

1. **Privacy policy**: Add a URL to your privacy policy
   - Host it on your website or use a service like [Termly](https://termly.io)
   
2. **Ads**: Declare if your app contains ads (No for Agriismart)

3. **App access**: If login is required, provide test credentials:
   ```
   Phone: 1234567890
   OTP: Use the OTP sent to this number (or provide a test account)
   ```

4. **Content ratings**: Complete the IARC questionnaire
   - Answer honestly about app content
   - Usually results in "Everyone" or "E" rating for this type of app

5. **Target audience**: Select age groups (likely 18+)

6. **News apps**: Select "No" (not a news app)

7. **COVID-19 apps**: Select if applicable

8. **Data safety**: Declare what data your app collects:
   - User account info (phone number, name)
   - Purchase history
   - Device identifiers (for push notifications)

## Step 4: Upload Your App Bundle

### 4.1 Create a Release

1. Go to **"Release" > "Production"**
2. Click **"Create new release"**
3. Under **"App bundles"**, click **"Upload"**
4. Select your `.aab` file
5. Wait for upload and processing

### 4.2 Add Release Notes

```
What's new in version 1.1.0:
• AI-powered plant disease detection
• Browse and order agricultural products
• Track your orders in real-time
• Bilingual support (English & Tamil)
• Crop cultivation guides
• Improved Technologies articles
```

### 4.3 Review and Roll Out

1. Click **"Review release"**
2. Address any errors or warnings
3. Click **"Start rollout to Production"**

## Step 5: Automated Submissions (Optional)

### 5.1 Set Up Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google Play Android Developer API**
4. Create a Service Account:
   - Go to **IAM & Admin > Service Accounts**
   - Create service account
   - Grant **Editor** role
   - Create JSON key and download it
5. In Play Console, go to **"Users and permissions"**
6. Invite the service account email with **Release manager** permissions

### 5.2 Configure EAS Submit

Save the JSON key as `pc-api-key.json` in your project root (add to `.gitignore`!)

Then submit directly:

```bash
eas submit -p android --profile production
```

## Step 6: Post-Submission

### Review Timeline
- First submission: 3-7 days (sometimes longer)
- Updates: Usually 1-3 days

### Common Rejection Reasons

1. **Missing Privacy Policy**: Ensure it's accessible and covers all data collection
2. **Broken functionality**: Test thoroughly before submission
3. **Intellectual property issues**: Ensure you own all assets
4. **Metadata issues**: Avoid misleading descriptions

### Monitor Your App

After approval:
1. Check **"Quality" > "Android vitals"** for crash reports
2. Respond to user reviews
3. Monitor downloads and ratings

## Updating Your App

For each update:

1. Increment `versionCode` in `app.json`
2. Update `version` if it's a significant release
3. Build: `eas build -p android --profile production`
4. Create new release in Play Console
5. Upload new `.aab` file
6. Add release notes
7. Roll out

## Quick Reference Commands

```bash
# Login to Expo
eas login

# Build for Play Store
eas build -p android --profile production

# Build APK for testing
eas build -p android --profile preview

# Submit to Play Store (with service account configured)
eas submit -p android --profile production

# Check build status
eas build:list
```

## Troubleshooting

### Build Fails
- Check `eas.json` configuration
- Ensure all dependencies are compatible
- Review build logs on Expo dashboard

### Upload Rejected
- Verify package name matches Play Console
- Check versionCode is higher than previous
- Ensure app bundle is signed correctly

### App Rejected
- Read rejection email carefully
- Address specific issues mentioned
- Resubmit with fixes

## Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)

## Support

If you encounter issues:
- Email: kvktvmalai91@gmail.com
- Website: http://www.kvkthiruvannamalai.com
