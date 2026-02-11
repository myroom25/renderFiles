// Stronger category page filtering

function isCategoryPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // ❌ REJECT: Plural category titles
  const categoryPatterns = [
    /coffee tables(?!\s+\d)/i,
    /sofas(?!\s+\d)/i,
    /armchairs(?!\s+\d)/i,
    /chairs(?!\s+\d)/i,
    /tables(?!\s+\d)/i,
    /side tables/i,
    /\+ side/i,
    /coffee & /i,
    /tables set$/i,
    /furniture/i,
    /living room$/i,
    /bedroom$/i,
  ];
  
  for (const pattern of categoryPatterns) {
    if (title.match(pattern)) return true;
  }
  
  // ❌ REJECT: Generic action words
  if (titleLower.startsWith('buy ') && titleLower.includes('online')) return true;
  if (titleLower.startsWith('shop ') && !titleLower.match(/\d+/)) return true;
  if (titleLower.startsWith('find ')) return true;
  
  // ❌ REJECT: Aggregator pages
  if (title.includes('Kuwait | Best Price')) return true;
  if (title.includes('| Every Style')) return true;
  if (title.includes('| Find Your')) return true;
  
  // ❌ REJECT: Category URLs - STRONGER CHECK
  if (urlLower.includes('/category/')) return true;
  if (urlLower.includes('/categories/')) return true;
  if (urlLower.includes('/collections/') && !urlLower.includes('/products/')) return true;
  
  // ❌ REJECT: Multi-level category paths (NEW!)
  // Example: /living-rooms/sofa-and-love-seats/3-seater-sofa.html (category path)
  // vs: /products/modern-beige-sofa-12345.html (product)
  const pathSegments = urlLower.split('/').filter(s => s && s !== 'en' && s !== 'kw' && !s.match(/^\w+\.\w+$/));
  
  // If URL has 3+ segments without a product ID, it's likely a category
  if (pathSegments.length >= 3) {
    // Check if any segment is a product ID (numbers or products/)
    const hasProductId = urlLower.match(/\/products?\/[\w-]+-\d+/) || 
                        urlLower.match(/\/p\/\d+/) ||
                        urlLower.match(/\/\d{5,}/);
    
    if (!hasProductId) {
      return true; // Category path
    }
  }
  
  // ❌ REJECT: Generic category URLs
  if (urlLower.match(/\/(coffee-tables|sofas|armchairs|furniture|sofa-and-love-seats)\/?$/)) return true;
  
  // ❌ REJECT: Titles with pipe but no specifics
  if (title.includes(' | ') && !title.match(/\d+/) && title.split(' ').length < 7) return true;
  
  // ❌ REJECT: Brand category pages
  if (title.match(/^[A-Z][a-z]+ (Coffee Tables|Sofas|Armchairs)/)) return true;
  
  // ✅ ACCEPT: Has specific product indicators
  if (title.match(/\d+\s*(cm|seat|seater|"|mm|piece)/i)) return false;
  if (urlLower.match(/\/p\/|\/product\/\d+|\/products\/[\w-]+-\d+/)) return false;
  
  // ⚠️ REJECT: If very short and generic
  if (title.split(' ').length <= 4 && !title.match(/\d+/)) return true;
  
  return false;
}

function matchesItemRequirements(title, snippet, item) {
  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();
  const text = titleLower + ' ' + snippetLower;
  
  const itemType = item.type.toLowerCase().replace('_', ' ');
  if (text.includes(itemType)) {
    return true;
  }
  
  const keywords = item.search_keywords || [];
  for (const keyword of keywords) {
    const kwLower = keyword.toLowerCase();
    const kwWords = kwLower.split(' ');
    
    for (const word of kwWords) {
      if (word.length > 3 && text.includes(word)) {
        return true;
      }
    }
  }
  
  return false;
}

module.exports = {
  isCategoryPage,
  matchesItemRequirements
};
