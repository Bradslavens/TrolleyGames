// Migration script to populate database with existing correctSignals data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Import your existing correctSignals data
const correctSignals = {
  "Blue Line North East": ["2", "046", "089", "086", "123"],
  "Blue Line North West": ["2", "048", "087", "088", "121"],
  "Blue Line South East": ["154", "16", "226", "287", "296"],
  "Blue Line South West": ["16", "285", "298", "345", "387"],
  "Orange Line East": ["358", "466", "6", "8", "10"],
  "Orange Line West": ["439", "509", "6", "8", "10"],
  "Green Line East": ["2", "404", "434", "4", "504"],
  "Green Line West": ["2", "406", "436", "4", "506"]
};

const correctSignalsTest = {
  "Blue Line North East": ["2", "046", "089"],
  "Blue Line North West": ["2", "048", "087"],
  "Blue Line South East": ["154", "16", "226"],
  "Blue Line South West": ["16", "285", "298"],
  "Orange Line East": ["358", "466", "6"],
  "Orange Line West": ["439", "509", "6"],
  "Green Line East": ["2", "404", "434"],
  "Green Line West": ["2", "406", "436"]
};

// Initialize database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create signals table if it doesn't exist
const createTable = () => {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS signals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT,
      number TEXT NOT NULL,
      suffix TEXT,
      correct BOOLEAN NOT NULL DEFAULT 0,
      hitbox_x REAL,
      hitbox_y REAL,
      hitbox_width REAL,
      hitbox_height REAL,
      line TEXT NOT NULL,
      page TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Function to parse signal number and extract prefix, number, suffix
const parseSignalNumber = (signalStr) => {
  // Handle cases like "046", "2", "358", etc.
  const match = signalStr.match(/^([A-Za-z]*)(\d+)([A-Za-z]*)$/);
  if (match) {
    return {
      prefix: match[1] || '',
      number: match[2],
      suffix: match[3] || ''
    };
  }
  // Fallback - treat the whole string as number
  return {
    prefix: '',
    number: signalStr,
    suffix: ''
  };
};

// Function to insert signals
const insertSignals = (signalsData, isCorrect = true, isTest = false) => {
  return new Promise((resolve, reject) => {
    const insertPromises = [];
    
    for (const [line, signals] of Object.entries(signalsData)) {
      for (let i = 0; i < signals.length; i++) {
        const signalStr = signals[i];
        const parsed = parseSignalNumber(signalStr);
        
        const insertPromise = new Promise((resolveInsert, rejectInsert) => {
          const query = `INSERT INTO signals 
            (prefix, number, suffix, correct, hitbox_x, hitbox_y, hitbox_width, hitbox_height, line, page) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
          
          const params = [
            parsed.prefix,
            parsed.number,
            parsed.suffix,
            isCorrect ? 1 : 0,
            0,  // hitbox_x
            0,  // hitbox_y
            0,  // hitbox_width
            0,  // hitbox_height
            line,
            isTest ? 'test' : '' // page
          ];
          
          db.run(query, params, function(err) {
            if (err) {
              console.error(`Error inserting signal ${signalStr} for ${line}:`, err);
              rejectInsert(err);
            } else {
              console.log(`Inserted signal ${signalStr} for ${line} (ID: ${this.lastID})`);
              resolveInsert();
            }
          });
        });
        
        insertPromises.push(insertPromise);
      }
    }
    
    Promise.all(insertPromises)
      .then(() => resolve())
      .catch(reject);
  });
};

// Main migration function
const migrate = async () => {
  try {
    console.log('Starting migration...');
    
    // Create table
    await createTable();
    console.log('Signals table created/verified');
    
    // Clear existing signals (optional - remove this if you want to keep existing data)
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM signals', (err) => {
        if (err) reject(err);
        else {
          console.log('Cleared existing signals');
          resolve();
        }
      });
    });
    
    // Insert correct signals
    await insertSignals(correctSignals, true, false);
    console.log('Correct signals inserted');
    
    // Insert test signals
    await insertSignals(correctSignalsTest, true, true);
    console.log('Test signals inserted');
    
    // Verify the migration
    await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM signals', (err, row) => {
        if (err) reject(err);
        else {
          console.log(`Total signals in database: ${row.count}`);
          resolve();
        }
      });
    });
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed');
    });
  }
};

// Run migration
migrate();
