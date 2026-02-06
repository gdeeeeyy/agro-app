import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'ta';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Tamil translations
const translations = {
  en: {
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
'common.success': 'Success',
    'common.info': 'Info',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.update': 'Update',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',

    // Permissions
    'permissions.cameraRequiredTitle': 'Permission Required',
    'permissions.cameraRequiredMessage': 'Camera permission is required to take photos. Please enable it in your device settings.',
    
    // Navigation
    'nav.home': 'Home',
    'nav.scan': 'Diagnose',
    'nav.store': 'Store',
    'nav.cart': 'Cart',
    'nav.orders': 'Orders',
    'nav.admin': 'Admin',
    'nav.manage': 'Manage',
    'nav.manageUsers': 'Manage Users',
    'nav.manageUserOrders': 'Manage User Orders',
'nav.profile': 'Profile',

    // Account/Profile
    'account.title': 'Account',
    'account.profile': 'Profile',
    'account.forSaleContact': 'For sale contact us',
    'profile.masterControls': 'Master Controls',
    
    // Authentication
    'auth.signin': 'Sign In',
    'auth.signup': 'Sign Up',
    'auth.logout': 'Logout',
    'auth.number': 'Phone Number',
    'auth.password': 'Password',
    'auth.fullname': 'Full Name',
    'auth.confirmPassword': 'Confirm Password',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': "Already have an account?",
    'auth.fillFields': 'Please fill in all fields',
    'auth.passwordMismatch': 'Passwords do not match',
    'auth.loginSuccess': 'Login successful',
    'auth.signupSuccess': 'Account created successfully',
    'auth.loginError': 'Invalid credentials',
    'auth.signupError': 'Failed to create account',
    'auth.forgotPassword': 'Forgot Password?',
    'auth.forgotPasswordTitle': 'Reset Password',
    'auth.forgotPasswordDisclaimer': 'Since this app uses phone number authentication without email recovery, your existing account will need to be deleted.\n\nAfter deletion, you can create a new account using the same phone number with a new password.',
    'auth.forgotPasswordConfirm': 'Delete',
    'auth.accountDeleted': 'Account deleted. Please create a new account.',
    'auth.deleteError': 'Failed to delete account. Please try again.',
    
    // Home Screen
    'home.title': 'Agriismart',
    'home.subtitle': 'Faith of the Farmers - Plant Disease Detection',
    'home.welcome': 'Welcome',
    'home.recentScans': 'Recent Scans',
    'home.quickActions': 'Quick Actions',
    'home.scanPlant': 'Scan Plant',
    'home.browseStore': 'Browse Store',
    'home.viewOrders': 'View Orders',
    'home.noRecentScans': 'No recent scans',
'home.getStarted': 'Get started by scanning your first plant',

    // Home additions
    'home.weatherTitle': 'Weather',
    'home.cropDoctor': 'Crop Doctor',
    'home.manageCrops': 'Manage Crops',
    'home.selectCrops': 'Select Crops',
    'home.tapManage': 'Tap Manage to add crops from list',
    'home.noPests': 'No pests added.',
    'home.noDiseases': 'No diseases added.',
    'weather.enableLocation': 'Enable location to see local weather.',

    // Guide
    'guide.cultivationShort': 'Cultivation',
    'guide.cultivationTitle': 'Cultivation Guide',
'guide.pests': 'Pests',
    'guide.diseases': 'Diseases',
    'guide.description': 'Description',
    'guide.management': 'Management',
    'guide.images': 'Images',
    
    // Plant Analysis
    'scan.title': 'Plant Analysis',
    'scan.subtitle': 'AI-Powered Disease Detection',
    'scan.selectImage': 'Select Image',
    'scan.takePhoto': 'Take Photo',
    'scan.fromGallery': 'From Gallery',
    'scan.analyzing': 'Analyzing plant...',
    'scan.analysisComplete': 'Analysis Complete',
    'scan.recommendations': 'Recommendations',
    'scan.noImageSelected': 'Please select an image first',
    'scan.analysisError': 'Failed to analyze image',
    'scan.retryAnalysis': 'Retry Analysis',
    
    // Store
    'store.title': 'Agriismart Store',
    'store.subtitle': 'Faith of the Farmers - Agricultural Products',
    'store.search': 'Search products...',
    'store.searchResults': 'Search Results',
    'store.noProducts': 'No products found',
    'store.addToCart': 'Add to Cart',
    'store.outOfStock': 'Out of Stock',
    'store.inStock': 'In Stock',
    'store.price': 'Price',
    'store.stock': 'Stock',
    'store.addedToCart': 'Added to cart successfully',
    'store.addToCartError': 'Failed to add to cart',
    
    // Cart
'cart.title': 'Agriismart Cart',
'cart.subtitle': 'Faith of the Farmers - Your shopping cart',
'cart.empty': 'Your cart is empty',
    'cart.emptySubtext': 'Add some products to get started',
    'cart.total': 'Total',
    'cart.checkout': 'Checkout',
    'cart.clearCart': 'Clear Cart',
    'cart.removeItem': 'Remove Item',
    'cart.removeConfirm': 'Are you sure you want to remove this item from your cart?',
    'cart.clearConfirm': 'Are you sure you want to remove all items from your cart?',
    'cart.quantity': 'Quantity',
    'cart.each': 'each',
    
    // Address
    'address.title': 'Delivery Address',
    'address.required': 'Address Required',
    'address.enterAddress': 'Please enter your delivery address',
    'address.bookingAddress': 'Booking Address',
    'address.placeholder': 'Enter your complete delivery address...',
    'address.helper': 'Include house number, street name, area, landmark, city, and PIN code',
    'address.info': 'Please provide your complete delivery address for accurate delivery',
    'address.confirmAddress': 'Confirm Address',
    'address.changeAddress': 'Change Address',
    'address.saving': 'Saving...',
    'address.deliveryAddress': 'Delivery Address:',
    
    // Orders
    'orders.title': 'My Orders',
    'orders.subtitle': 'Faith of the Farmers - Track your orders',
    'orders.empty': 'No orders yet',
    'orders.emptySubtext': 'Your orders will appear here once you make a purchase',
    'orders.orderDetails': 'Order Details',
    'orders.orderInfo': 'Order Information',
    'orders.orderItems': 'Order Items',
    'orders.totalAmount': 'Total Amount',
    'orders.status': 'Status',
    'orders.payment': 'Payment',
    'orders.delivery': 'Est. Delivery',
    'orders.viewDetails': 'View Details',
    'orders.qty': 'Qty',
    
    // Payment
    'payment.title': 'Select Payment Method',
    'payment.cod': 'Cash on Delivery',
    'payment.codDesc': 'Pay when you receive',
    'payment.card': 'Credit/Debit Card',
    'payment.cardDesc': 'Coming Soon',
    'payment.upi': 'UPI Payment',
    'payment.upiDesc': 'Coming Soon',
    'payment.required': 'Please select a payment method.',
    'payment.comingSoon': 'payment is not available yet. Please use Cash on Delivery.',
    'payment.confirmOrder': 'Confirm Order',
    'payment.orderTotal': 'Order Total',
    
    // Order Success
    'order.placed': 'Order Placed Successfully!',
    'order.placedDesc': 'Your order #{orderId} has been placed and will be delivered soon. You can track your order in the Orders tab.',
    'order.error': 'Failed to place order. Please try again.',
    'order.loginRequired': 'Please login to place an order.',
    
    // Admin
    'admin.title': 'Agriismart Admin',
    'admin.subtitle': 'Faith of the Farmers - Manage Products',
    'admin.accessDenied': 'Access Denied',
    'admin.accessDeniedDesc': 'You need admin privileges to access this page',
    'admin.addProduct': 'Add Product',
    'admin.editProduct': 'Edit Product',
    'admin.deleteProduct': 'Delete Product',
    'admin.deleteConfirm': 'Are you sure you want to delete "{name}"?',
    'admin.productName': 'Product Name',
    'admin.plantUsed': 'Plant Used',
    'admin.keywords': 'Keywords',
    'admin.selectKeywords': 'Select Keywords *',
    'admin.productDetails': 'Product Details',
    'admin.stockAvailable': 'Stock Available',
    'admin.costPerUnit': 'Cost per Unit',
    'admin.addImage': 'Add Image',
    'admin.changeImage': 'Change Image',
    'admin.fillRequired': 'Please fill in all required fields and select at least one keyword',
    'admin.productAdded': 'Product added successfully',
    'admin.productUpdated': 'Product updated successfully',
    'admin.productDeleted': 'Product deleted successfully',
    'admin.addSampleProducts': 'Add Sample Products',
    'admin.manageKeywords': 'Manage Keywords',
    'admin.createAdmin': 'Create Admin',
    'admin.noKeywords': 'No keywords available. Use "Manage Keywords" to add some.',
    
    // Contact Us
    'contact.title': 'Contact Us',
    'contact.heading': "We're here to help",
    'contact.emailUs': 'Email Us',
    'contact.callUs': 'Call Us',
    'contact.website': 'www.kvkthiruvannamalai.com',
    'contact.whatsapp': 'WhatsApp',
    'contact.errorCall': 'Unable to open phone dialer.',
    'contact.errorWhatsApp': 'Unable to open WhatsApp.',
    'contact.errorEmail': 'Unable to open email app.',
    'contact.errorWebsite': 'Unable to open website.',

    // Profile
    'profile.memberSince': 'Member Since',

    // Language Settings
    'language.title': 'Language / மொழி',
    'language.english': 'English',
    'language.tamil': 'தமிழ்',
    'language.selectLanguage': 'Select Language',
'language.changed': 'Language changed successfully',
    'language.selectLanguageTitle': 'Select Language',
    
    // Status
    'status.pending': 'Pending',
    'status.confirmed': 'Confirmed',
    'status.processing': 'Processing',
'status.dispatched': 'Dispatched',
'status.cancelled': 'Cancelled',

    // Scanner / Analysis UI
    'scanner.headerTitle': 'Agriismart Scanner',
    'scanner.headerSubtitle': 'Faith of the Farmers - AI Plant Analysis',
    'scanner.plantName': 'Plant Name',
'scanner.placeholder': 'e.g., Tomato, Rose, Wheat',
    'scanner.selectFromMasters': 'Select plant (from Master)',
    'scanner.optionalNote': 'Optional note about the plant',
    'scanner.others': 'Others',
    'scanner.enterPlantName': 'Enter plant name',
    'scanner.useThisName': 'Use this name',
    'scanner.chooseSource': 'Choose Image Source',
    'scanner.takePhoto': 'Take Photo',
    'scanner.gallery': 'Gallery',
    'scanner.analyzeSave': 'Analyze & Save',
    'scanner.analyzing': 'Analyzing...',
    'scanner.success': 'Success',
    'scanner.successSaved': 'Plant analysis saved successfully!',
    'scanner.error': 'Error',
    'scanner.inputRequired': 'Please enter a plant name and select an image.',
    'scanner.loginRequired': 'You must be logged in to analyze plants.',
    'scanner.failed': 'Failed to analyze image. Please try again.',

    // PlantAnalysis component
    'analysis.diseaseOrPest': 'Disease / Pest:',
    'analysis.description': 'Description:',
'analysis.keywords': 'Keywords:',
    'analysis.severity': 'Severity:',

    // Products UI
    'products.loading': 'Loading products...',
    'products.empty': 'No products available',
    'products.emptySearch': 'No products found',
    'products.searchHint': 'Try searching with different keywords',
    'products.all': 'All',

    // ProductCard
    'product.plant': 'Plant',
    'product.selectQuantity': 'Select Quantity',
    'product.availableUnits': 'Available: {units} units',
    'product.total': 'Total',
    'cart.invalidQuantity': 'Please enter a valid quantity',
  },
  
  ta: {
    // Common
    'common.loading': 'ஏற்றுகிறது...',
    'common.error': 'பிழை',
'common.success': 'வெற்றி',
    'common.info': 'தகவல்',
    'common.cancel': 'ரத்து செய்',
    'common.confirm': 'உறுதிப்படுத்து',
    'common.save': 'சேமி',
    'common.delete': 'அழி',
    'common.edit': 'திருத்து',
    'common.add': 'சேர்',
    'common.update': 'புதுப்பி',
    'common.close': 'மூடு',
    'common.back': 'பின்',
    'common.next': 'அடுத்து',
    'common.done': 'முடிந்தது',

    // Permissions
    'permissions.cameraRequiredTitle': 'அனுமதி தேவையானது',
    'permissions.cameraRequiredMessage': 'புகைப்படங்கள் எடுக்க கேமரா அனுமதி தேவை. தயவு செய்து அமைப்புகளில் இயக்கவும்.',
    
    // Navigation
    'nav.home': 'முகப்பு',
    'nav.scan': 'பரிசோதி',
    'nav.store': 'கடை',
    'nav.cart': 'கார்ட்',
    'nav.orders': 'ஆர்டர்கள்',
    'nav.admin': 'நிர்வாகி',
    'nav.manage': 'நிர்வகி',
    'nav.manageUsers': 'பயனர்களை நிர்வகி',
    'nav.manageUserOrders': 'பயனர் ஆர்டர்களை நிர்வகி',
'nav.profile': 'சுயவிவரம்',

    // Account/Profile
    'account.title': 'அக்கௌன்ட்‌',
    'account.profile': 'சுயவிவரம்',
    'account.forSaleContact': 'விற்பனை தொடர்பு',
    'profile.masterControls': 'மாஸ்டர் கட்டுப்பாடுகள்',
    
    // Authentication
    'auth.signin': 'உள்நுழை',
    'auth.signup': 'பதிவு செய்',
    'auth.logout': 'வெளியேறு',
    'auth.number': 'தொலைபேசி எண்',
    'auth.password': 'கடவுச்சொல்',
    'auth.fullname': 'முழு பெயர்',
    'auth.confirmPassword': 'கடவுச்சொல்லை உறுதிப்படுத்தவும்',
    'auth.noAccount': "கணக்கு இல்லையா?",
    'auth.hasAccount': "ஏற்கனவே கணக்கு உண்டா?",
    'auth.fillFields': 'அனைத்து புலங்களையும் நிரப்பவும்',
    'auth.passwordMismatch': 'கடவுச்சொற்கள் பொருந்தவில்லை',
    'auth.loginSuccess': 'உள்நுழைவு வெற்றிகரமாக',
    'auth.signupSuccess': 'கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது',
    'auth.loginError': 'தவறான விவரங்கள்',
    'auth.signupError': 'கணக்கு உருவாக்க முடியவில்லை',
    'auth.forgotPassword': 'கடவுச்சொல் மறந்துவிட்டதா?',
    'auth.forgotPasswordTitle': 'கடவுச்சொல் மீட்டமை',
    'auth.forgotPasswordDisclaimer': 'இந்த செயலி மின்னஞ்சல் மீட்பு இல்லாமல் தொலைபேசி எண் அங்கீகாரத்தைப் பயன்படுத்துவதால், உங்கள் நிலவுள்ள கணக்கு நீக்கப்படும்.\n\nநீக்கிய பின், அதே தொலைபேசி எண்ணைப் பயன்படுத்தி புதிய கடவுச்சொல்லுடன் புதிய கணக்கை உருவாக்கலாம்.',
    'auth.forgotPasswordConfirm': 'நீக்கு',
    'auth.accountDeleted': 'கணக்கு நீக்கப்பட்டது. புதிய கணக்கை உருவாக்கவும்.',
    'auth.deleteError': 'கணக்கை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    
    // Home Screen
    'home.title': 'அக்ரிஸ்மார்ட்',
    'home.subtitle': 'விவசாயிகளின் நம்பிக்கை - தாவர நோய் கண்டறிதல்',
    'home.welcome': 'வரவேற்கிறோம்',
    'home.recentScans': 'சமீபத்திய ஸ்கேன்கள்',
    'home.quickActions': 'விரைவு செயல்கள்',
    'home.scanPlant': 'தாவரம் ஸ்கேன் செய்',
    'home.browseStore': 'கடையை உலாவவும்',
    'home.viewOrders': 'ஆர்டர்களைப் பார்க்கவும்',
    'home.noRecentScans': 'சமீபத்திய ஸ்கேன்கள் இல்லை',
'home.getStarted': 'உங்கள் முதல் தாவரத்தை ஸ்கேன் செய்வதன் மூலம் தொடங்கவும்',

    // Home additions
    'home.weatherTitle': 'வானிலை',
    'home.cropDoctor': 'பயிர் மருத்துவர்',
    'home.manageCrops': 'பயிர்களை நிர்வகிக்க',
    'home.selectCrops': 'பயிர்களைத் தேர்ந்தெடுக்கவும்',
    'home.tapManage': 'பட்டியலிலிருந்து பயிர்களைச் சேர்க்க நிர்வகி-ஐ தட்டவும்',
    'home.noPests': 'பூச்சிகள் சேர்க்கப்படவில்லை.',
    'home.noDiseases': 'நோய்கள் சேர்க்கப்படவில்லை.',
    'weather.enableLocation': 'உள்ளூர் வானிலையைப் பார்க்க இருப்பிடத்தை இயக்கவும்.',

    // Guide
    'guide.cultivationShort': 'வளர்ப்பு',
    'guide.cultivationTitle': 'வளர்ப்பு வழிகாட்டி',
'guide.pests': 'பூச்சிகள்',
    'guide.diseases': 'நோய்கள்',
    'guide.description': 'விளக்கம்',
    'guide.management': 'மேலாண்மை',
    'guide.images': 'படங்கள்',
    
    // Plant Analysis
    'scan.title': 'தாவர ஆய்வு',
    'scan.subtitle': 'AI-சக்தி கொண்ட நோய் கண்டறிதல்',
    'scan.selectImage': 'படம் தேர்ந்தெடு',
    'scan.takePhoto': 'புகைப்படம் எடு',
    'scan.fromGallery': 'கேலரியிலிருந்து',
    'scan.analyzing': 'தாவரத்தை ஆய்வு செய்கிறது...',
    'scan.analysisComplete': 'ஆய்வு முடிந்தது',
    'scan.recommendations': 'பரிந்துரைகள்',
    'scan.noImageSelected': 'முதலில் ஒரு படத்தைத் தேர்ந்தெடுக்கவும்',
    'scan.analysisError': 'படத்தை ஆய்வு செய்ய முடியவில்லை',
    'scan.retryAnalysis': 'ஆய்வை மீண்டும் முயற்சிக்கவும்',
    
    // Store
    'store.title': 'அக்ரிஸ்மார்ட் கடை',
    'store.subtitle': 'விவசாயிகளின் நம்பிக்கை - விவசாயப் பொருட்கள்',
    'store.search': 'பொருட்களைத் தேடவும்...',
    'store.searchResults': 'தேடல் முடிவுகள்',
    'store.noProducts': 'பொருட்கள் கிடைக்கவில்லை',
    'store.addToCart': 'கார்ட்டில் சேர்',
    'store.outOfStock': 'ஸ்டாக் இல்லை',
    'store.inStock': 'ஸ்டாக்கில் உள்ளது',
    'store.price': 'விலை',
    'store.stock': 'ஸ்டாக்',
    'store.addedToCart': 'கார்ட்டில் வெற்றிகரமாக சேர்க்கப்பட்டது',
    'store.addToCartError': 'கார்ட்டில் சேர்க்க முடியவில்லை',
    
    // Cart
'cart.title': 'அக்ரிஸ்மார்ட் கார்ட்',
'cart.subtitle': 'விவசாயிகளின் நம்பிக்கை - உங்கள் கார்ட்',
'cart.empty': 'உங்கள் கார்ட் காலியாக உள்ளது',
    'cart.emptySubtext': 'தொடங்க சில பொருட்களைச் சேர்க்கவும்',
    'cart.total': 'மொத்தம்',
    'cart.checkout': 'செக்அவுட்',
    'cart.clearCart': 'கார்ட்டை அழி',
    'cart.removeItem': 'பொருளை அகற்று',
    'cart.removeConfirm': 'இந்தப் பொருளை உங்கள் கார்ட்டிலிருந்து அகற்ற விரும்புகிறீர்களா?',
    'cart.clearConfirm': 'அனைத்துப் பொருட்களையும் உங்கள் கார்ட்டிலிருந்து அகற்ற விரும்புகிறீர்களா?',
    'cart.quantity': 'அளவு',
    'cart.each': 'ஒவ்வொன்றும்',
    
    // Address
    'address.title': 'டெலிவரி முகவரி',
    'address.required': 'முகவரி தேவை',
    'address.enterAddress': 'உங்கள் டெலிவரி முகவரியை உள்ளிடவும்',
    'address.bookingAddress': 'பதிப்பு முகவரி',
    'address.placeholder': 'உங்கள் முழு டெலிவரி முகவரியை உள்ளிடவும்...',
    'address.helper': 'வீட்டு எண், தெரு பெயர், பகுதி, அடல்ந்கம், நகரம், மற்றும் பின் குடக்காரம் அடகி',
    'address.info': 'துல்லியான டெலிவரிக்காக உங்கள் முழு டெலிவரி முகவரியை வழங்கங்காரம்',
    'address.confirmAddress': 'முகவரியை உறுதிப்படுத்தவும்',
    'address.changeAddress': 'முகவரியை மாற்றவும்',
    'address.saving': 'சேமிக்கிறது...',
    'address.deliveryAddress': 'டெலிவரி முகவரி:',
    
    // Orders
    'orders.title': 'எனது ஆர்டர்கள்',
    'orders.subtitle': 'விவசாயிகளின் நம்பிக்கை - உங்கள் ஆர்டர்களைத் தொடர்ந்து பின்தொடரவும்',
    'orders.empty': 'இன்னும் ஆர்டர்கள் இல்லை',
    'orders.emptySubtext': 'நீங்கள் வாங்கிய பிறகு உங்கள் ஆர்டர்கள் இங்கே தோன்றும்',
    'orders.orderDetails': 'ஆர்டர் விவரங்கள்',
    'orders.orderInfo': 'ஆர்டர் தகவல்',
    'orders.orderItems': 'ஆர்டர் பொருட்கள்',
    'orders.totalAmount': 'மொத்த தொகை',
    'orders.status': 'நிலை',
    'orders.payment': 'கட்டணம்',
    'orders.delivery': 'மதிப்பிடப்பட்ட டெலிவரி',
    'orders.viewDetails': 'விவரங்களைப் பார்க்கவும்',
    'orders.qty': 'அளவு',
    
    // Payment
    'payment.title': 'கட்டண முறையைத் தேர்ந்தெடுக்கவும்',
    'payment.cod': 'பணம் வாங்கும்போது கொடுக்க',
    'payment.codDesc': 'பொருள் கிடைக்கும்போது பணம் கொடுங்கள்',
    'payment.card': 'கிரெடிட்/டெபிட் கார்டு',
    'payment.cardDesc': 'விரைவில் வரும்',
    'payment.upi': 'UPI கட்டணம்',
    'payment.upiDesc': 'விரைவில் வரும்',
    'payment.required': 'கட்டண முறையைத் தேர்ந்தெடுக்கவும்.',
    'payment.comingSoon': 'கட்டணம் இன்னும் கிடைக்கவில்லை. பணம் வாங்கும்போது கொடுக்கும் முறையைப் பயன்படுத்தவும்.',
    'payment.confirmOrder': 'ஆர்டரை உறுதிப்படுத்தவும்',
    'payment.orderTotal': 'ஆர்டர் மொத்தம்',
    
    // Order Success
    'order.placed': 'ஆர்டர் வெற்றிகரமாக செய்யப்பட்டது!',
    'order.placedDesc': 'உங்கள் ஆர்டர் #{orderId} செய்யப்பட்டு விரைவில் வழங்கப்படும். ஆர்டர்கள் தாவலில் உங்கள் ஆர்டரைத் தொடர்ந்து பின்தொடரலாம்.',
    'order.error': 'ஆர்டர் செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
    'order.loginRequired': 'ஆர்டர் செய்ய உள்நுழையவும்.',
    
    // Admin
    'admin.title': 'அக்ரிஸ்மார்ட் நிர்வாகி',
    'admin.subtitle': 'விவசாயிகளின் நம்பிக்கை - பொருட்களை நிர்வகிக்கவும்',
    'admin.accessDenied': 'அணுகல் மறுக்கப்பட்டது',
    'admin.accessDeniedDesc': 'இந்தப் பக்கத்தை அணுக உங்களுக்கு நிர்வாக அதிகாரங்கள் தேவை',
    'admin.addProduct': 'பொருள் சேர்',
    'admin.editProduct': 'பொருளைத் திருத்து',
    'admin.deleteProduct': 'பொருளை அழி',
    'admin.deleteConfirm': '"{name}" ஐ அழிக்க விரும்புகிறீர்களா?',
    'admin.productName': 'பொருளின் பெயர்',
    'admin.plantUsed': 'பயன்படுத்தும் தாவரம்',
    'admin.keywords': 'முக்கிய வார்த்தைகள்',
    'admin.selectKeywords': 'முக்கிய வார்த்தைகளைத் தேர்ந்தெடுக்கவும் *',
    'admin.productDetails': 'பொருள் விவரங்கள்',
    'admin.stockAvailable': 'கிடைக்கும் ஸ்டாக்',
    'admin.costPerUnit': 'யூனிட் ஒன்றுக்கான விலை',
    'admin.addImage': 'படம் சேர்',
    'admin.changeImage': 'படத்தை மாற்று',
    'admin.fillRequired': 'தேவையான அனைத்து புலங்களையும் நிரப்பி குறைந்தது ஒரு முக்கிய வார்த்தையையாவது தேர்ந்தெடுக்கவும்',
    'admin.productAdded': 'பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது',
    'admin.productUpdated': 'பொருள் வெற்றிகரமாக புதுப்பிக்கப்பட்டது',
    'admin.productDeleted': 'பொருள் வெற்றிகரமாக அழிக்கப்பட்டது',
    'admin.addSampleProducts': 'மாதிரி பொருட்களைச் சேர்',
    'admin.manageKeywords': 'முக்கிய வார்த்தைகளை நிர்வகிக்கவும்',
    'admin.createAdmin': 'நிர்வாகியை உருவாக்கவும்',
    'admin.noKeywords': 'முக்கிய வார்த்தைகள் கிடைக்கவில்லை. சிலவற்றைச் சேர்க்க "முக்கிய வார்த்தைகளை நிர்வகிக்கவும்" பயன்படுத்தவும்.',
    
// Contact Us
    'contact.title': 'தொடர்பு கொள்க',
    'contact.heading': 'நாங்கள் உங்கள் உதவிக்கு இருக்கிறோம்',
    'contact.emailUs': 'மின்னஞ்சல் அனுப்பவும்',
    'contact.callUs': 'அழைக்கவும்',
    'contact.website': 'www.kvkthiruvannamalai.com',
    'contact.whatsapp': 'WhatsApp',
    'contact.errorCall': 'தொலைபேசி டையலைக்கர் திறக்க இயலவில்லை.',
    'contact.errorWhatsApp': 'WhatsApp திறக்க இயலவில்லை.',
    'contact.errorEmail': 'மின்னஞ்சல் பயன்பாட்டு திறக்க இயலவில்லை.',
    'contact.errorWebsite': 'இணையதளம் திறக்க இயலவில்லை.',

    // Profile
    'profile.memberSince': 'உறுப்பினராக இருந்து',

    // Language Settings
    'language.title': 'மொழி / Language',
    'language.english': 'English',
    'language.tamil': 'தமிழ்',
    'language.selectLanguage': 'மொழியைத் தேர்ந்தெடுக்கவும்',
'language.changed': 'மொழி வெற்றிகரமாக மாற்றப்பட்டது',
    'language.selectLanguageTitle': 'மொழியைத் தேர்ந்தெடுக்கவும்',
    
    // Status
    'status.pending': 'நிலுவையில்',
    'status.confirmed': 'உறுதிப்படுத்தப்பட்டது',
    'status.processing': 'செயலாக்கத்தில்',
'status.dispatched': 'அனுப்பப்பட்டது',
'status.cancelled': 'ரத்து செய்யப்பட்டது',

    // Scanner / Analysis UI
    'scanner.headerTitle': 'அக்ரிஸ்மார்ட் ஸ்கேனர்',
    'scanner.headerSubtitle': 'விவசாயிகளின் நம்பிக்கை - AI தாவர ஆய்வு',
    'scanner.plantName': 'தாவரத்தின் பெயர்',
'scanner.placeholder': 'உதா., தக்காளி, ரோஜா, கோதுமை',
    'scanner.selectFromMasters': 'மாஸ்டரில் இருந்து தாவரத்தைத் தேர்ந்தெடுக்கவும்',
    'scanner.optionalNote': 'தாவரத்துக்கான விருப்ப குறிப்பு',
    'scanner.others': 'மற்றவை',
    'scanner.enterPlantName': 'தாவரத்தின் பெயரை உள்ளிடவும்',
    'scanner.useThisName': 'இந்த பெயரைப் பயன்படுத்து',
    'scanner.chooseSource': 'பட மூலத்தைத் தேர்ந்தெடுக்கவும்',
    'scanner.takePhoto': 'புகைப்படம் எடு',
    'scanner.gallery': 'கேலரி',
    'scanner.analyzeSave': 'ஆய்வு செய்து சேமிக்கவும்',
    'scanner.analyzing': 'ஆய்வு செய்கிறது...',
    'scanner.success': 'வெற்றி',
    'scanner.successSaved': 'தாவர ஆய்வு வெற்றிகரமாக சேமிக்கப்பட்டது!',
    'scanner.error': 'பிழை',
    'scanner.inputRequired': 'தாவரப் பெயரை உள்ளிட்டு, படத்தைத் தேர்ந்தெடுக்கவும்.',
    'scanner.loginRequired': 'தாவரத்தை ஆய்வு செய்ய உள்நுழையவும்.',
    'scanner.failed': 'படத்தை ஆய்வு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',

    // PlantAnalysis component
    'analysis.diseaseOrPest': 'நோய் / பூச்சி:',
    'analysis.description': 'விளக்கம்:',
'analysis.keywords': 'முக்கிய வார்த்தைகள்:',
    'analysis.severity': 'தீவிரம்:',

    // Products UI
    'products.loading': 'பொருட்களை ஏற்றுகிறது...',
    'products.empty': 'பொருட்கள் இல்லை',
    'products.emptySearch': 'பொருட்கள் கிடைக்கவில்லை',
    'products.searchHint': 'வேறு முக்கிய வார்த்தைகளால் தேடிப் பார்க்கவும்',
    'products.all': 'அனைத்தும்',

    // ProductCard
    'product.plant': 'தாவரம்',
    'product.selectQuantity': 'அளவைத் தேர்ந்தெடுக்கவும்',
    'product.availableUnits': 'கிடைக்கும்: {units} அலகுகள்',
    'product.total': 'மொத்தம்',
    'cart.invalidQuantity': 'சரியான அளவை உள்ளிடவும்',
  }
};

const LANGUAGE_STORAGE_KEY = '@language';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('ta');

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  const loadStoredLanguage = async () => {
    try {
      const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'ta')) {
        setCurrentLanguage(storedLanguage as Language);
      } else {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, 'ta');
        setCurrentLanguage('ta');
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  };

  const setLanguage = async (language: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      setCurrentLanguage(language);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  const t = (key: string): string => {
    return translations[currentLanguage][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;