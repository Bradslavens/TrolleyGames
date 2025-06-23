# SchemaPro Pages

This folder contains the page images for the SchemaPro game.

## File naming convention:
- Page_1.jpg or Page_1.png
- Page_2.jpg or Page_2.png  
- Page_3.jpg or Page_3.png
- etc.

## Supported formats:
- .jpg
- .jpeg
- .png

## Instructions:
1. Add your schema page images to this folder
2. Name them sequentially starting with Page_1 (capital P)
3. The game will automatically detect and load all pages
4. Make sure images are appropriately sized for web display

## Signal Configuration:
Signals are now loaded from the database based on:
- **Line**: The selected trolley line
- **Page**: page_1, page_2, etc. (stored in database page field)

Configure signals through the admin interface at `/admin.html` with:
- Set the **page** field to match the image (e.g., "page_1" for Page_1.jpg)
- Set **hitbox coordinates** (x, y, width, height) for clickable areas
- Mark signals as **correct** that should be found in the game
