const axios = require('axios');

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || 'serp_api1';

async function searchGoogle(query) {
  try {
    console.log(`🔍 Searching: "${query}"`);
    
    const response = await axios.post(
      'https://api.brightdata.com/request',
      {
        zone: BRIGHTDATA_ZONE,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=kw&hl=en`,
        format: 'json'
      },
      {
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 45000  // Increased from 30s to 45s
      }
    );

    let jsonData;
    if (typeof response.data.body === 'string') {
      jsonData = JSON.parse(response.data.body);
    } else if (typeof response.data.body === 'object') {
      jsonData = response.data.body;
    } else {
      jsonData = response.data;
    }

    const results = parseBrightDataJSON(jsonData, query);
    console.log(`   ✅ Found ${results.length} results`);
    
    return results;

  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error(`   ⏱️ Timeout - skipping this query`);
    } else {
      console.error(`   ❌ Error:`, error.message);
    }
    return [];
  }
}

function parseBrightDataJSON(data, query) {
  const results = [];
  
  try {
    // BrightData returns results in "organic" array (confirmed from logs)
    let items = [];
    
    if (data.organic && Array.isArray(data.organic)) {
      items = data.organic;
    } else if (data.organic_results && Array.isArray(data.organic_results)) {
      items = data.organic_results;
    } else if (data.results && Array.isArray(data.results)) {
      items = data.results;
    }
    
    items.forEach(item => {
      const title = item.title || item.name || '';
      const link = item.url || item.link || item.href || '';
      const snippet = item.snippet || item.description || item.text || '';
      
      if (title && link && link.startsWith('http')) {
        results.push({
          title: title,
          link: link,
          snippet: snippet,
          query: query
        });
      }
    });
    
  } catch (parseError) {
    console.error('   ⚠️ Parse error:', parseError.message);
  }
  
  return results;
}

async function fetchProductPage(url) {
  try {
    const response = await axios.post(
      'https://api.brightdata.com/request',
      {
        zone: BRIGHTDATA_ZONE,
        url: url,
        format: 'json'
      },
      {
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );
    return response.data.body || response.data;
  } catch (error) {
    return null;
  }
}

module.exports = {
  searchGoogle,
  fetchProductPage
};
