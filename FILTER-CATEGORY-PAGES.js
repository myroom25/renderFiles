// Ultra-strict filter to remove category/collection pages

function isProductPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // ❌ REJECT: Generic "Buy ... Online" pages
  if (titleLower.startsWith('buy ') && titleLower.includes('online')) {
    return false;
  }
  
  // ❌ REJECT: "Shop ..." category pages
  if (titleLower.startsWith('shop ') && !titleLower.match(/\d+/)) {
    return false;
  }
  
  // ❌ REJECT: Collection/category URLs
  const categoryKeywords = [
    '/collections/',
    '/category/',
    '/categories/',
    '/shop/',
    '-category',
    '/living-room/',
    '/furniture/',
    '/sofas/',
    '/armchairs/',
    '/tables/'
  ];
  
  for (const keyword of categoryKeywords) {
    if (urlLower.includes(keyword) && !urlLower.match(/\/p\/|\/product\//)) {
      return false;
    }
  }
  
  // ❌ REJECT: Titles with multiple products (sets, collections)
  const multiProductKeywords = [
    'coffee tables set',
    'side tables',
    'coffee & side tables',
    'tables set',
    'collection',
    '+ side tables',
    'by category'
  ];
  
  for (const keyword of multiProductKeywords) {
    if (titleLower.includes(keyword)) {
      return false;
    }
  }
  
  // ❌ REJECT: Brand/store category pages
  if (titleLower.includes('|') && !titleLower.match(/\d+/)) {
    // "Tables in Kuwait | Coffee, Dining..." = category
    return false;
  }
  
  // ❌ REJECT: Very long titles (usually category descriptions)
  if (title.length > 100) {
    return false;
  }
  
  // ✅ ACCEPT: Has product code or SKU
  if (urlLower.match(/\/p\/[\w-]+\/\d+|\/product\/\d+|\/products\/[\w-]+\/\d+/)) {
    return true;
  }
  
  // ✅ ACCEPT: Has specific product indicators
  const productIndicators = [
    /\d+-seat/i,
    /\d+cm/i,
    /\d+"/i,
    /\d+ seater/i,
    /\bsku[\s:]/i,
    /\bmodel[\s:]/i
  ];
  
  for (const indicator of productIndicators) {
    if (title.match(indicator)) {
      return true;
    }
  }
  
  // ⚠️ REJECT by default if unsure
  return false;
}

module.exports = { isProductPage };
