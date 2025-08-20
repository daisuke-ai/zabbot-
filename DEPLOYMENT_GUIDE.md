# 🚀 ZABBOT Deployment Guide

This guide shows you how to deploy your ZABBOT project for **FREE** using the streamlined architecture.

## 📋 Overview

**Recommended Architecture:**
- **Frontend**: Vercel (React/Vite app)
- **Backend**: Railway or Render (Unified Node.js server)
- **Database**: Supabase (already configured)

## 🏗️ Step 1: Prepare Your Project

### 1.1 Use the Unified Backend Server
Your project now has a unified server at `src/backend/unified-server.js` that combines both your original servers.

**Important:** You need to copy your actual implementation from `server.js` and `dbAssistantServer.js` into `unified-server.js`. The current file is a template.

### 1.2 Update Frontend Environment Variables

**For Vercel (Frontend):**
```bash
VITE_API_URL=https://your-backend-url.railway.app
VITE_DB_ASSISTANT_URL=https://your-backend-url.railway.app
```

## 🖥️ Step 2: Deploy Backend (Choose One)

### Option A: Railway (Recommended)

1. **Sign up at [Railway.app](https://railway.app/)**
2. **Connect your GitHub repository**
3. **Set environment variables in Railway dashboard:**
   ```
   NODE_ENV=production
   PORT=3001
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```
4. **Deploy using the included `railway.toml` configuration**

### Option B: Render

1. **Sign up at [Render.com](https://render.com/)**
2. **Connect your GitHub repository**
3. **Use the included `render.yaml` configuration**
4. **Set the same environment variables as above**

## 🌐 Step 3: Deploy Frontend (Vercel)

1. **Sign up at [Vercel.com](https://vercel.com/)**
2. **Connect your GitHub repository**
3. **Vercel will automatically detect the Vite configuration**
4. **Set environment variables in Vercel dashboard:**
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   VITE_DB_ASSISTANT_URL=https://your-backend-url.railway.app
   ```
5. **Deploy!**

## 🔧 Step 4: Configure CORS

Update the `allowedOrigins` in your `unified-server.js` with your actual Vercel domain:

```javascript
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [
      'https://your-actual-frontend-domain.vercel.app',
      frontendUrl
    ]
  : ['http://localhost:5173', 'http://localhost:3000'];
```

## 🎯 Step 5: Test Your Deployment

1. **Backend Health Check**: Visit `https://your-backend-url/health`
2. **Frontend**: Visit your Vercel URL
3. **API Integration**: Test chat functionality

## 🔧 Environment Variables Reference

### Frontend (.env.local in Vercel)
```bash
VITE_API_URL=https://your-backend-url.railway.app
VITE_DB_ASSISTANT_URL=https://your-backend-url.railway.app
```

### Backend (Railway/Render)
```bash
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Optional
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
CONTENTFUL_SPACE_ID=your_contentful_space_id
CONTENTFUL_ACCESS_TOKEN=your_contentful_access_token
```

## ⚡ Quick Start Commands

### Local Development with Unified Server
```bash
cd src/backend
npm run dev:unified
```

### Production Test
```bash
cd src/backend
npm run start:production
```

## 🆘 Troubleshooting

### Common Issues:

1. **CORS Errors**: Update `allowedOrigins` in unified-server.js
2. **API Not Found**: Check environment variables are set correctly
3. **Build Failures**: Ensure all dependencies are in package.json
4. **Timeout Issues**: Railway/Render have better timeout limits than Vercel for AI operations

### Migration from Dual Servers:

1. Copy your `handleQuery` function from `server.js` to `unified-server.js`
2. Copy your `getDatabaseAssistantResponse` function from `dbAssistantServer.js`
3. Copy any other custom functions and routes
4. Update import statements as needed

## 💡 Benefits of This Architecture

- ✅ **Free hosting** for both frontend and backend
- ✅ **Better performance** for AI operations
- ✅ **Simplified deployment** - one backend instead of two
- ✅ **Automatic scaling** on both platforms
- ✅ **Easy environment management**

## 🔄 Alternative: All-Vercel Deployment

If you prefer to keep everything on Vercel:

1. Use the API routes approach in `pages/api/` or `api/` directory
2. Handle timeout issues with background processing
3. Consider upgrading to Vercel Pro for better limits

Need help? Check the deployment platforms' documentation:
- [Railway Docs](https://docs.railway.app/)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)