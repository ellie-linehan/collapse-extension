const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// SVG content (same as your icon16.svg)
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
  <path d="M9 3v18"/>
  <path d="M15 10l-2 2 2 2"/>
</svg>`;

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sizes we need
const sizes = [16, 32, 48, 128];

// Convert function
async function convertSvgToPng() {
  try {
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon${size}.png`);
      
      await sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
      })
      .composite([{
        input: Buffer.from(svgContent),
        top: 0,
        left: 0,
      }])
      .png()
      .toFile(outputPath);
      
      console.log(`Created ${outputPath}`);
    }
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

// Run the conversion
convertSvgToPng();
