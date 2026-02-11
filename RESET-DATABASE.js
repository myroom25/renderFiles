const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'furniture_finder.db');

console.log('🗑️  Deleting old database...');

// Delete old database
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Old database deleted');
} else {
  console.log('ℹ️  No old database found');
}

console.log('\n📦 Creating fresh database...');

// Create new database
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create tables with correct schema
db.exec(`
  CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE session_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE session_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    store TEXT,
    price TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES session_items(id) ON DELETE CASCADE
  );

  CREATE TABLE products_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    product_url TEXT NOT NULL,
    store TEXT,
    price TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log('✅ Fresh database created with correct schema!');
console.log('\n📊 Tables created:');
console.log('   - sessions');
console.log('   - session_items');
console.log('   - session_products (with item_id column ✓)');
console.log('   - products_cache');

db.close();
console.log('\n✅ Done! Restart your server now.');
