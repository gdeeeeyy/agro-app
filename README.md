# Agriismart

A comprehensive agriculture mobile application built with React Native and Expo, designed to help farmers with plant disease detection, crop management, and agricultural product purchasing.

## Features

### 🌱 Plant Disease Scanner
- AI-powered plant disease detection using Google Generative AI
- Upload or capture images of plant leaves
- Get instant diagnosis and treatment recommendations
- Support for multiple crops (Tomato, Brinjal, etc.)

### 🛒 Agricultural Products Store
- Browse and purchase agricultural products
- Product variants with different prices
- Shopping cart functionality
- Order tracking with status updates
- Ratings and reviews for products

### 📚 Crop Information
- Detailed crop cultivation guides
- Pest and disease management information
- Bilingual support (English and Tamil)
- Image galleries for pests and diseases

### 🔬 Improved Technologies
- Articles on modern farming techniques
- Categorized by: Agronomy, Horticulture, Animal Husbandry, Post Harvest
- Admin panel for content management

### 👤 User Management
- User registration and authentication
- Role-based access (User, Vendor, Master Admin)
- Profile management with addresses

### 📦 Order Management
- Place orders with COD or online payment (Razorpay)
- Track order status (Pending → Confirmed → Processing → Dispatched)
- Logistics tracking integration

### 🔔 Notifications
- In-app notifications
- Push notifications support
- Order status updates

## Tech Stack

### Mobile App
- **Framework**: React Native with Expo SDK 54
- **Navigation**: Expo Router
- **State Management**: React Context
- **Local Database**: expo-sqlite
- **UI Components**: Custom components with Ionicons

### Backend Server
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL (Supabase/Neon compatible)
- **Authentication**: JWT tokens
- **Payments**: Razorpay integration
- **SMS**: Textbelt for OTP

### Cloud Services
- **Image Storage**: Cloudinary
- **Database Hosting**: Supabase/Neon
- **Deployment**: Render (for API)

## Project Structure

```
agro-app/
├── app/                    # App screens (Expo Router)
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── crop/              # Crop detail screens
│   ├── improved-technologies/  # Technology articles
│   └── order/             # Order detail screens
├── components/            # Reusable UI components
├── context/               # React Context providers
├── lib/                   # Utilities and API functions
├── server/                # Backend Express server
├── assets/                # Images and static assets
└── scripts/               # Utility scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agro-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory (Expo public vars only):
   ```env
   EXPO_PUBLIC_API_URL=https://your-api-url.com
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   EXPO_PUBLIC_CLOUDINARY_PRESET=your-preset
   ```
   Note: AI keys must NOT be exposed in the client app bundle.

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

### Backend Setup

1. **Navigate to server directory**
   ```bash
   cd server
   npm install
   ```

2. **Set up environment variables**
   Configure these on Render (or in `server/.env` for local dev):
   ```env
   DATABASE_URL=postgresql://user:password@host:port/database
   JWT_SECRET=your-jwt-secret
   RAZORPAY_KEY_ID=your-razorpay-key
   RAZORPAY_KEY_SECRET=your-razorpay-secret
   TEXTBELT_URL=https://textbelt.com/text
   TEXTBELT_KEY=textbelt
   GROQ_API_KEY=your-groq-api-key
   # Optional
   GROQ_VISION_MODEL=llama-3.2-11b-vision-preview
   ```

3. **Start the server**
   ```bash
   npm start
   ```

## Running Tests

### Server Tests
```bash
cd server
npm test
```

## Building for Production

### Android APK
```bash
eas build -p android --profile preview
```

### Android App Bundle (for Play Store)
```bash
eas build -p android --profile production
```

### iOS
```bash
eas build -p ios --profile production
```

For detailed Play Store publishing instructions, see [PLAYSTORE_GUIDE.md](./PLAYSTORE_GUIDE.md).

## Language Support

The app supports:
- **English** (en)
- **Tamil** (ta)

Users can switch languages from the profile settings.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Contact

- **Email**: kvktvmalai91@gmail.com
- **Website**: http://www.kvkthiruvannamalai.com
- **Phone**: 04182-290551
