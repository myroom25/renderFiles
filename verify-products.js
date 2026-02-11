require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

// Top 3 products to verify (from your test results)
const PRODUCTS_TO_VERIFY = [
  {
    name: 'Stone 4 Seater L-Shape Sofa LT',
    url: 'https://www.abyat.com/kw/en/products/sofas/stone-4-seater-l-shape-sofa-lt/469994',
    store: 'Abyat',
    expected_price: 'KWD 325'
  },
  {
    name: 'Mid-Century Linen Armchair with Wood Legs',
    url: 'https://www.a.ubuy.com.kw/en/product/IDZM8KGR4-weture-mid-century-accent-chair-modern-linen-fabric-armchair-for-living-room-comfy-upholstered-reading-accent-chairs-for-bedroom-single-sofa-chair',
    store: 'Ubuy',
    expected_price: 'KWD 147'
  },
  {
    name: 'JAKOBSFORS coffee table 80cm',
    url: 'https://www.ikea.com/kw/en/p/jakobsfors-coffee-table-oak-veneer-90500121/',
    store: 'IKEA Kuwait',
    expected_price: 'Check on site'
  }
];

async function verifyProduct(product) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 VERIFYING: ${product.name}`);
  console.log(`🏪 Store: ${product.store}`);
  console.log(`🔗 URL: ${product.url}`);
  console.log(`💰 Expected Price: ${product.expected_price}\n`);
  
  try {
    // Fetch the product page
    const response = await axios.get(product.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract product details
    const details = {
      title: '',
      price: '',
      image: '',
      description: '',
      specs: []
    };
    
    // Try different selectors based on store
    if (product.store === 'Abyat') {
      details.title = $('h1').first().text().trim();
      details.price = $('.price, .product-price').first().text().trim();
      details.image = $('img[class*="product"], .product-image img').first().attr('src');
      details.description = $('.description, .product-description').first().text().trim().substring(0, 200);
      
    } else if (product.store === 'IKEA Kuwait') {
      details.title = $('h1.pip-header-section__title').text().trim();
      details.price = $('.pip-temp-price__integer').text().trim() + ' KD';
      details.image = $('.pip-image img').first().attr('src');
      details.description = $('.pip-product-summary__description').text().trim().substring(0, 200);
      
    } else if (product.store === 'Home Centre') {
      details.title = $('h1.product-name').text().trim();
      details.price = $('.product-price').first().text().trim();
      details.image = $('.product-image img').first().attr('src');
      
    } else if (product.store === 'JYSK') {
      details.title = $('h1.product-name').text().trim();
      details.price = $('.price').first().text().trim();
      details.image = $('.product-image img').first().attr('src');
      
    } else {
      // Generic selectors
      details.title = $('h1').first().text().trim();
      details.price = $('[class*="price"]').first().text().trim();
      details.image = $('img').first().attr('src');
    }
    
    // Clean up image URL
    if (details.image && !details.image.startsWith('http')) {
      const baseUrl = new URL(product.url);
      details.image = baseUrl.origin + details.image;
    }
    
    // Display results
    console.log('✅ FOUND PRODUCT DETAILS:\n');
    console.log(`📦 Title: ${details.title || 'Not found'}`);
    console.log(`💰 Price: ${details.price || 'Not found'}`);
    console.log(`🖼️  Image: ${details.image ? details.image.substring(0, 80) + '...' : 'Not found'}`);
    if (details.description) {
      console.log(`📄 Description: ${details.description}...`);
    }
    
    console.log(`\n🌐 DIRECT LINK: ${product.url}`);
    console.log('\n💡 ACTION: Open this link in your browser to see the actual product!');
    
  } catch (error) {
    console.log(`❌ Could not fetch product page: ${error.message}`);
    console.log(`\n🌐 MANUAL CHECK REQUIRED: ${product.url}`);
    console.log('💡 Open this link manually to verify the product');
  }
}

async function verifyAll() {
  console.log('🧪 VERIFYING TOP PRODUCT MATCHES\n');
  console.log('This will fetch actual product pages to show images and details...\n');
  
  for (const product of PRODUCTS_TO_VERIFY) {
    await verifyProduct(product);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between requests
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('\n📋 VERIFICATION SUMMARY:\n');
  console.log('✅ Check if the products visually match your requirements:');
  console.log('   - Sofa: 4-seat L-shaped, beige, wooden legs?');
  console.log('   - Armchair: Single seat, cream/beige, oak legs, rounded?');
  console.log('   - Coffee Table: Round, light wood, ~80cm, pedestal base?');
  console.log('\n💡 Open each URL in your browser to see full images and details!');
  console.log('\n🎯 If matches are good → Algorithm is working!');
  console.log('🎯 If matches are wrong → We need to improve ranking!\n');
}

verifyAll().then(() => {
  console.log('✅ Verification complete!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
