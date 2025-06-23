// Configuration for TrolleyGames
// This file can be customized for different deployment environments

window.TROLLEY_GAMES_CONFIG = {
  // API Configuration
  api: {
    // Leave empty to use auto-detection, or set explicitly for specific environments
    baseUrl: '',
    
    // Timeout settings (in milliseconds)
    timeout: 10000,
    
    // Retry settings
    retries: 2,
    retryDelay: 1000
  },
  
  // Game-specific settings
  games: {
    schemaPro: {
      // Maximum number of pages to search for
      maxPages: 50,
      
      // Timeout for image loading (in milliseconds)
      imageTimeout: 3000,
      
      // Message display timeout (in milliseconds)
      messageTimeout: 3000
    }
  },
  
  // Environment detection
  isDevelopment: () => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.protocol === 'file:';
  },
  
  // Get the appropriate API base URL
  getApiBaseUrl: () => {
    // Use explicitly set URL if available
    if (window.TROLLEY_GAMES_CONFIG.api.baseUrl) {
      return window.TROLLEY_GAMES_CONFIG.api.baseUrl;
    }
    
    // Check meta tag
    const apiUrlMeta = document.querySelector('meta[name="api-url"]');
    if (apiUrlMeta && apiUrlMeta.content) {
      return apiUrlMeta.content;
    }
    
    // Auto-detect based on environment
    if (window.TROLLEY_GAMES_CONFIG.isDevelopment()) {
      return 'http://localhost:3001';
    }
    
    // Default production URL
    return 'https://trolleygames-server.onrender.com';
  }
};

// Export for ES modules (if supported)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.TROLLEY_GAMES_CONFIG;
}
