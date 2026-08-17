# Vercel Deployment Guide - Gharmitra

## Quick Deploy Steps

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gharmitra.git
git push -u origin main
```

### Step 2: Connect to Vercel
1. Go to https://vercel.com and sign up / log in
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the settings from `vercel.json` - just click "Deploy"

### Step 3: Wait for Build
- Vercel will run `npm run build:web` (Expo web export)
- Build output goes to `dist/` folder
- Your site will be live at `https://gharmitra.vercel.app` (or similar)

## What's Already Configured

### vercel.json
- **Build command**: `npm run build:web`
- **Output directory**: `dist`
- **SPA routing**: All routes fall back to `index.html` (Expo Router handles client-side routing)
- **Environment variables**: Supabase URL and anon key are baked in at build time
- **Caching**: Static assets get 1-year cache headers

### .vercelignore
Excludes `node_modules`, `.expo`, `.env`, `.git`, etc. from deployment.

## Environment Variables

The Supabase credentials are already set in `vercel.json` under `build.env`. They get embedded into the JavaScript bundle during build (Expo's `EXPO_PUBLIC_` prefix pattern).

If you ever need to change them, update the values in `vercel.json` or set them in Vercel's dashboard under Project Settings > Environment Variables.

## Custom Domain

1. Go to your project on Vercel
2. Settings > Domains
3. Add your custom domain (e.g., `gharmitra.com`)
4. Update your DNS records as Vercel instructs

## Important Notes

- The app uses Supabase (already provisioned) for all data - no additional backend needed
- All routing is client-side (SPA) - Vercel's rewrite rules handle this
- The old standalone `admin.html` file has been removed - admin portal is now part of the Expo app at `/admin`
- Build time: ~2-3 minutes on Vercel

## Troubleshooting

### Blank page after deploy
- Check browser console for errors
- Verify environment variables are set (check `vercel.json`)
- Make sure the build succeeded in Vercel dashboard

### Routes not working (404)
- The `rewrites` in `vercel.json` should handle this - all paths go to `index.html`
- If issues persist, verify `vercel.json` was deployed correctly

### Supabase connection errors
- Verify Supabase project is not paused (check Supabase dashboard)
- Check that the URL and key in `vercel.json` match your `.env` file
