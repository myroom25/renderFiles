const axios = require('axios');
const fs = require('fs');

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Detect furniture items with DETAILED specifications
async function detectFurnitureItems(imagePath) {
  try {
    const buffer = fs.readFileSync(imagePath);
    const base64Image = buffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    console.log('🤖 Sending image to Claude for detailed analysis...');

    const response = await axios.post(
      CLAUDE_API_URL,
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: `Analyze this room image and detect ALL furniture and decor items with MAXIMUM DETAIL.

For SOFAS/SEATING - You MUST specify:
- Exact seat count (2-seat, 3-seat, 4-seat, etc.) - COUNT THE CUSHIONS!
- Configuration (straight, L-shaped, U-shaped, corner, sectional, chaise)
- Material (fabric, leather, velvet, linen, suede)
- Color (specific: "light beige", "warm gray", not just "beige")
- Leg style (wooden tapered, metal, hidden, block)
- Arm style (rounded, squared, track, rolled)

For TABLES - You MUST specify:
- Shape (round, square, rectangular, oval, irregular)
- Size estimate (small/medium/large or approx dimensions if visible)
- Material (solid wood, marble, glass, metal, composite)
- Base style (pedestal, 4-leg, trestle, cross-base)

For ALL ITEMS - Include:
- Brand/style clues if visible (IKEA-style, mid-century, industrial, etc.)
- Condition (new-looking, vintage, distressed)
- Any unique features (storage, adjustable, folding, etc.)

Return ONLY a JSON array with this structure:
[{
  "type": "sofa",
  "description": "3-seat straight sofa in light beige linen fabric with rounded arms and natural wood tapered legs, mid-century modern style, approximately 200cm wide",
  "search_keywords": ["3 seater sofa beige", "linen sofa", "mid century sofa", "tapered wooden legs", "straight sofa 200cm"]
}]

Be SPECIFIC, not generic. Count seats, measure proportions, identify exact materials.`
              }
            ]
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const content = response.data.content[0].text;
    
    let items = [];
    try {
      const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
      items = JSON.parse(cleanJson);
      console.log(`✅ Claude detected ${items.length} items with detailed specs`);
      
      // Log first item as example
      if (items.length > 0) {
        console.log(`📋 Example: ${items[0].type}`);
        console.log(`   Description: ${items[0].description.substring(0, 100)}...`);
      }
      
    } catch (parseError) {
      console.error('⚠️ Failed to parse Claude response');
      items = [{
        type: 'furniture',
        description: 'Furniture item',
        search_keywords: ['furniture']
      }];
    }

    return items;

  } catch (error) {
    console.error('❌ Claude API error:', error.response?.data || error.message);
    throw new Error('Failed to analyze image with Claude AI');
  }
}

module.exports = {
  detectFurnitureItems
};
