# Admin Account Setup

## Default Admin Credentials

The app automatically creates a default admin account with the following credentials:

- **Phone Number**: `1234567890`
- **Password**: `admin123`
- **Name**: `Admin User`

## How to Access Admin Features

1. **Login with Admin Credentials**: Use the above credentials to log in to the app
2. **Access Admin Dashboard**: Navigate to the "Admin" tab in the bottom navigation
3. **Manage Products**: Add, edit, or delete products from the admin dashboard
4. **Add Sample Products**: Use the "Add Sample Products" button to populate the database with test data

## Admin Features

- ✅ **Product Management**: Full CRUD operations for products
- ✅ **Image Upload**: Add product images using device camera/gallery
- ✅ **Stock Management**: Set and update product stock levels
- ✅ **Pricing Control**: Set product prices per unit
- ✅ **Sample Data**: Quick setup with pre-defined sample products

## Creating Additional Admin Accounts

Currently, admin accounts must be created through the database directly or by modifying the `createDefaultAdmin` function in `/lib/createAdmin.ts`.

## Security Notes

- The default admin account is created automatically for development/testing purposes
- In production, consider implementing proper admin account creation workflows
- Admin privileges are checked using the `is_admin` field in the users table

## Troubleshooting

If you can't access the admin dashboard:

1. Make sure you're logged in with the admin credentials
2. Check that the `is_admin` field is set to `1` in the database
3. Use the "Create Admin Account" button in the admin dashboard to recreate the account
