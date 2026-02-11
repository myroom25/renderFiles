const axios = require('axios');

const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || 'serp_api1';

// Search Google using BrightData Web Scraper API
async function searchGoogle(query) {
  try {
    console.log(`🔍 Searching Google for: "${query}"`);
    
    // BrightData API endpoint
    const url = 'https://api.brightdata.com/request';
    
    // Construct Google search URL
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&gl=kw&hl=en`;
    
    const response = await axios.post(
      url,
      {
        zone: BRIGHTDATA_ZONE,
        url: googleSearchUrl,
        format: 'json'
      },
      {
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // Parse response
    const results = parseGoogleResults(response.data, query);
    console.log(`✅ Found ${results.length} results for: ${query}`);
    return results;

  } catch (error) {
    console.error(`❌ BrightData error for "${query}":`, error.response?.data || error.message);
    return [];
  }
}

// Parse Google search results from BrightData response
function parseGoogleResults(data, query) {
  const results = [];
  
  try {
    // BrightData returns different formats depending on the request
    // Try to extract organic results
    
    if (typeof data === 'string') {
      // If we got HTML, we need to parse it
      const cheerio = require('cheerio');
      const $ = cheerio.load(data);
      
      // Parse Google search result divs
      $('.g, .tF2Cxc').each((i, elem) => {
        const $elem = $(elem);
        const title = $elem.find('h3').first().text().trim();
        const link = $elem.find('a').first().attr('href');
        const snippet = $elem.find('.VwiC3b, .s, .st').first().text().trim();
        
        if (title && link && link.startsWith('http')) {
          results.push({
            title: title,
            link: link,
            snippet: snippet,
            query: query
          });
        }
      });
    } else if (data.organic_results) {
      // If BrightData returns structured data
      return data.organic_results.map(result => ({
        title: result.title || '',
        link: result.link || result.url || '',
        snippet: result.snippet || result.description || '',
        query: query
      }));
    } else if (Array.isArray(data)) {
      // If data is already an array
      return data.map(result => ({
        title: result.title || '',
        link: result.link || result.url || '',
        snippet: result.snippet || result.description || '',
        query: query
      }));
    }
  } catch (parseError) {
    console.error('⚠️ Error parsing results:', parseError.message);
  }
  
  return results;
}

// Fetch product page (direct fetch without proxy for now)
async function fetchProductPage(url) {
  try {
    // Use BrightData to fetch the page
    const response = await axios.post(
      'https://api.brightdata.com/request',
      {
        zone: BRIGHTDATA_ZONE,
        url: url,
        format: 'raw'
      },
      {
        headers: {
          'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data;

  } catch (error) {
    console.error(`❌ Failed to fetch ${url}:`, error.message);
    
    // Fallback: Try direct fetch
    try {
      const directResponse = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      return directResponse.data;
    } catch (fallbackError) {
      console.error(`❌ Fallback fetch also failed:`, fallbackError.message);
      return null;
    }
  }
}

module.exports = {
  searchGoogle,
  fetchProductPage
};
