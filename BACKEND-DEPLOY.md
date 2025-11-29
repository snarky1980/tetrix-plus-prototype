# Backend Deployment Instructions

## Step 1: Create Render Web Service

1. Go to https://render.com and sign in with GitHub
2. Click **New +** → **Web Service**
3. Connect this repository: `snarky1980/tetrix-plus-prototype`
4. Configure the service:

   **Name**: `tetrix-plus-backend` (or your choice)
   
   **Region**: Oregon (US West) or closest to your users
   
   **Branch**: `main`
   
   **Root Directory**: Leave blank (we use `cd backend` in commands)
   
   **Runtime**: Node
   
   **Build Command**:
   ```
   cd backend && npm ci && npx prisma generate && npm run build
   ```
   
   **Start Command**:
   ```
   cd backend && npx prisma migrate deploy && npm start
   ```
   
   **Plan**: Free (or Starter for production)

5. **Environment Variables** - Add these in the Render dashboard:
   ```
   DATABASE_URL       = <your-postgres-connection-string>
   JWT_SECRET         = <generate-random-secret>
   NODE_ENV           = production
   PORT               = 3001
   FRONTEND_URL       = https://snarky1980.github.io
   ```

   **Database setup**:
   - If you don't have PostgreSQL, create a free PostgreSQL database on Render:
     - Click **New +** → **PostgreSQL**
     - Copy the **External Database URL**
     - Paste it as `DATABASE_URL` in your web service env vars

6. Click **Create Web Service**

7. Wait for the first deploy to complete (~2-5 minutes)

8. Copy your backend URL from the dashboard (example: `https://tetrix-plus-backend.onrender.com`)

## Step 2: Configure Frontend to Use Backend URL

Edit `frontend/.env.production` and replace the placeholder:

```env
VITE_API_URL=https://tetrix-plus-backend.onrender.com/api
```

(Replace with your actual Render service URL)

## Step 3: Commit and Push

```bash
git add frontend/.env.production
git commit -m "Configure VITE_API_URL for production backend"
git push
```

This will trigger the GitHub Pages workflow and redeploy the frontend with the correct API endpoint.

## Step 4: Verify Deployment

1. Wait for GitHub Actions to complete (check Actions tab)
2. Visit: `https://snarky1980.github.io/tetrix-plus-prototype/connexion`
3. Log in with seed credentials:
   - Admin: `admin@tetrix.com` / password from seed
   - Conseiller: `conseiller@tetrix.com` / password from seed
   - Traducteur: `traducteur@tetrix.com` / password from seed

## Optional: Auto-Deploy on Backend Changes

To trigger Render deploys from GitHub Actions:

1. In Render dashboard, go to your web service → **Settings** → **Deploy Hook**
2. Copy the deploy hook URL
3. In GitHub: **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK_URL`
   - Value: paste the hook URL
4. Now every push to `backend/**` will trigger a Render redeploy via `.github/workflows/deploy-backend.yml`

## Troubleshooting

- **Build fails**: Check Render logs; ensure `DATABASE_URL` is set
- **Migration fails**: Render's free tier DB may be slow; retry deploy
- **Frontend can't reach API**: Check CORS - `FRONTEND_URL` must match Pages origin
- **401 errors**: Verify `JWT_SECRET` is set on backend

---

See `DEPLOYMENT.md` for more deployment strategies and `README.md` for local dev setup.
