// signals-api.js - Utility to get signals from database and format them for your games
class SignalsAPI {
    constructor(baseURL = 'http://localhost:3001') {
        this.baseURL = baseURL;
    }

    // Get all signals from the database
    async getAllSignals() {
        try {
            const response = await fetch(`${this.baseURL}/api/signals`);
            const data = await response.json();
            return data.signals || [];
        } catch (error) {
            console.error('Error fetching signals:', error);
            return [];
        }
    }

    // Get signals for a specific line
    async getSignalsByLine(line) {
        try {
            const response = await fetch(`${this.baseURL}/api/signals?line=${encodeURIComponent(line)}`);
            const data = await response.json();
            return data.signals || [];
        } catch (error) {
            console.error('Error fetching signals for line:', error);
            return [];
        }
    }

    // Get only correct signals formatted like your original correctSignals object
    async getCorrectSignals() {
        try {
            const response = await fetch(`${this.baseURL}/api/signals/export/correctSignals`);
            const data = await response.json();
            return data.correctSignals || {};
        } catch (error) {
            console.error('Error fetching correct signals:', error);
            return {};
        }
    }

    // Get incorrect signals (for generating wrong answers)
    async getIncorrectSignals() {
        try {
            const signals = await this.getAllSignals();
            const incorrectSignals = {};
            
            signals.filter(signal => !signal.correct).forEach(signal => {
                const key = signal.line;
                if (!incorrectSignals[key]) {
                    incorrectSignals[key] = [];
                }
                const signalNumber = (signal.prefix || '') + signal.number + (signal.suffix || '');
                incorrectSignals[key].push(signalNumber);
            });
            
            return incorrectSignals;
        } catch (error) {
            console.error('Error fetching incorrect signals:', error);
            return {};
        }
    }

    // Get signals for a specific game level/page
    async getSignalsForPage(line, page) {
        try {
            const response = await fetch(`${this.baseURL}/api/signals?line=${encodeURIComponent(line)}&page=${encodeURIComponent(page)}`);
            const data = await response.json();
            return data.signals || [];
        } catch (error) {
            console.error('Error fetching signals for page:', error);
            return [];
        }
    }

    // Format signals for game use (includes hitbox data)
    formatSignalsForGame(signals) {
        return signals.map(signal => ({
            id: signal.id,
            number: (signal.prefix || '') + signal.number + (signal.suffix || ''),
            correct: signal.correct,
            location: signal.location,
            hitbox: {
                x: signal.hitbox_x,
                y: signal.hitbox_y,
                width: signal.hitbox_width,
                height: signal.hitbox_height
            },
            line: signal.line,
            page: signal.page
        }));
    }

    // Generate test data (shorter lists for testing)
    async getTestSignals() {
        try {
            const signals = await this.getAllSignals();
            const testSignals = {};
            
            // Group by line and take first 3 correct signals from each
            signals.filter(signal => signal.correct).forEach(signal => {
                const key = signal.line;
                if (!testSignals[key]) {
                    testSignals[key] = [];
                }
                if (testSignals[key].length < 3) {
                    const signalNumber = (signal.prefix || '') + signal.number + (signal.suffix || '');
                    testSignals[key].push(signalNumber);
                }
            });
            
            return testSignals;
        } catch (error) {
            console.error('Error generating test signals:', error);
            return {};
        }
    }
}

// Export for use in your games
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SignalsAPI;
} else {
    window.SignalsAPI = SignalsAPI;
}
