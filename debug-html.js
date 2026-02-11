require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

async function debugHTML() {
  console.log('🔍 Fetching Google HTML to inspect...\n');
  
  try {
    const response = await axios.post(
      'https://api.brightdata.com/request',
      {
        zone: 'serp_api1',
        url: 'https://www.google.com/search?q=sofa+Kuwait&gl=kw&hl=en',
        format: 'json'
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const html = response.data.body || response.data;
    
    console.log('✅ Got HTML, length:', html.length);
    
    // Save to file
    fs.writeFileSync('google-response.html', html);
    console.log('✅ Saved to: google-response.html');
    
    // Show first 3000 chars
    console.log('\n📄 First 3000 characters:');
    console.log('='.repeat(80));
    console.log(html.substring(0, 3000));
    console.log('='.repeat(80));
    
    // Look for common patterns
    const patterns = {
      'Has <h3>': html.includes('<h3'),
      'Has class="g"': html.includes('class="g"'),
      'Has class="tF2Cxc"': html.includes('class="tF2Cxc"'),
      'Has data-sokoban': html.includes('data-sokoban'),
      'Has "ikea.com/kw"': html.includes('ikea.com/kw'),
      'Has "homecentre"': html.includes('homecentre'),
    };
    
    console.log('\n🔍 Pattern Detection:');
    Object.entries(patterns).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugHTML();
