# PWA Icons

This directory should contain the following icon files for the Progressive Web App:

## Required Icons:

1. **icon-192x192.png** - 192x192 pixels
2. **icon-512x512.png** - 512x512 pixels
3. **icon-152x152.png** - 152x152 pixels (Apple)

## How to Generate Icons:

You can use any of these free tools to generate icons from your logo:

1. **RealFaviconGenerator**: https://realfavicongenerator.net/
2. **PWA Builder**: https://www.pwabuilder.com/imageGenerator
3. **Favicon.io**: https://favicon.io/

## Quick Start:

1. Create a square logo image (1024x1024 recommended)
2. Upload to one of the generators above
3. Download the generated icons
4. Place them in this directory

## File Specifications:

- **Format**: PNG
- **Background**: Should have a solid color or your app's primary color
- **Design**: Simple, clear icon that works at small sizes
- **Branding**: Include your app name or logo

## Color Recommendation:

Based on your app theme:
- Primary Color: Use your app's brand color
- Background: Solid color that contrasts well with the icon

## Example Using ImageMagick (if installed):

```bash
# Create a simple colored square icon
convert -size 512x512 xc:#0f172a -gravity center -pointsize 200 -fill white -annotate +0+0 "WB" icon-512x512.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
```

Replace #0f172a with your brand color and "WB" with your preferred text/logo.
