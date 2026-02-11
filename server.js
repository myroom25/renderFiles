require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const db = require('./db');
const { detectFurnitureItems } = require('./claude');
const { findProductsForItems } = require('./scraper');
const { findRegionalProducts } = require('./scraper-regional');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    claude: !!process.env.CLAUDE_API_KEY,
    brightdata: !!process.env.BRIGHTDATA_API_KEY
  });
});

app.post('/api/analyze', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    console.log(`📸 Analyzing: ${req.file.filename}`);

    const imagePath = req.file.path;
    const items = await detectFurnitureItems(imagePath);

    console.log(`✅ Detected ${items.length} items`);

    res.json({
      imagePath: `/uploads/${req.file.filename}`,
      items: items
    });

  } catch (error) {
    console.error('❌ /api/analyze error:', error);
    res.status(500).json({ error: error.message });
  }
});

// NEW: Find products in Kuwait AND nearby countries
app.post('/api/find-products-regional', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    console.log('\n🌍 Finding products in Kuwait AND nearby countries');

    const results = [];

    for (const item of items) {
      console.log(`\n📦 ${item.type}: ${item.description.substring(0, 50)}...`);
      
      // Search Kuwait
      console.log('   🇰🇼 Searching Kuwait...');
      const kuwaitResults = await findProductsForItems([item]);
      const kuwaitProducts = kuwaitResults[0]?.products || [];
      
      // Search Regional (UAE, KSA, etc.)
      console.log('   🌍 Searching nearby countries...');
      const regionalResults = await findRegionalProducts([item]);
      const regionalProducts = regionalResults[0]?.products || [];
      
      results.push({
        item,
        kuwaitProducts,
        regionalProducts
      });
      
      console.log(`   ✅ Kuwait: ${kuwaitProducts.length}, Regional: ${regionalProducts.length}`);
    }

    res.json({ results });

  } catch (error) {
    console.error('❌ /api/find-products-regional error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Original endpoint (for compatibility)
app.post('/api/find-products', async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items' });
    }

    const results = await findProductsForItems(items);

    res.json({ results });

  } catch (error) {
    console.error('❌ /api/find-products error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/save-session', async (req, res) => {
  try {
    const { imagePath, items, results } = req.body;

    const sessionId = db.createSession(imagePath);

    items.forEach((item, index) => {
      const itemId = db.addSessionItem(sessionId, item.type, item.description);
      
      // Save Kuwait products
      const itemResults = results.find(r => r.item.type === item.type);
      if (itemResults && itemResults.kuwaitProducts) {
        itemResults.kuwaitProducts.forEach(product => {
          db.addSessionProduct(itemId, product.title, product.product_url, product.store, product.price);
        });
      }
    });

    res.json({ sessionId });

  } catch (error) {
    console.error('❌ Save session error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', (req, res) => {
  try {
    const sessions = db.getAllSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('❌ History error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/:id', (req, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('❌ Get session error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Kuwait Furniture Finder - REGIONAL EDITION');
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log('⚙️  Configuration:');
  console.log(`   Claude API: ${process.env.CLAUDE_API_KEY ? '✅' : '❌'}`);
  console.log(`   BrightData: ${process.env.BRIGHTDATA_API_KEY ? '✅' : '❌'}`);
  console.log('🌍 Regional Search: Enabled (KW + GCC + Amazon)');
});
