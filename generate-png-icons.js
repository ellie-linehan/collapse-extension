const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, 'icons/icon16.svg');
const iconsDir = path.join(__dirname, 'icons');

async function generatePNGs() {
  try {
    // Read the SVG content
    const svgContent = fs.readFileSync(svgPath, 'utf8');
    
    for (const size of sizes) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      // Create a new image from the SVG data URL
      const img = await loadImage(`data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`);
      
      // Draw the image on the canvas
      ctx.drawImage(img, 0, 0, size, size);
      
      // Save as PNG
      const out = fs.createWriteStream(path.join(iconsDir, `icon${size}.png`));
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      
      console.log(`Generated icon${size}.png`);
    }
    
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generatePNGs();
