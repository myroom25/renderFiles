// Strict category page filtering - only allow actual products

function isCategoryPage(title, url) {
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  
  // ❌ Plural category titles
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
  ];
  
  for (const pattern of categoryPatterns) {
    if (title.match(pattern)) return true;
  }
  
  // ❌ Generic action words
  if (titleLower.startsWith('buy ') && titleLower.includes('online')) return true;
  if (titleLower.startsWith('shop ') && !titleLower.match(/\d+/)) return true;
  
  // ❌ Aggregator pages
  if (title.includes('Kuwait | Best Price')) return true;
  if (title.includes('| Every Style')) return true;
  
  // ❌ Category URLs
  if (urlLower.includes('/category/')) return true;
  if (urlLower.includes('/collections/') && !urlLower.includes('/products/')) return true;
  
  // ❌ Generic titles with pipe
  if (title.includes(' | ') && !title.match(/\d+/) && title.split(' ').length < 7) return true;
  
  // ✅ Has specific product indicators
  if (title.match(/\d+\s*(cm|seat|seater|"|mm)/i)) return false;
  if (urlLower.match(/\/p\/|\/product\/\d+|\/products\/[\w-]+\/\d+/)) return false;
  
  // ⚠️ If very short and generic
  if (title.split(' ').length <= 4 && !title.match(/\d+/)) return true;
  
  return false;
}

function matchesItemRequirements(title, snippet, item) {
  const titleLower = title.toLowerCase();
  const snippetLower = (snippet || '').toLowerCase();
  
  // Must have core keywords
  const keywords = item.search_keywords || [item.type];
  let matchCount = 0;
  
  keywords.forEach(kw => {
    const kwLower = kw.toLowerCase();
    if (titleLower.includes(kwLower) || snippetLower.includes(kwLower)) {
      matchCount++;
    }
  });
  
  // At least one keyword must match
  return matchCount > 0;
}

module.exports = {
  isCategoryPage,
  matchesItemRequirements
};
