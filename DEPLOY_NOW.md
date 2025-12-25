# Quick Vercel Deployment Guide

## ✅ Build Status: READY
The frontend builds successfully and is ready for deployment.

## 🚀 Quick Deploy (Choose One Method)

### Method 1: Vercel Dashboard (Easiest)

1. **Go to**: https://vercel.com/new
2. **Import Git Repository**: Connect your GitHub/GitLab/Bitbucket repo
3. **Configure Project**:
   - **Root Directory**: Set to `frontend`
   - **Framework**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)

4. **Add Environment Variables** (Click "Environment Variables"):
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.com
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
   ```

5. **Deploy**: Click "Deploy"
6. **Set Custom Domain**: After deployment, go to Settings → Domains and add `saarthi-shahkavish.vercel.app`

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Login
vercel login

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

## 📋 Required Environment Variables

Make sure to set these in Vercel:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Your backend API URL (e.g., `https://api.saarthi.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Your Supabase anonymous key |

## 🔧 Important Notes

1. **Root Directory**: Make sure to set root directory to `frontend` in Vercel settings
2. **Backend CORS**: Ensure your backend allows requests from `*.vercel.app` domains
3. **Supabase Redirects**: Add your Vercel URL to Supabase redirect URLs

## ✅ Post-Deployment Checklist

- [ ] Environment variables are set
- [ ] Site is accessible at `saarthi-shahkavish.vercel.app`
- [ ] Login/Signup works
- [ ] API calls work (check browser console)
- [ ] All features tested

## 🐛 Troubleshooting

**Build fails?**
- Check Vercel build logs
- Ensure root directory is set to `frontend`

**API calls fail?**
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check backend CORS settings
- Check browser console for errors

**Supabase errors?**
- Verify environment variables are set
- Check Supabase redirect URLs include Vercel domain

## 📞 Need Help?

Check the detailed guide in `VERCEL_DEPLOYMENT.md`

