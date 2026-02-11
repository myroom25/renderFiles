const { searchGoogle } = require('./brightdata');

const KUWAIT_STORES = [
  { name: 'IKEA Kuwait', domain: 'ikea.com/kw' },
  { name: 'Home Centre', domain: 'homecentre.com/kw' },
  { name: 'JYSK', domain: 'jysk.com.kw' },
  { name: 'The One', domain: 'theone.com/en-kw' },
  { name: 'Abyat', domain: 'abyat.com/kw' },
  { name: 'Midas', domain: 'midasfurniture.com' },
  { name: 'Conran Shop', domain: 'theconranshop.com.kw' },
];

function isCategoryPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // ❌ REJECT: Amazon/search pages with /s?k=
  if (urlLower.includes('/s?k=')) {
    console.log(`   ❌ AMAZON SEARCH PAGE: ${url.substring(0, 50)}...`);
    return true;
  }
  
  // ❌ REJECT: URLs ending in plural categories
  if (urlLower.match(/\/(tables|sofas|chairs|armchairs|center-side-tables)\.html/)) {
    console.log(`   ❌ CATEGORY HTML: ${url.substring(0, 50)}...`);
    return true;
  }
  
  // ❌ REJECT: Multi-segment paths without product ID
  // Example: /living-rooms/tables/center-side-tables.html = 3 segments = category
  // vs: /products/modern-sofa-12345 = has product ID = OK
  const pathSegments = urlLower.split('/').filter(s => 
    s && 
    !s.match(/^(en|kw|ae|sa|www|https?:)$/) &&
    !s.match(/\.(html|php|aspx)$/)
  );
  
  if (pathSegments.length >= 3) {
    const hasProductId = urlLower.match(/\/products?\/[\w-]+-\d+/) || 
                        urlLower.match(/\/p\/\d+/) ||
                        urlLower.match(/\/\d{5,}/) ||
                        urlLower.includes('/product/');
    
    if (!hasProductId) {
      console.log(`   ❌ MULTI-PATH CATEGORY: ${url.substring(0, 50)}...`);
      return true;
    }
  }
  
  const categoryPatterns = [
    /coffee tables(?!\s+\d)/i,
    /sofas(?!\s+\d)/i,
    /armchairs(?!\s+\d)/i,
    /chairs(?!\s+\d)/i,
    /tables(?!\s+\d)/i,
    /side tables/i,
    /furniture/i,
    /living room$/i,
    /vases.*bowls/i,
    /decor.*accessories/i,
  ];
  
  for (const pattern of categoryPatterns) {
    if (title.match(pattern)) return true;
  }
  
  if (titleLower.startsWith('buy ') && titleLower.includes('online')) return true;
  if (titleLower.startsWith('shop ') && !titleLower.match(/\d+/)) return true;
  
  if (title.includes('Kuwait | Best Price')) return true;
  if (title.includes('| Every Style')) return true;
  
  if (urlLower.includes('/category/')) return true;
  if (urlLower.includes('/collections/') && !urlLower.includes('/products/')) return true;
  
  if (title.match(/\d+\s*(cm|seat|seater)/i)) return false;
  
  return false;
}

async function findProductsForItems(items) {
  const results = [];
  
  console.log(`\n🔍 Searching ${items.length} items (Kuwait only)`);
  
  for (const item of items) {
    console.log(`\n🛋️ ${item.type}: ${item.description.substring(0, 60)}...`);
    
    // Extract color requirements
    const colors = extractColors(item.description);
    console.log(`   Color filter: ${colors.required.join(', ') || 'none'}`);
    if (colors.forbidden.length > 0) {
      console.log(`   Forbidden colors: ${colors.forbidden.join(', ')}`);
    }
    
    const keywords = item.search_keywords || [item.type];
    const products = [];
    const seenUrls = new Set();
    
    for (let i = 0; i < Math.min(3, keywords.length); i++) {
      const query = `${keywords[i]} Kuwait`;
      console.log(`📝 "${query}"`);
      
      const searchResults = await searchGoogle(query);
      
      for (const result of searchResults) {
        if (seenUrls.has(result.link)) continue;
        seenUrls.add(result.link);
        
        if (!isKuwaitStore(result.link)) continue;
        
        if (isCategoryPage(result.title, result.link)) continue;
        
        // COLOR CHECK - STRICT
        const titleLower = result.title.toLowerCase();
        const snippet = (result.snippet || '').toLowerCase();
        const text = titleLower + ' ' + snippet;
        
        let colorConflict = false;
        for (const forbiddenColor of colors.forbidden) {
          if (text.includes(forbiddenColor)) {
            console.log(`   ❌ COLOR CONFLICT: ${forbiddenColor} in "${result.title.substring(0, 50)}..."`);
            colorConflict = true;
            break;
          }
        }
        
        if (colorConflict) continue;
        
        const product = analyzeProduct(result, item);
        if (product) {
          products.push(product);
          console.log(`   ✅ [${product.score}] ${result.title.substring(0, 50)}...`);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    products.sort((a, b) => b.score - a.score);
    const top = products.slice(0, 3);
    
    console.log(`✅ Found ${products.length} products, showing top ${top.length}`);
    
    // Only add if we found products
    if (top.length > 0) {
      results.push({ item, products: top });
    } else {
      console.log(`⚠️ Skipping ${item.type} - no products found`);
    }
  }
  
  return results;
}

function extractColors(description) {
  const descLower = description.toLowerCase();
  
  const colorMap = {
    'navy blue': { variants: ['navy', 'navy blue', 'dark blue'], forbidden: ['grey', 'gray', 'black', 'beige', 'cream', 'white', 'brown'] },
    'blue': { variants: ['blue'], forbidden: ['grey', 'gray', 'black', 'beige', 'cream', 'navy'] },
    'beige': { variants: ['beige', 'cream', 'tan', 'off-white'], forbidden: ['navy', 'blue', 'black', 'grey', 'gray', 'dark'] },
    'cream': { variants: ['cream', 'beige', 'off-white', 'ivory'], forbidden: ['navy', 'blue', 'black', 'grey', 'gray', 'dark'] },
    'white': { variants: ['white', 'off-white'], forbidden: ['black', 'grey', 'gray', 'navy', 'blue', 'brown'] },
    'grey': { variants: ['grey', 'gray'], forbidden: ['white', 'cream', 'beige', 'navy', 'blue'] },
    'black': { variants: ['black'], forbidden: ['white', 'cream', 'beige', 'grey', 'gray'] },
  };
  
  for (const [color, data] of Object.entries(colorMap)) {
    if (data.variants.some(v => descLower.includes(v))) {
      return { required: data.variants, forbidden: data.forbidden };
    }
  }
  
  return { required: [], forbidden: [] };
}

function isKuwaitStore(url) {
  const urlLower = url.toLowerCase();
  
  for (const store of KUWAIT_STORES) {
    if (urlLower.includes(store.domain)) return true;
  }
  
  if (urlLower.includes('.kw/') || urlLower.includes('.com.kw')) return true;
  
  return false;
}

function analyzeProduct(result, item) {
  const title = result.title;
  const titleLower = title.toLowerCase();
  const url = result.link;
  const snippet = (result.snippet || '').toLowerCase();
  const text = titleLower + ' ' + snippet;
  
  const descWords = item.description.toLowerCase().split(' ');
  
  let matchCount = 0;
  descWords.forEach(word => {
    if (word.length > 3 && text.includes(word)) {
      matchCount++;
    }
  });
  
  if (matchCount < 2) return null;
  
  const itemType = item.type.toLowerCase().replace('_', ' ');
  if (!text.includes(itemType)) return null;
  
  let store = extractStoreName(url);
  
  let price = null;
  const fullText = title + ' ' + result.snippet;
  const priceMatch = fullText.match(/KD\s*[\d,]+(?:\.\d{1,3})?|KWD\s*[\d,]+(?:\.\d{1,3})?/i);
  if (priceMatch) price = priceMatch[0];
  
  let score = 0;
  if (price) score += 30;
  if (title.match(/\d+/)) score += 25;
  
  item.search_keywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) score += 15;
  });
  
  if (store === 'Home Centre') score += 12;
  if (store === 'The One') score += 10;
  if (store === 'Abyat') score += 8;
  
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
  
  for (const store of KUWAIT_STORES) {
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

module.exports = { findProductsForItems };
