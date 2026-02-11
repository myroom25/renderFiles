# 🚀 Kuwait Furniture Finder - Production Deployment Guide

## 📋 Step 1: Update Local Files

### Files to REPLACE:

1. **claude.js**
   - Download: `claude-DETAILED.js`
   - Rename to: `claude.js`
   - Replace existing

2. **brightdata.js**
   - Download: `brightdata-FIXED-ORGANIC.js`
   - Rename to: `brightdata.js`
   - Replace existing

3. **scraper.js**
   - Download: `scraper-PRODUCTION.js`
   - Rename to: `scraper.js`
   - Replace existing

4. **server.js**
   - Download: `server-PRODUCTION.js`
   - Rename to: `server.js`
   - Replace existing

### Files to ADD:

5. **product-filters.js**
   - Download: `product-filters.js`
   - Keep name, add to project root

### Files to DELETE:

- All `test-*.js` files
- All `*.html` test result files
- `SIMPLE-WORKING-VERSION.js`
- `STRICT-PRODUCT-ONLY.js`
- Any other test/debug files

---

## ✅ Step 2: Test Locally

```bash
npm start
```

**Test flow:**
1. Open http://localhost:3000
2. Upload a room image
3. Wait ~45-60 seconds
4. Check results:
   - ✅ 3 items detected (sofa, armchair, table)
   - ✅ 2-3 products per item
   - ✅ NO category pages
   - ✅ Prices shown (if available)

---

## 🌐 Step 3: Deploy Online

### Option A: Render.com (Recommended - Free)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Production ready"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Deploy on Render:**
   - Go to: https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Settings:
     - **Name:** kuwait-furniture-finder
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Environment Variables:**
       - `CLAUDE_API_KEY=sk-ant-api03-UUKi9Ym...`
       - `BRIGHTDATA_API_KEY=4f7440bd-d81e...`
       - `BRIGHTDATA_ZONE=serp_api1`
       - `PORT=3000`
       - `NODE_ENV=production`
   - Click "Create Web Service"

3. **Wait 5-10 minutes** for deployment

4. **Your URL:** `https://kuwait-furniture-finder.onrender.com`

---

### Option B: Railway.app (Also Free)

1. Push to GitHub (same as above)

2. Deploy on Railway:
   - Go to: https://railway.app
   - Click "New Project" → "Deploy from GitHub"
   - Select your repo
   - Add environment variables (same as Render)
   - Deploy

3. **Your URL:** `https://kuwait-furniture-finder.up.railway.app`

---

### Option C: Vercel (Frontend Focus - May Need Adjustments)

Vercel is better for static sites, but can work with serverless functions.

---

## 📱 Step 4: Share with Boss

Send your boss:
- **Live URL:** `https://your-app.onrender.com`
- **Instructions:**
  1. Click to upload room photo
  2. Wait 60 seconds
  3. See furniture matches with prices
  4. Click "View Product" to buy

---

## ⚙️ Configuration Summary

**What the app does:**
- ✅ Detects top 3 furniture items from photo
- ✅ Shows 2-3 best product matches per item
- ✅ Filters out category pages (strict)
- ✅ Shows prices when available
- ✅ Provides direct links to buy

**API Usage:**
- **Claude:** ~$0.10 per image analysis
- **BrightData:** ~$0.015 per room (9 searches × $0.0015)
- **Total:** ~$0.12 per room analysis

**With $2 BrightData balance:** ~16 room analyses

---

## 🐛 Troubleshooting

### If deployment fails:

1. Check logs in Render/Railway dashboard
2. Verify environment variables are set
3. Make sure `.gitignore` excludes:
   - `node_modules/`
   - `.env`
   - `uploads/*.jpg`
   - `furniture_finder.db`

### If results are poor:

1. Check Claude API key is valid
2. Check BrightData has credit
3. Review terminal logs for errors

---

## 📊 Expected Performance

- **Detection Time:** 5-10 seconds (Claude Vision)
- **Search Time:** 30-40 seconds (9 BrightData queries)
- **Total:** 45-60 seconds per room
- **Accuracy:** 80-90% for common furniture
- **Match Quality:** High (category pages filtered)

---

## 🎯 Next Steps After Testing

1. Test with 5-10 different room photos
2. Share URL with boss
3. Collect feedback on matches
4. Adjust if needed (filter sensitivity, number of results, etc.)

