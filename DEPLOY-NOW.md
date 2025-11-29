# 🚀 One-Click Backend Deployment

## Click This Link to Deploy

👉 **[Deploy Backend to Render](https://render.com/deploy?repo=https://github.com/snarky1980/tetrix-plus-prototype)**

## What Will Happen

1. You'll be asked to authorize Render with your GitHub account
2. Render will automatically:
   - Create a PostgreSQL database (free tier)
   - Create a Web Service for the backend
   - Set up all environment variables
   - Run the first deployment
3. After 2-5 minutes, you'll get a URL like: `https://tetrix-plus-backend-xxxx.onrender.com`

## After Deployment Completes

Copy your backend URL from Render and run this in your terminal:

```bash
# Replace YOUR_BACKEND_URL with the actual URL from Render
echo "VITE_API_URL=YOUR_BACKEND_URL/api" > /Users/jean-sebastienkennedy/tetrix-plus-prototype/frontend/.env.production

# Commit and push
cd /Users/jean-sebastienkennedy/tetrix-plus-prototype
git add frontend/.env.production
git commit -m "Set production backend URL"
git push
```

## OR: Let Me Know Your Backend URL

Once Render shows your backend URL, just paste it here and I'll update everything and push automatically.

---

## Alternative: Manual 3-Step Process

If the one-click link doesn't work:

### Step 1: Create Render Account
Go to https://render.com and click **Get Started** → Sign in with GitHub

### Step 2: Create Web Service
1. Click **New +** → **Web Service**
2. Select repository: `snarky1980/tetrix-plus-prototype`
3. Click **Connect**
4. Fill in:
   - **Name**: `tetrix-plus-backend`
   - **Build Command**: `cd backend && npm ci && npx prisma generate && npm run build`
   - **Start Command**: `cd backend && npx prisma migrate deploy && npm start`
5. Click **Create Web Service**

### Step 3: Create Database
1. Click **New +** → **PostgreSQL**
2. Name: `tetrix-plus-db`
3. Click **Create Database**
4. Copy the **External Database URL**
5. Go back to your web service → **Environment** → Add variable:
   - Key: `DATABASE_URL`
   - Value: paste the database URL
6. Add other variables:
   ```
   JWT_SECRET = <click "Generate" button>
   NODE_ENV = production
   PORT = 3001
   FRONTEND_URL = https://snarky1980.github.io
   ```
7. Save changes (will trigger redeploy)

---

**Just tell me when you have the backend URL and I'll handle the rest!**
