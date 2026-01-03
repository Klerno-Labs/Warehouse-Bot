# PWA Icons

This directory contains icons for the Progressive Web App.

## Icon Sizes Required

The manifest.json references the following icon sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152 (Apple touch icon)
- 192x192
- 384x384
- 512x512

## Generating Icons

### Option 1: Using an Online Tool (Recommended)
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload your source icon (icon.svg or a 512x512 PNG)
3. Download the generated icon package
4. Extract all PNG files to this directory

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Then run these commands from this directory:

for size in 72 96 128 144 152 192 384 512; do
  convert icon.svg -resize ${size}x${size} icon-${size}x${size}.png
done
```

### Option 3: Using Sharp (Node.js)
```bash
npm install -g sharp-cli

for size in 72 96 128 144 152 192 384 512; do
  sharp -i icon.svg -o icon-${size}x${size}.png resize ${size} ${size}
done
```

## Temporary Solution

For development/testing, you can use the icon.svg directly or create a single 512x512 PNG and copy it to all required sizes:

```bash
# Quick development setup (all icons are the same):
for size in 72 96 128 144 152 192 384 512; do
  cp icon-512x512.png icon-${size}x${size}.png
done
```

## Production Requirements

For production deployment, ensure you have:
- ✅ All icon sizes generated in PNG format
- ✅ Icons optimized (use TinyPNG or similar)
- ✅ Icons follow your brand guidelines
- ✅ Maskable icons (safe zone design)
- ✅ Apple touch icons (for iOS devices)

## Testing Icons

Test your PWA icons:
1. Chrome DevTools → Application → Manifest
2. Lighthouse PWA audit
3. Real device testing (Android & iOS)
