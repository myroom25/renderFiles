const { searchGoogle } = require('./brightdata');

// ⭐ COMPLETE Kuwait Furniture Stores List
const KUWAIT_STORES = [
  { name: 'IKEA Kuwait', domain: 'ikea.com/kw' },
  { name: 'JYSK', domain: 'jysk.com.kw' },
  { name: 'Midas', domain: 'midas-kw.com' },
  { name: 'Midas Furniture', domain: 'midasfurniture.com' },
  { name: 'Home Centre', domain: 'homecentre.com/kw' },
  { name: 'Abyat', domain: 'abyat.com/kw' },
  { name: 'MUJI Kuwait', domain: 'muji.com.kw' },
  { name: 'Liwan', domain: 'liwan.com.kw' },
  { name: 'Noon Kuwait', domain: 'noon.com/kuwait' },
  { name: 'Conran Shop', domain: 'theconranshop.com.kw' },
  { name: 'AAW Furniture', domain: 'aawfurniture.com' },
  { name: 'Microless Kuwait', domain: 'kuwait.microless.com' },
  { name: 'The One', domain: 'theone.com/en-kw' },
  { name: 'Centrepoint', domain: 'centrepointstores.com/kw' },
  { name: 'Azadea Kuwait', domain: 'azadea.com/kw' },
  { name: 'Boutique Rugs', domain: 'boutiquerugs.com' },
  { name: 'Ubuy Kuwait', domain: 'ubuy.com.kw' },
  
  // Additional popular stores
  { name: 'Safat Home', domain: 'safathome.com' },
  { name: 'Marina Home', domain: 'marinahome.com' },
  { name: 'Homes R Us', domain: 'homesrus.com' },
  { name: 'Pan Home', domain: 'panhome.com' },
];

// Strict category filter
function isCategoryPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // Amazon/Noon search pages
  if (urlLower.includes('/s?k=')) return true;
  
  // Category HTML pages
  if (urlLower.match(/\/(tables|sofas|chairs|armchairs|furniture)\.html/)) return true;
  
  const categoryPatterns = [
    /coffee tables(?!\s+\d)/i,
    /sofas(?!\s+\d)/i,
    /armchairs(?!\s+\d)/i,
    /chairs(?!\s+\d)/i,
    /furniture/i,
    /living room$/i,
  ];
  
  for (const pattern of categoryPatterns) {
    if (title.match(pattern)) return true;
  }
  
  if (titleLower.startsWith('buy ') || titleLower.startsWith('shop ')) return true;
  if (urlLower.includes('/category/') || urlLower.includes('/collections/')) return true;
  
  return false;
}

async function findProductsForItems(items) {
  const results = [];
  
  console.log(`\n🔍 Searching ${items.length} items in ${KUWAIT_STORES.length} Kuwait stores`);
  
  for (const item of items) {
    console.log(`\n🛋️ ${item.type}: ${item.description.substring(0, 60)}...`);
    
    const keywords = item.search_keywords || [item.type];
    const products = [];
    const seenUrls = new Set();
    
    // Search with top 3 keywords
    for (let i = 0; i < Math.min(3, keywords.length); i++) {
      const query = `${keywords[i]} Kuwait`;
      console.log(`📝 "${query}"`);
      
      const searchResults = await searchGoogle(query);
      
      for (const result of searchResults) {
        if (seenUrls.has(result.link)) continue;
        seenUrls.add(result.link);
        
        // Must be Kuwait store
        if (!isKuwaitStore(result.link)) {
          console.log(`   ⚠️ Non-Kuwait: ${result.link.substring(0, 50)}...`);
          continue;
        }
        
        // Category filter
        if (isCategoryPage(result.title, result.link)) {
          console.log(`   ❌ Category: ${result.title.substring(0, 50)}...`);
          continue;
        }
        
        const product = analyzeProduct(result, item);
        if (product) {
          products.push(product);
          console.log(`   ✅ [${product.score}] ${product.store} - ${result.title.substring(0, 40)}...`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    products.sort((a, b) => b.score - a.score);
    const top = products.slice(0, 3);
    
    console.log(`✅ Found ${products.length} products, showing top ${top.length}`);
    
    if (top.length > 0) {
      results.push({ item, products: top });
    } else {
      console.log(`⚠️ No products found in Kuwait for ${item.type}`);
    }
  }
  
  return results;
}

function isKuwaitStore(url) {
  const urlLower = url.toLowerCase();
  
  for (const store of KUWAIT_STORES) {
    if (urlLower.includes(store.domain)) {
      return true;
    }
  }
  
  // Generic .kw domains
  if (urlLower.includes('.kw/') || urlLower.includes('.com.kw')) {
    return true;
  }
  
  return false;
}

function analyzeProduct(result, item) {
  const title = result.title;
  const titleLower = title.toLowerCase();
  const url = result.link;
  const snippet = (result.snippet || '').toLowerCase();
  const text = titleLower + ' ' + snippet;
  
  const itemType = item.type.toLowerCase().replace('_', ' ');
  if (!text.includes(itemType)) return null;
  
  // Extract store name (smart detection)
  let store = extractStoreName(url);
  
  // Extract price
  let price = null;
  const fullText = title + ' ' + result.snippet;
  const priceMatch = fullText.match(/KD\s*[\d,]+(?:\.\d{1,3})?|KWD\s*[\d,]+(?:\.\d{1,3})?/i);
  if (priceMatch) price = priceMatch[0];
  
  // Simple scoring
  let score = 0;
  if (price) score += 30;
  if (title.match(/\d+/)) score += 20;
  
  item.search_keywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) score += 15;
  });
  
  // Boost popular stores
  if (store === 'Home Centre') score += 15;
  if (store === 'The One') score += 12;
  if (store === 'IKEA Kuwait') score += 10;
  if (store === 'Ubuy Kuwait') score += 8;
  
  return {
    title,
    product_url: url,
    store,
    price: price || 'Price not available',
    image_url: null,
    relevance_score: score,
    score
  };
}

function extractStoreName(url) {
  const urlLower = url.toLowerCase();
  
  // Check against known stores first
  for (const store of KUWAIT_STORES) {
    if (urlLower.includes(store.domain)) {
      return store.name;
    }
  }
  
  // Fallback: Extract from domain
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '').replace('a.', '');
    const storeName = domain.split('.')[0];
    
    // Capitalize
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
  } catch {
    return 'Unknown Store';
  }
}

module.exports = { findProductsForItems };
