const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const sizes = [16, 32, 48, 128];
const inputFile = 'icon.svg';
const outputDir = 'icons';

async function generateIcons() {
  // Read the SVG file
  const svg = fs.readFileSync(inputFile, 'utf8');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Load the SVG image
  const img = await loadImage(Buffer.from(svg));
  
  // Generate each size
  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Draw the SVG to the canvas
    ctx.drawImage(img, 0, 0, size, size);
    
    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`Generated ${outputPath}`);
  }
  
  // Also create a copy of the 32x32 as the default icon.png
  const defaultIcon = await loadImage(Buffer.from(svg));
  const defaultCanvas = createCanvas(32, 32);
  const defaultCtx = defaultCanvas.getContext('2d');
  defaultCtx.drawImage(defaultIcon, 0, 0, 32, 32);
  fs.writeFileSync(path.join(outputDir, 'icon.png'), defaultCanvas.toBuffer('image/png'));
  console.log('Generated icons/icon.png');
}

generateIcons().catch(console.error);
