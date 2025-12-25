# Vercel Deployment Guide for Saarthi Frontend

## Prerequisites
1. Vercel account (sign up at https://vercel.com)
2. GitHub/GitLab/Bitbucket repository with your code
3. Backend API URL (where your FastAPI backend is hosted)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New Project"

2. **Import Your Repository**
   - Connect your Git provider (GitHub/GitLab/Bitbucket)
   - Select the repository containing this project
   - **Important**: Set the root directory to `frontend`

3. **Configure Project Settings**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Set Environment Variables**
   Add these in the Vercel dashboard under "Environment Variables":
   
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-api-url.com
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   
   **Important**: 
   - Replace `https://your-backend-api-url.com` with your actual backend API URL
   - Make sure to add these for all environments (Production, Preview, Development)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `saarthi-shahkavish.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Yes**
   - Which scope? Select your account
   - Link to existing project? **No** (first time) or **Yes** (subsequent)
   - Project name: `saarthi-shahkavish` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings? **No**

5. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_API_URL
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```
   
   Enter the values when prompted.

6. **Redeploy with Environment Variables**
   ```bash
   vercel --prod
   ```

## Custom Domain Setup

To use `saarthi-shahkavish.vercel.app`:

1. Go to your project in Vercel dashboard
2. Navigate to "Settings" → "Domains"
3. Add your custom domain or use the default Vercel domain
4. The default domain will be: `your-project-name.vercel.app`

## Environment Variables Required

Make sure these are set in Vercel:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://api.saarthi.com` or `http://localhost:8000` (dev) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is compatible (Vercel uses Node 18+ by default)
- Check build logs in Vercel dashboard

### API Calls Fail
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Ensure backend CORS allows your Vercel domain
- Check browser console for CORS errors

### Supabase Errors
- Verify Supabase environment variables are set
- Check Supabase project is active
- Ensure redirect URLs are configured in Supabase dashboard

## Post-Deployment Checklist

- [ ] Environment variables are set
- [ ] Backend API is accessible from Vercel
- [ ] CORS is configured on backend to allow Vercel domain
- [ ] Supabase redirect URLs include your Vercel domain
- [ ] Test login/signup flow
- [ ] Test all major features (chat, quiz, flashcards, etc.)

## Updating Deployment

After making changes:

1. **Via Git**: Push to your repository, Vercel will auto-deploy
2. **Via CLI**: Run `vercel --prod` from the frontend directory

## Support

For issues:
- Check Vercel deployment logs
- Check browser console for errors
- Verify all environment variables are set
- Ensure backend is running and accessible

