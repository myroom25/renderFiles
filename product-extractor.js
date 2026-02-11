const axios = require('axios');
const cheerio = require('cheerio');

// Extract product details from a URL
async function extractProductDetails(url, storeName) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    let image = null;
    let price = null;
    
    // Store-specific selectors for best accuracy
    if (url.includes('abyat.com')) {
      image = $('.product-image img, .product-gallery img, img[class*="product"]').first().attr('src');
      price = $('.price-box .price, .product-price, [class*="price"]').first().text().trim();
      
    } else if (url.includes('ikea.com')) {
      image = $('.pip-image img, .product-image img').first().attr('data-src') || 
              $('.pip-image img, .product-image img').first().attr('src');
      price = $('.pip-temp-price__integer').text().trim();
      if (price) price = price + ' KD';
      
    } else if (url.includes('homecentre.com')) {
      image = $('.product-image-container img, .main-image img').first().attr('src');
      price = $('.product-price, .price-box .price').first().text().trim();
      
    } else if (url.includes('jysk.com')) {
      image = $('.product-image-photo, .product-image img').first().attr('src');
      price = $('.price-wrapper .price, .special-price .price').first().text().trim();
      
    } else if (url.includes('theone.com')) {
      image = $('.product-image img, .main-image img').first().attr('src');
      price = $('.product-price, .price').first().text().trim();
      
    } else if (url.includes('ubuy.com')) {
      image = $('.product-image img, img[class*="product"]').first().attr('src');
      price = $('.product-price, [class*="price"]').first().text().trim();
      
    } else {
      // Generic fallback selectors
      image = $('meta[property="og:image"]').attr('content') ||
              $('img[class*="product"], img[class*="main"]').first().attr('src') ||
              $('img').first().attr('src');
      
      price = $('.price, [class*="price"], [id*="price"]').first().text().trim();
    }
    
    // Clean up image URL
    if (image && !image.startsWith('http')) {
      const baseUrl = new URL(url);
      if (image.startsWith('//')) {
        image = 'https:' + image;
      } else if (image.startsWith('/')) {
        image = baseUrl.origin + image;
      }
    }
    
    // Clean up price
    if (price) {
      price = price.replace(/\s+/g, ' ').trim();
      // Extract just the price number
      const priceMatch = price.match(/KD\s*[\d,]+(?:\.\d{1,3})?|KWD\s*[\d,]+(?:\.\d{1,3})?/i);
      if (priceMatch) {
        price = priceMatch[0];
      }
    }
    
    return {
      image: image || null,
      price: price || null,
      success: true
    };
    
  } catch (error) {
    console.error(`   ⚠️ Failed to extract from ${url.substring(0, 50)}...`);
    return {
      image: null,
      price: null,
      success: false
    };
  }
}

// Batch extract details for multiple products
async function enrichProducts(products) {
  console.log(`\n📦 Enriching ${products.length} products with images and prices...`);
  
  const enriched = [];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`   ${i + 1}/${products.length} Fetching: ${product.title.substring(0, 40)}...`);
    
    const details = await extractProductDetails(product.product_url, product.store);
    
    enriched.push({
      ...product,
      image_url: details.image,
      price: details.price || product.price, // Use extracted price if available, fallback to search result price
      enriched: details.success
    });
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  const successCount = enriched.filter(p => p.enriched).length;
  console.log(`✅ Successfully enriched ${successCount}/${products.length} products\n`);
  
  return enriched;
}

module.exports = {
  extractProductDetails,
  enrichProducts
};
