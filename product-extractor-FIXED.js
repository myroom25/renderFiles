const { fetchProductPage } = require('./brightdata');
const cheerio = require('cheerio');

// Extract product details using BrightData (avoids blocking)
async function extractProductDetails(url, storeName) {
  try {
    console.log(`   Fetching: ${url.substring(0, 60)}...`);
    
    // Use BrightData to fetch (better success rate)
    const html = await fetchProductPage(url);
    
    if (!html || typeof html !== 'string') {
      console.log(`   ⚠️ No HTML returned`);
      return { image: null, price: null, success: false };
    }
    
    const $ = cheerio.load(html);
    
    let image = null;
    let price = null;
    
    // Store-specific selectors (most reliable)
    if (url.includes('abyat.com')) {
      // Abyat selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('.product-image img').first().attr('src') ||
              $('img[alt*="product"]').first().attr('src');
      
      price = $('.price').first().text().trim() ||
              $('[class*="price"]').first().text().trim();
      
    } else if (url.includes('ikea.com')) {
      // IKEA selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('.pip-image img').first().attr('data-src') ||
              $('.pip-image img').first().attr('src');
      
      price = $('.pip-temp-price__integer').text().trim();
      if (price) price = 'KD ' + price;
      
    } else if (url.includes('homecentre.com')) {
      // Home Centre selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('.product-image img').first().attr('src') ||
              $('img[class*="product"]').first().attr('src');
      
      price = $('.product-price').first().text().trim() ||
              $('[data-price]').first().text().trim();
      
    } else if (url.includes('jysk.com')) {
      // JYSK selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('.product-image-photo').first().attr('src');
      
      price = $('.price').first().text().trim() ||
              $('.special-price').first().text().trim();
      
    } else if (url.includes('theone.com')) {
      // The One selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('.product-image img').first().attr('src');
      
      price = $('.product-price').first().text().trim();
      
    } else {
      // Generic fallback - og:image is most reliable
      image = $('meta[property="og:image"]').attr('content') ||
              $('meta[name="og:image"]').attr('content') ||
              $('img[class*="product"]').first().attr('src') ||
              $('img[id*="product"]').first().attr('src');
      
      price = $('[class*="price"]').first().text().trim();
    }
    
    // Clean image URL
    if (image) {
      if (!image.startsWith('http')) {
        const baseUrl = new URL(url);
        if (image.startsWith('//')) {
          image = 'https:' + image;
        } else if (image.startsWith('/')) {
          image = baseUrl.origin + image;
        }
      }
      console.log(`   ✅ Image: ${image.substring(0, 50)}...`);
    } else {
      console.log(`   ⚠️ No image found`);
    }
    
    // Clean price
    if (price) {
      const priceMatch = price.match(/KD\s*[\d,]+(?:\.\d{1,3})?|KWD\s*[\d,]+(?:\.\d{1,3})?/i);
      if (priceMatch) {
        price = priceMatch[0];
        console.log(`   ✅ Price: ${price}`);
      }
    }
    
    return {
      image: image || null,
      price: price || null,
      success: !!(image || price)
    };
    
  } catch (error) {
    console.log(`   ❌ Extract failed: ${error.message}`);
    return { image: null, price: null, success: false };
  }
}

async function enrichProducts(products) {
  console.log(`\n📦 Enriching ${products.length} products with images and prices...`);
  
  const enriched = [];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`\n   ${i + 1}/${products.length} ${product.title.substring(0, 40)}...`);
    
    const details = await extractProductDetails(product.product_url, product.store);
    
    enriched.push({
      ...product,
      image_url: details.image,
      price: details.price || product.price,
      enriched: details.success
    });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  const successCount = enriched.filter(p => p.enriched).length;
  console.log(`\n✅ Successfully enriched ${successCount}/${products.length} products\n`);
  
  return enriched;
}

module.exports = {
  extractProductDetails,
  enrichProducts
};
