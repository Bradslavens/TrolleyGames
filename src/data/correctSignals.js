// correctSignals.js
export const USE_TEST_SIGNALS = false;

// Static fallback data (used when database is not available)
export const correctSignals = {
  "Blue Line North East": ["2", "046", "089", "086", "123"],
  "Blue Line North West": ["2", "048", "087", "088", "121"],
  "Blue Line South East": ["154", "16", "226", "287", "296"],
  "Blue Line South West": ["16", "285", "298", "345", "387"],
  "Orange Line East": ["358", "466", "6", "8", "10"],
  "Orange Line West": ["439", "509", "6", "8", "10"],
  "Green Line East": ["2", "404", "434", "4", "504"],
  "Green Line West": ["2", "406", "436", "4", "506"]
};

export const correctSignalsTest = {
  "Blue Line North East": ["2", "046", "089"],
  "Blue Line North West": ["2", "048", "087"],
  "Blue Line South East": ["154", "16", "226"],
  "Blue Line South West": ["16", "285", "298"],
  "Orange Line East": ["358", "466", "6"],
  "Orange Line West": ["439", "509", "6"],
  "Green Line East": ["2", "404", "434"],
  "Green Line West": ["2", "406", "436"]
};

// Dynamic signals loader - fetches from database when available
class SignalsLoader {
  constructor() {
    this.baseURL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://trolleygames-server.onrender.com';
    this.cachedSignals = null;
    this.cachedTestSignals = null;
  }

  async getCorrectSignals() {
    try {
      if (this.cachedSignals) {
        return this.cachedSignals;
      }

      const response = await fetch(`${this.baseURL}/api/signals/export/correctSignals`);
      if (response.ok) {
        const data = await response.json();
        this.cachedSignals = data.correctSignals;
        return this.cachedSignals;
      }
    } catch (error) {
      console.warn('Could not fetch signals from database, using static data:', error);
    }
    
    // Fallback to static data
    return USE_TEST_SIGNALS ? correctSignalsTest : correctSignals;
  }

  async getTestSignals() {
    try {
      if (this.cachedTestSignals) {
        return this.cachedTestSignals;
      }

      const response = await fetch(`${this.baseURL}/api/signals?page=test`);
      if (response.ok) {
        const data = await response.json();
        const testSignals = {};
        
        data.signals.forEach(signal => {
          const key = signal.line;
          if (!testSignals[key]) {
            testSignals[key] = [];
          }
          const signalNumber = (signal.prefix || '') + signal.number + (signal.suffix || '');
          testSignals[key].push(signalNumber);
        });
        
        this.cachedTestSignals = testSignals;
        return this.cachedTestSignals;
      }
    } catch (error) {
      console.warn('Could not fetch test signals from database, using static data:', error);
    }
    
    // Fallback to static test data
    return correctSignalsTest;
  }

  // Clear cache to force reload from database
  clearCache() {
    this.cachedSignals = null;
    this.cachedTestSignals = null;
  }
}

// Export singleton instance
export const signalsLoader = new SignalsLoader();

// Convenience function for backward compatibility
export async function getSignals() {
  if (USE_TEST_SIGNALS) {
    return await signalsLoader.getTestSignals();
  } else {
    return await signalsLoader.getCorrectSignals();
  }
}
