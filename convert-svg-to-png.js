const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// SVG content for each icon size
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#007aff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/>
  <path d="M9 3v18"/>
  <path d="M15 10l-2 2 2 2"/>
</svg>`;

// Create SVG files
const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const svgPath = path.join(iconsDir, `icon${size}.svg`);
  const pngPath = path.join(iconsDir, `icon${size}.png`);
  
  // Write SVG file
  fs.writeFileSync(svgPath, svgContent);
  
  // Convert to PNG using Inkscape (must be installed)
  try {
    execSync(`inkscape -w ${size} -h ${size} -o "${pngPath}" "${svgPath}"`);
    console.log(`Created ${pngPath}`);
  } catch (error) {
    console.error(`Error converting to PNG. Make sure Inkscape is installed and in your PATH.`);
    console.error(`You can install it from: https://inkscape.org/release/`);
    process.exit(1);
  }
});

console.log('Icons generated successfully!');
