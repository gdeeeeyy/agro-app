# 🚀 Render Setup - Quick Start Checklist

Follow these steps in order to deploy your backend on Render.

---

## ✅ Step-by-Step Setup

### 1️⃣ Generate JWT Secret

**Your Secure JWT Secret (Generated):**
```
d1c092e0b2eb564bb6a0b3166f22447a8737d512476f5b28d2684e935da990df848ec25f04c93cad05d4b425741960746fb0f9385b46a25320edacf3d27d68ed
```

**⚠️ Copy this secret NOW!** You'll need it in Step 3.

---

### 2️⃣ Push to GitHub

```bash
# In your project directory
git add .
git commit -m "Add JWT authentication with secure token storage"
git push origin main
```

---

### 3️⃣ Create Web Service on Render

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo
4. Select **agro-app** repository

**Configure:**
- **Name**: `agro-app-backend`
- **Region**: Singapore (closest to India)
- **Branch**: `main`
- **Root Directory**: `server` ⚠️ IMPORTANT
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Instance Type**: Free

---

### 4️⃣ Add Environment Variables

Click **"Add Environment Variable"** and add these ONE BY ONE:

#### Required Variables:

**1. DATABASE_URL**
```
postgresql://postgres.rmmrxjkavdbpdciyrnmz:Agriii@123@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
```
*(Already in your .env - copy from there)*

**2. JWT_SECRET** ⚠️ MOST IMPORTANT
```
d1c092e0b2eb564bb6a0b3166f22447a8737d512476f5b28d2684e935da990df848ec25f04c93cad05d4b425741960746fb0f9385b46a25320edacf3d27d68ed
```
*(Use the secret from Step 1 above)*

**3. PORT**
```
3000
```

**4. NODE_ENV**
```
production
```

#### Optional Variables (from your .env):

**5. RAZORPAY_KEY_ID**
```
rzp_test_Ri17vuruxSmLSy
```

**6. RAZORPAY_KEY_SECRET**
```
pjOplGDa7W1QbOX8HEF41C9C
```

**7. TEXTBELT_URL**
```
https://textbelt.com/text
```

**8. TEXTBELT_KEY**
```
textbelt
```

---

### 5️⃣ Deploy

Click **"Create Web Service"**

Wait 2-5 minutes for deployment.

---

### 6️⃣ Test Backend

Once deployed, you'll get a URL like:
```
https://agro-app-backend-xyz123.onrender.com
```

**Test it:**
1. Copy your Render URL
2. Visit: `https://your-url.onrender.com/health`
3. Should see: `{"ok":true}`

---

### 7️⃣ Update React Native App

Edit `.env` file in project root:

```env
# REPLACE THIS with your Render URL
EXPO_PUBLIC_API_URL="https://your-backend-url.onrender.com"

# Keep these unchanged
EXPO_PUBLIC_SUPABASE_URL="https://rmmrxjkavdbpdciyrnmz.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_Au5eLJcglP4C9xHGWNWmiw_KlxnWuAU"
EXPO_PUBLIC_GEMINI_API_KEY="AIzaSyAGzkF3Tj-V3LooUs4aYB-U3z6IxOjVOtU"
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME="agro-app"
EXPO_PUBLIC_CLOUDINARY_PRESET="unsigned_preset"
EXPO_PUBLIC_SUPPORT_NUMBER=1234567890
```

---

### 8️⃣ Rebuild and Test App

```bash
# Clear cache and start
npm start -- --clear

# Or build for Android
npx expo run:android
```

**Test Login:**
1. Login to the app
2. Close app completely
3. Reopen app
4. ✅ Should auto-login!

---

## 🎯 Quick Verification

### Backend Health Check
```bash
# Replace with your actual URL
curl https://your-backend-url.onrender.com/health
```
✅ Expected: `{"ok":true}`

### Test Authentication
```bash
# Replace with your actual URL
curl -X POST https://your-backend-url.onrender.com/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"number":"9999999999","password":"test123hash","full_name":"Test User"}'
```
✅ Expected: JSON with `user`, `token`, and `refreshToken`

---

## 🚨 Common Issues

### Issue: Can't find service after deployment
**Fix:** Refresh Render dashboard page

### Issue: Build fails
**Fix:** Check Root Directory is set to `server`

### Issue: Token errors in app
**Fix:** Verify JWT_SECRET is added in Render

### Issue: Database errors
**Fix:** Check DATABASE_URL is correct (with password)

### Issue: App can't connect
**Fix:** Update EXPO_PUBLIC_API_URL in .env and rebuild app

---

## 📋 Environment Variables Summary

Copy-paste this into Render:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Supabase connection string |
| `JWT_SECRET` | `d1c092e0b2eb564bb6a0b3166f22447a8737d512476f5b28d2684e935da990df848ec25f04c93cad05d4b425741960746fb0f9385b46a25320edacf3d27d68ed` |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `RAZORPAY_KEY_ID` | `rzp_test_Ri17vuruxSmLSy` |
| `RAZORPAY_KEY_SECRET` | `pjOplGDa7W1QbOX8HEF41C9C` |
| `TEXTBELT_URL` | `https://textbelt.com/text` |
| `TEXTBELT_KEY` | `textbelt` |

---

## ✅ Final Checklist

- [ ] Pushed code to GitHub
- [ ] Created Render Web Service
- [ ] Set Root Directory to `server`
- [ ] Added all environment variables
- [ ] **Added JWT_SECRET** (most important!)
- [ ] Deployment successful
- [ ] Health endpoint works
- [ ] Updated .env in React Native app
- [ ] Rebuilt React Native app
- [ ] Tested login persistence

---

## 🎉 Done!

Your backend is now live with JWT authentication!

**What's working:**
- ✅ Secure login with JWT tokens
- ✅ Auto-refresh expired tokens
- ✅ Session persistence on Android
- ✅ Hardware-encrypted token storage

**Need help?** Check `RENDER_DEPLOYMENT_GUIDE.md` for detailed troubleshooting.
