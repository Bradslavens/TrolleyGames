# TrolleyGames Production Deployment Guide

## Issues Fixed for Production

### 1. **CORS Configuration**
- Updated server to support multiple deployment platforms (Render, Netlify, Vercel, GitHub Pages)
- Added regex patterns for subdomain matching
- Improved error logging for CORS issues

### 2. **API URL Detection**
- Created flexible API base URL detection system
- Added configuration file (`public/config.js`) for environment-specific settings
- Added meta tag support for setting API URL during build process

### 3. **Error Handling & Timeouts**
- Added 10-second timeout for API requests
- Added 3-second timeout for image loading
- Better error messages for users
- Graceful fallback when database is unavailable

### 4. **Performance Improvements**
- Parallel image loading with Promise.allSettled
- Reduced sequential API calls
- Added maximum page limit (50) to prevent infinite loops

### 5. **User Experience**
- Better error messages explaining production issues
- Retry buttons for failed operations
- Loading indicators with informative text

## Deployment Configuration

### For Static Site Hosts (Render, Netlify, Vercel, etc.)

1. **Set API URL via meta tag** (if different from default):
   ```html
   <meta name="api-url" content="https://your-api-server.com" />
   ```

2. **Or configure via config.js**:
   ```javascript
   window.TROLLEY_GAMES_CONFIG.api.baseUrl = 'https://your-api-server.com';
   ```

### For Server Deployment (Render, Heroku, etc.)

1. **Environment Variables**:
   ```bash
   NODE_ENV=production
   PORT=3001
   ```

2. **CORS Setup**:
   - The server automatically detects common hosting patterns
   - Add your domain to `allowedOrigins` if needed

### File Structure Requirements

Ensure these files are included in production deployment:

```
public/
├── config.js              # Configuration file
├── index.html             # Updated with meta tag and config script
├── assets/
│   └── schemapro/
│       └── pages/         # Schema page images
│           ├── Page_1.jpg
│           ├── Page_2.png
│           └── ...
└── src/
    └── games/
        └── SchemaPro.js   # Updated game logic
```

### Testing Production Issues

1. **Test CORS**: Check browser console for CORS errors
2. **Test API connectivity**: Monitor network tab for failed API calls
3. **Test image loading**: Verify schema pages load correctly
4. **Test timeouts**: Simulate slow connections

### Common Production Issues & Solutions

1. **"No schema pages found"**:
   - Verify `assets/schemapro/pages/` folder exists in production
   - Check file naming (Page_1.jpg, Page_2.png, etc.)
   - Ensure images are included in deployment

2. **"No signals configured"**:
   - Database may not be accessible
   - Check API server URL configuration
   - Verify CORS settings

3. **CORS errors**:
   - Add your production domain to server's `allowedOrigins`
   - Check that API server supports your frontend domain

4. **Long loading times**:
   - API/image timeouts will prevent hanging
   - Users will see appropriate error messages

## Configuration Options

The `config.js` file provides these customizable settings:

```javascript
{
  api: {
    baseUrl: '',      // API server URL (auto-detected if empty)
    timeout: 10000,   // API request timeout (ms)
    retries: 2,       // Number of API retries
    retryDelay: 1000  // Delay between retries (ms)
  },
  games: {
    schemaPro: {
      maxPages: 50,        // Maximum pages to search
      imageTimeout: 3000,  // Image loading timeout (ms)
      messageTimeout: 3000 // Error message display time (ms)
    }
  }
}
```

All settings are optional and have sensible defaults.
