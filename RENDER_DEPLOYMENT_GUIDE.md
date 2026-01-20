# 🚀 Render Backend Deployment Guide

Complete guide to deploy your Express backend with JWT authentication on Render.

---

## 📋 Prerequisites

- Render account (free tier works fine)
- GitHub account (to connect your repository)
- Supabase PostgreSQL database (already set up)

---

## 🔧 Step 1: Prepare Your Backend for Deployment

### 1.1 Verify package.json

Your `server/package.json` should have:
```json
{
  "name": "agriismart-api-pg",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.12.0"
  }
}
```

✅ **Already configured!**

### 1.2 Push Changes to GitHub

```bash
# From your project root directory
git add .
git commit -m "Add JWT authentication with secure token storage"
git push origin main
```

---

## 🌐 Step 2: Deploy on Render

### 2.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your **agro-app** repository

### 2.2 Configure Web Service

**Basic Settings:**
- **Name**: `agro-app-backend` (or any name you prefer)
- **Region**: Choose closest to your users (e.g., Singapore for India)
- **Branch**: `main`
- **Root Directory**: `server`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Instance Type:**
- Select **Free** (sufficient for development/testing)
- Can upgrade to paid plans later for production

---

## 🔐 Step 3: Configure Environment Variables

This is **CRITICAL** for JWT authentication to work!

### 3.1 Generate JWT Secret

First, generate a strong random secret:

**Option A: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option B: Using PowerShell (on Windows)**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Option C: Using Online Generator**
- Visit: https://generate-random.org/api-token-generator
- Generate a 64+ character token

**Copy this secret!** You'll need it in the next step.

### 3.2 Add Environment Variables on Render

In your Render Web Service settings:

1. Scroll to **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Add the following variables:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres` | Your Supabase connection string |
| `JWT_SECRET` | `<your_generated_secret>` | **CRITICAL**: Use the secret you generated above |
| `PORT` | `3000` | Render will override this, but good to have |
| `NODE_ENV` | `production` | Optional but recommended |
| `RAZORPAY_KEY_ID` | `rzp_test_Ri17vuruxSmLSy` | From your .env |
| `RAZORPAY_KEY_SECRET` | `pjOplGDa7W1QbOX8HEF41C9C` | From your .env |
| `RAZORPAY_CALLBACK_URL` | `https://agro-app-6hlq.onrender.com/payments/razorpay/callback` | Update with your Render URL |
| `TEXTBELT_URL` | `https://textbelt.com/text` | Optional: For SMS OTP |
| `TEXTBELT_KEY` | `textbelt` | Optional: For SMS OTP |

**⚠️ SECURITY NOTE:**
- Never commit `JWT_SECRET` to your repository
- Each environment (dev, staging, prod) should use different secrets
- Rotate secrets periodically (every 3-6 months)

### 3.3 Get Your DATABASE_URL

From your Supabase dashboard:
1. Go to **Project Settings** → **Database**
2. Scroll to **Connection String** → **URI**
3. Copy the connection pooler URL (with `pooler.supabase.com`)
4. Replace `[YOUR-PASSWORD]` with your actual database password

Example:
```
postgresql://postgres.rmmrxjkavdbpdciyrnmz:Agriii@123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
```

---

## 🚀 Step 4: Deploy

1. Click **"Create Web Service"** or **"Deploy"**
2. Wait for deployment (usually 2-5 minutes)
3. Render will:
   - Clone your repository
   - Run `npm install` in the `server` directory
   - Start your app with `npm start`

### 4.1 Monitor Deployment

Watch the **Logs** tab for:
- ✅ `npm install` success
- ✅ Server starting on port
- ✅ Database migrations complete
- ✅ "Startup migration warning" is OK (means tables already exist)

**Successful deployment log:**
```
Starting service...
> agriismart-api-pg@1.0.0 start
> node index.js

Server listening on port 10000
```

---

## 🔍 Step 5: Test Your Backend

### 5.1 Get Your Backend URL

Your Render URL will be something like:
```
https://agro-app-backend.onrender.com
```

Or:
```
https://agro-app-backend-xyz123.onrender.com
```

Find it at the top of your Render dashboard.

### 5.2 Test Health Endpoint

```bash
# Using curl
curl https://your-backend-url.onrender.com/health

# Expected response:
{"ok":true}
```

**Using browser:**
Just visit: `https://your-backend-url.onrender.com/health`

### 5.3 Test Authentication (Optional)

**Test Signup:**
```bash
curl -X POST https://your-backend-url.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "number": "9876543210",
    "password": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
    "full_name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "user": {
    "id": 1,
    "number": "9876543210",
    "full_name": "Test User",
    "is_admin": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 📱 Step 6: Update React Native App

### 6.1 Update .env File

Update your `.env` file in the project root:

```env
# Replace with your new Render URL
EXPO_PUBLIC_API_URL="https://your-backend-url.onrender.com"

# Keep other variables
EXPO_PUBLIC_SUPABASE_URL="https://rmmrxjkavdbpdciyrnmz.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_Au5eLJcglP4C9xHGWNWmiw_KlxnWuAU"
EXPO_PUBLIC_GEMINI_API_KEY="AIzaSyAGzkF3Tj-V3LooUs4aYB-U3z6IxOjVOtU"
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME="agro-app"
EXPO_PUBLIC_CLOUDINARY_PRESET="unsigned_preset"
EXPO_PUBLIC_SUPPORT_NUMBER=1234567890
```

### 6.2 Rebuild Your App

```bash
# Clear cache and rebuild
npm start -- --clear

# Or for Android:
npx expo run:android
```

---

## 🐛 Troubleshooting

### Issue: Deployment Fails with "Module not found"

**Solution:**
1. Check `server/package.json` includes all dependencies
2. Verify Root Directory is set to `server` in Render
3. Check Build Command is `npm install`

### Issue: "JWT_SECRET not set" or Token Errors

**Solution:**
1. Verify `JWT_SECRET` is added in Render Environment Variables
2. Redeploy the service after adding the variable
3. Check logs for "JWT_SECRET" related errors

### Issue: Database Connection Errors

**Solution:**
1. Check `DATABASE_URL` is correctly set
2. Ensure it's the **pooler** URL (has `pooler.supabase.com`)
3. Verify password is correct (no URL encoding issues)
4. Check Supabase database is running and accessible

### Issue: "Cold Start" - First Request is Slow

**Solution:**
This is normal on Render free tier:
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Upgrade to paid plan for always-on service

### Issue: CORS Errors in App

**Solution:**
Backend already has CORS enabled, but if issues persist:
1. Check Render logs for CORS errors
2. Verify API_URL in .env matches Render URL exactly
3. Ensure no trailing slash in API_URL

---

## 🔄 Step 7: Continuous Deployment (Auto-Deploy)

By default, Render automatically deploys when you push to GitHub!

**Workflow:**
```bash
# Make changes to your code
git add .
git commit -m "Update authentication logic"
git push origin main
```

Render will:
1. Detect the push
2. Automatically rebuild and redeploy
3. Usually takes 2-5 minutes

**To disable auto-deploy:**
- Go to Render dashboard → Settings
- Turn off "Auto-Deploy"

---

## 📊 Monitoring Your Backend

### View Logs

In Render dashboard:
1. Click on your web service
2. Go to **"Logs"** tab
3. See real-time logs of your backend

**Useful for:**
- Debugging errors
- Monitoring requests
- Checking JWT token generation

### Metrics

In Render dashboard:
1. Go to **"Metrics"** tab
2. See:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## 💰 Render Pricing

### Free Tier
- ✅ Perfect for development/testing
- ✅ 750 hours/month (enough for 1 service)
- ⚠️ Spins down after 15 minutes inactivity
- ⚠️ First request after spin-down is slow (30-60s)

### Starter Plan ($7/month)
- ✅ Always on (no spin down)
- ✅ Faster performance
- ✅ Custom domains
- ✅ Good for production

### Professional Plan ($25/month)
- ✅ Better performance
- ✅ Advanced features
- ✅ Priority support

---

## 🔐 Security Best Practices

1. **Rotate JWT Secret Regularly**
   - Update `JWT_SECRET` every 3-6 months
   - This will log out all users

2. **Monitor Logs**
   - Check for suspicious login attempts
   - Monitor failed authentication requests

3. **Rate Limiting** (Future Enhancement)
   - Add rate limiting to prevent brute force attacks
   - Use `express-rate-limit` package

4. **HTTPS Only**
   - Render provides HTTPS by default ✅
   - Never expose HTTP endpoints

5. **Database Security**
   - Keep Supabase credentials secure
   - Use strong database passwords
   - Enable Row Level Security in Supabase

---

## 📝 Quick Reference

### Render URLs

**Dashboard:**
```
https://dashboard.render.com/
```

**Your Backend URL (example):**
```
https://agro-app-6hlq.onrender.com
```

### Important Environment Variables

```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your_secure_secret_here
PORT=3000
NODE_ENV=production
```

### Useful Commands

**View Logs:**
- Go to Render dashboard → Logs tab

**Manual Deploy:**
- Render dashboard → Manual Deploy button

**Restart Service:**
- Render dashboard → Settings → Restart

---

## ✅ Deployment Checklist

Before going live:

- [ ] Backend deployed on Render
- [ ] All environment variables configured
- [ ] JWT_SECRET set to a strong random value
- [ ] DATABASE_URL points to Supabase
- [ ] Health endpoint returns `{"ok":true}`
- [ ] Test login/signup endpoints
- [ ] Updated EXPO_PUBLIC_API_URL in React Native app
- [ ] Rebuilt React Native app
- [ ] Tested login persistence on Android
- [ ] Checked Render logs for errors
- [ ] Verified auto-deploy is working

---

## 🎉 You're Done!

Your backend is now live on Render with:
- ✅ JWT token-based authentication
- ✅ Secure token storage
- ✅ Auto-refresh capabilities
- ✅ Production-ready security
- ✅ Automatic deployments from GitHub

**Next Steps:**
1. Test the complete login flow on Android
2. Verify tokens are being stored and refreshed
3. Monitor Render logs for any issues
4. Consider upgrading to paid plan for production

---

## 📞 Need Help?

**Render Support:**
- Documentation: https://render.com/docs
- Community: https://community.render.com/

**Backend Issues:**
- Check Render logs first
- Verify environment variables
- Test endpoints with curl/Postman

**JWT Issues:**
- Ensure JWT_SECRET is set
- Check token expiration times
- Verify token format in Authorization header
