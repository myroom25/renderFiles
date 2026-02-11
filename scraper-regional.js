const { searchGoogle } = require('./brightdata');

const REGIONAL_STORES = [
  { name: 'IKEA UAE', domain: 'ikea.com/ae' },
  { name: 'Home Centre UAE', domain: 'homecentre.com/ae' },
  { name: 'The One UAE', domain: 'theone.com/en-ae' },
  { name: 'IKEA KSA', domain: 'ikea.com/sa' },
  { name: 'Home Centre KSA', domain: 'homecentre.com/sa' },
  { name: 'Amazon UAE', domain: 'amazon.ae' },
  { name: 'Amazon KSA', domain: 'amazon.sa' },
];

// Same strict filter as Kuwait
function isCategoryPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  const categoryPatterns = [
    /coffee tables(?!\s+\d)/i,
    /sofas(?!\s+\d)/i,
    /armchairs(?!\s+\d)/i,
    /chairs(?!\s+\d)/i,
    /tables(?!\s+\d)/i,
    /side tables/i,
    /furniture/i,
    /living room$/i,
  ];
  
  for (const pattern of categoryPatterns) {
    if (title.match(pattern)) return true;
  }
  
  if (titleLower.startsWith('buy ') && titleLower.includes('online')) return true;
  if (titleLower.startsWith('shop ') && !titleLower.match(/\d+/)) return true;
  
  if (urlLower.includes('/category/')) return true;
  if (urlLower.includes('/collections/') && !urlLower.includes('/products/')) return true;
  
  if (title.match(/\d+\s*(cm|seat|seater)/i)) return false;
  
  return false;
}

async function findRegionalProducts(items) {
  const results = [];
  
  console.log(`\n🌍 Searching ${items.length} items (Regional)`);
  
  for (const item of items) {
    console.log(`\n🛋️ ${item.type}: ${item.description.substring(0, 60)}...`);
    
    const keywords = item.search_keywords || [item.type];
    const products = [];
    const seenUrls = new Set();
    
    // Search UAE and KSA
    for (let i = 0; i < Math.min(2, keywords.length); i++) {
      const query = `${keywords[i]} UAE`;
      console.log(`📝 "${query}"`);
      
      const searchResults = await searchGoogle(query);
      
      for (const result of searchResults) {
        if (seenUrls.has(result.link)) continue;
        seenUrls.add(result.link);
        
        // Must be regional store
        if (!isRegionalStore(result.link)) continue;
        
        // Category filter
        if (isCategoryPage(result.title, result.link)) continue;
        
        const product = analyzeProduct(result, item);
        if (product) {
          products.push(product);
          console.log(`   ✅ ${result.title.substring(0, 50)}...`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    products.sort((a, b) => b.score - a.score);
    const top = products.slice(0, 5);
    
    console.log(`✅ Found ${products.length} regional products, showing top ${top.length}`);
    
    results.push({ item, products: top });
  }
  
  return results;
}

function isRegionalStore(url) {
  const urlLower = url.toLowerCase();
  
  for (const store of REGIONAL_STORES) {
    if (urlLower.includes(store.domain)) return true;
  }
  
  return false;
}

function analyzeProduct(result, item) {
  const title = result.title;
  const titleLower = title.toLowerCase();
  const url = result.link;
  const text = titleLower + ' ' + (result.snippet || '').toLowerCase();
  
  // Must mention item type
  const itemType = item.type.toLowerCase().replace('_', ' ');
  if (!text.includes(itemType)) return null;
  
  // Extract store
  let store = extractStoreName(url);
  
  // Extract price (multi-currency)
  let price = null;
  const fullText = title + ' ' + result.snippet;
  const priceMatch = fullText.match(/AED\s*[\d,]+|SAR\s*[\d,]+|QAR\s*[\d,]+/i);
  if (priceMatch) price = priceMatch[0];
  
  // Simple scoring
  let score = 0;
  if (price) score += 20;
  if (title.match(/\d+/)) score += 15;
  
  item.search_keywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) score += 10;
  });
  
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
  
  for (const store of REGIONAL_STORES) {
    if (urlLower.includes(store.domain)) {
      return store.name;
    }
  }
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const storeName = domain.split('.')[0];
    return storeName.charAt(0).toUpperCase() + storeName.slice(1);
  } catch {
    return 'Unknown Store';
  }
}

module.exports = { findRegionalProducts };
