/**
 * Generate placeholder PWA icons
 * This creates simple SVG-based placeholder icons until proper icons are designed
 */

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icon for each size
sizes.forEach(size => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  
  <!-- Shopping Cart Icon -->
  <g transform="translate(${size * 0.25}, ${size * 0.25})">
    <path d="M ${size * 0.1} ${size * 0.05} L ${size * 0.15} ${size * 0.3} L ${size * 0.45} ${size * 0.3} L ${size * 0.4} ${size * 0.05} Z" 
          fill="white" stroke="white" stroke-width="${size * 0.02}" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${size * 0.2}" cy="${size * 0.4}" r="${size * 0.03}" fill="white"/>
    <circle cx="${size * 0.35}" cy="${size * 0.4}" r="${size * 0.03}" fill="white"/>
  </g>
  
  <!-- Text POS -->
  <text x="${size * 0.5}" y="${size * 0.8}" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.15}" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle">POS</text>
</svg>`;

  const filename = path.join(iconsDir, `icon-${size}x${size}.png`);
  
  // For now, save as SVG (can be converted to PNG with proper tools)
  const svgFilename = path.join(iconsDir, `icon-${size}x${size}.svg`);
  fs.writeFileSync(svgFilename, svg);
  
  console.log(`Generated ${svgFilename}`);
});

// Create a simple PNG fallback using Canvas (if available)
console.log('\nPlaceholder SVG icons generated!');
console.log('For production, convert these to PNG using:');
console.log('  - ImageMagick: convert icon.svg icon.png');
console.log('  - Online tools: https://www.pwabuilder.com/imageGenerator');
console.log('  - Or use the SVG files directly (most browsers support them)');

