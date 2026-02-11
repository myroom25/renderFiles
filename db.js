const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'furniture_finder.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS session_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    store TEXT,
    price TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES session_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    store TEXT,
    price TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Connected to SQLite database');
console.log('✅ Database schema initialized');

// Session functions
function createSession(imagePath) {
  const stmt = db.prepare('INSERT INTO sessions (image_path) VALUES (?)');
  const result = stmt.run(imagePath);
  return result.lastInsertRowid;
}

function addSessionItem(sessionId, itemName, description) {
  const stmt = db.prepare('INSERT INTO session_items (session_id, item_name, description) VALUES (?, ?, ?)');
  const result = stmt.run(sessionId, itemName, description);
  return result.lastInsertRowid;
}

function addSessionProduct(itemId, title, productUrl, store, price) {
  const stmt = db.prepare('INSERT INTO session_products (item_id, title, product_url, store, price) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(itemId, title, productUrl, store, price);
  return result.lastInsertRowid;
}

function getAllSessions() {
  const stmt = db.prepare(`
    SELECT 
      s.id,
      s.image_path,
      s.created_at,
      COUNT(DISTINCT si.id) as itemCount
    FROM sessions s
    LEFT JOIN session_items si ON s.id = si.session_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
  return stmt.all();
}

function getSessionById(sessionId) {
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  
  if (!session) return null;
  
  const items = db.prepare(`
    SELECT 
      si.id,
      si.item_name,
      si.description,
      si.created_at
    FROM session_items si
    WHERE si.session_id = ?
  `).all(sessionId);
  
  const results = [];
  
  items.forEach(item => {
    const products = db.prepare(`
      SELECT 
        title,
        product_url,
        store,
        price
      FROM session_products
      WHERE item_id = ?
    `).all(item.id);
    
    results.push({
      item: {
        type: item.item_name,
        description: item.description
      },
      products: products.map(p => ({
        title: p.title,
        product_url: p.product_url,
        store: p.store,
        price: p.price,
        image_url: null
      }))
    });
  });
  
  return {
    imagePath: session.image_path,
    items: items.map(i => ({ item_name: i.item_name, description: i.description })),
    results: results
  };
}

// Cache functions
function getCachedProducts(cacheKey) {
  const stmt = db.prepare('SELECT * FROM products_cache WHERE cache_key = ? AND created_at > datetime("now", "-7 days")');
  return stmt.all(cacheKey);
}

function cacheProducts(cacheKey, products) {
  const stmt = db.prepare('INSERT OR REPLACE INTO products_cache (cache_key, title, product_url, store, price) VALUES (?, ?, ?, ?, ?)');
  
  products.forEach(p => {
    stmt.run(cacheKey, p.title, p.product_url, p.store, p.price);
  });
}

module.exports = {
  createSession,
  addSessionItem,
  addSessionProduct,
  getAllSessions,
  getSessionById,
  getCachedProducts,
  cacheProducts
};
