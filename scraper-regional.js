const { searchGoogle } = require('./brightdata');

const REGIONAL_STORES = [
  // UAE
  { name: 'IKEA UAE', domain: 'ikea.com/ae' },
  { name: 'Home Centre UAE', domain: 'homecentre.com/ae' },
  { name: 'The One UAE', domain: 'theone.com/en-ae' },
  { name: 'Noon UAE', domain: 'noon.com/uae' },
  { name: 'Amazon UAE', domain: 'amazon.ae' },
  
  // Saudi Arabia
  { name: 'IKEA KSA', domain: 'ikea.com/sa' },
  { name: 'Home Centre KSA', domain: 'homecentre.com/sa' },
  { name: 'Noon KSA', domain: 'noon.com/saudi' },
  { name: 'Amazon KSA', domain: 'amazon.sa' },
];

async function findRegionalProducts(items) {
  const results = [];
  
  console.log(`\n🌍 Searching ${items.length} items (Regional)`);
  
  for (const item of items) {
    console.log(`\n🛋️ ${item.type}: ${item.description.substring(0, 60)}...`);
    
    const keywords = item.search_keywords || [item.type];
    const products = [];
    const seenUrls = new Set();
    
    // ⭐ Search UAE and KSA with simple queries
    const queries = [
      `${keywords[0]} UAE`,  // Main keyword + UAE
      `${keywords[0]} Amazon UAE`,  // Amazon specific
    ];
    
    for (const query of queries) {
      console.log(`📝 "${query}"`);
      
      const searchResults = await searchGoogle(query);
      
      // If no results, skip
      if (searchResults.length === 0) {
        console.log(`   ⚠️ No results for this query`);
        continue;
      }
      
      for (const result of searchResults) {
        if (seenUrls.has(result.link)) continue;
        seenUrls.add(result.link);
        
        // Must be regional store
        if (!isRegionalStore(result.link)) continue;
        
        const product = extractProduct(result, item);
        if (product) {
          products.push(product);
          console.log(`   ✅ ${product.store} - ${result.title.substring(0, 40)}...`);
        }
      }
      
      // If we found some products, stop searching more
      if (products.length >= 5) break;
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    products.sort((a, b) => (b.price ? 1 : 0) - (a.price ? 1 : 0));
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

function extractProduct(result, item) {
  const title = result.title;
  const titleLower = title.toLowerCase();
  const itemType = item.type.toLowerCase().replace('_', ' ');
  
  // Must mention item type
  if (!titleLower.includes(itemType)) return null;
  
  let store = 'Unknown Store';
  for (const s of REGIONAL_STORES) {
    if (result.link.toLowerCase().includes(s.domain)) {
      store = s.name;
      break;
    }
  }
  
  // Extract price (UAE/KSA currencies)
  let price = null;
  const text = title + ' ' + result.snippet;
  const priceMatch = text.match(/AED\s*[\d,]+|SAR\s*[\d,]+|QAR\s*[\d,]+/i);
  if (priceMatch) price = priceMatch[0];
  
  return {
    title,
    product_url: result.link,
    store,
    price: price || 'Price not available',
    image_url: null,
    relevance_score: 50
  };
}

module.exports = { findRegionalProducts };
