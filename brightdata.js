require('dotenv').config();
const axios = require('axios');

const BRIGHTDATA_TOKEN = process.env.BRIGHTDATA_TOKEN || '8b5761c8-dc4e-4176-a1cf-c1a22fcb23d0';
const BRIGHTDATA_ZONE = process.env.BRIGHTDATA_ZONE || 'kuwait_furniture_finder';

const TIMEOUT = 90000;
const MAX_RETRIES = 3;

async function searchGoogle(query) {
  console.log(`🔍 Searching: "${query}"`);
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        'https://api.brightdata.com/request',
        {
          zone: BRIGHTDATA_ZONE,
          url: `https://www.google.com.kw/search?q=${encodeURIComponent(query)}&gl=KW&hl=en&num=20`,
          format: 'json'
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${BRIGHTDATA_TOKEN}`
          },
          timeout: TIMEOUT
        }
      );
      
      let data = response.data;
      
      // ⭐ FIX: Extract body if wrapped
      if (data.body) {
        console.log(`   📦 Unwrapping body field...`);
        
        // Body might be string (HTML) or JSON
        if (typeof data.body === 'string') {
          try {
            data = JSON.parse(data.body);
            console.log(`   ✅ Parsed body as JSON`);
          } catch {
            // Body is HTML string
            console.log(`   ⚠️ Body is HTML, parsing...`);
            const results = parseGoogleHTML(data.body);
            console.log(`   ✅ Found ${results.length} results (HTML)`);
            return results;
          }
        } else {
          data = data.body;
        }
      }
      
      // Try to extract from JSON
      const results = extractFromJSON(data);
      console.log(`   ✅ Found ${results.length} results (JSON)`);
      return results;
      
    } catch (error) {
      const errorMsg = error.response?.status 
        ? `${error.response.status} ${error.response.statusText}`
        : error.code === 'ECONNABORTED' 
        ? 'Timeout' 
        : error.message;
      
      console.log(`   ❌ Error (attempt ${attempt}/${MAX_RETRIES}): ${errorMsg}`);
      
      if (attempt < MAX_RETRIES) {
        await sleep(3000);
        continue;
      }
      
      return [];
    }
  }
  
  return [];
}

function extractFromJSON(data) {
  const results = [];
  
  if (data.organic && Array.isArray(data.organic)) {
    data.organic.forEach(item => {
      if (item.link && item.title) {
        results.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet || item.description || ''
        });
      }
    });
  }
  
  if (data.results && Array.isArray(data.results)) {
    data.results.forEach(item => {
      if (item.url && item.title) {
        results.push({
          title: item.title,
          link: item.url,
          snippet: item.snippet || item.description || ''
        });
      }
    });
  }
  
  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.link && item.title) {
        results.push({
          title: item.title,
          link: item.link,
          snippet: item.snippet || ''
        });
      }
    });
  }
  
  return results;
}

function parseGoogleHTML(html) {
  const results = [];
  
  // Extract search results from Google HTML
  const titlePattern = /<h3[^>]*class="[^"]*LC20lb[^"]*"[^>]*>(.*?)<\/h3>/g;
  const linkPattern = /<a[^>]*href="([^"]+)"[^>]*><h3/g;
  
  const titles = [];
  const links = [];
  
  let match;
  while ((match = titlePattern.exec(html)) !== null) {
    const title = match[1].replace(/<[^>]*>/g, '').trim();
    if (title) titles.push(title);
  }
  
  html = html.replace(/&amp;/g, '&');
  while ((match = linkPattern.exec(html)) !== null) {
    let link = match[1];
    if (link.startsWith('/url?q=')) {
      link = link.substring(7).split('&')[0];
      link = decodeURIComponent(link);
    }
    if (link.startsWith('http') && !link.includes('google.com')) {
      links.push(link);
    }
  }
  
  const count = Math.min(titles.length, links.length, 20);
  for (let i = 0; i < count; i++) {
    results.push({
      title: titles[i],
      link: links[i],
      snippet: ''
    });
  }
  
  return results;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { searchGoogle };
