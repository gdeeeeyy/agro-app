import Constants from 'expo-constants';

/**
 * Central configuration for the Agriismart application.
 * All environment variables should be accessed through this object.
 * 
 * Uses EXPO_PUBLIC_ prefixed environment variables which are automatically 
 * injected by Expo during the build process.
 */

const extra = Constants.expoConfig?.extra || {};

export const Config = {
  // API and Server
  API_URL: process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || 'https://agro-app-6hlq.onrender.com',
  API_SUPPORTS_CROP_DOCTOR_DELETE: process.env.EXPO_PUBLIC_API_SUPPORTS_CROP_DOCTOR_DELETE === '1',
  
  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || extra.cloudinaryCloudName || '',
  CLOUDINARY_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_PRESET || process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || extra.cloudinaryPreset || 'agro_app_unsigned',
  CLOUDINARY_API_KEY: process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY || '',
  
  // Support
  SUPPORT_NUMBER: process.env.EXPO_PUBLIC_SUPPORT_NUMBER || extra.supportNumber || '1234567890',
  
  // App Info
  VERSION: Constants.expoConfig?.version || '2.0.1',
  IS_PRODUCTION: !__DEV__,
};

export default Config;
