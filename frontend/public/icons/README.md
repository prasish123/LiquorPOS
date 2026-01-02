# PWA Icons

This directory contains the icons for the Progressive Web App.

## Required Icon Sizes

The following icon sizes are required for optimal PWA support:

- 72x72 - Android Chrome
- 96x96 - Android Chrome
- 128x128 - Android Chrome
- 144x144 - Windows 8/10
- 152x152 - iOS Safari
- 192x192 - Android Chrome (standard)
- 384x384 - Android Chrome
- 512x512 - Android Chrome (high-res)

## Generating Icons

To generate icons from a source image, you can use tools like:

1. **PWA Asset Generator**: https://github.com/elegantapp/pwa-asset-generator
   ```bash
   npx pwa-asset-generator source-icon.svg ./public/icons
   ```

2. **Online Tools**:
   - https://www.pwabuilder.com/imageGenerator
   - https://realfavicongenerator.net/

3. **ImageMagick** (command line):
   ```bash
   for size in 72 96 128 144 152 192 384 512; do
     convert source-icon.png -resize ${size}x${size} icon-${size}x${size}.png
   done
   ```

## Temporary Placeholder

Until proper icons are created, you can use the placeholder script:

```bash
cd frontend
node scripts/generate-placeholder-icons.js
```

This will create simple placeholder icons with the POS logo.

