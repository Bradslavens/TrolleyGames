// update-blue-line-sw-prefix.js - Add "S" prefix to Blue Line South West signals
const sqlite3 = require('sqlite3').verbose();

// Initialize database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Function to update Blue Line South West signals with "S" prefix
const updateBlueLineSouthWestSignals = () => {
  return new Promise((resolve, reject) => {
    // First, let's see what signals we have for Blue Line South West
    db.all('SELECT * FROM signals WHERE line = ?', ['Blue Line South West'], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`Found ${rows.length} Blue Line South West signals:`);
      rows.forEach(signal => {
        const currentSignal = (signal.prefix || '') + signal.number + (signal.suffix || '');
        console.log(`  ID: ${signal.id}, Current: "${currentSignal}" (Prefix: "${signal.prefix}", Number: "${signal.number}", Suffix: "${signal.suffix}")`);
      });
      
      if (rows.length === 0) {
        console.log('No Blue Line South West signals found to update.');
        resolve();
        return;
      }
      
      // Update each signal to add "S" prefix
      const updatePromises = rows.map(signal => {
        return new Promise((resolveUpdate, rejectUpdate) => {
          // Only add "S" if there's no prefix already, or if the prefix doesn't already contain "S"
          let newPrefix = signal.prefix || '';
          if (!newPrefix.includes('S')) {
            newPrefix = 'S' + newPrefix;
          }
          
          const query = `UPDATE signals SET 
            prefix = ?, 
            updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`;
          
          db.run(query, [newPrefix, signal.id], function(err) {
            if (err) {
              console.error(`Error updating signal ID ${signal.id}:`, err);
              rejectUpdate(err);
            } else {
              const oldSignal = (signal.prefix || '') + signal.number + (signal.suffix || '');
              const newSignal = newPrefix + signal.number + (signal.suffix || '');
              console.log(`Updated signal ID ${signal.id}: "${oldSignal}" → "${newSignal}"`);
              resolveUpdate();
            }
          });
        });
      });
      
      Promise.all(updatePromises)
        .then(() => {
          console.log('All Blue Line South West signals updated successfully!');
          resolve();
        })
        .catch(reject);
    });
  });
};

// Main execution function
const main = async () => {
  try {
    console.log('Starting update of Blue Line South West signals...');
    await updateBlueLineSouthWestSignals();
    
    // Verify the updates
    console.log('\nVerifying updates...');
    await new Promise((resolve, reject) => {
      db.all('SELECT * FROM signals WHERE line = ?', ['Blue Line South West'], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`\nAfter update - Blue Line South West signals:`);
        rows.forEach(signal => {
          const signalString = (signal.prefix || '') + signal.number + (signal.suffix || '');
          console.log(`  ID: ${signal.id}, Signal: "${signalString}" (Prefix: "${signal.prefix}", Number: "${signal.number}", Suffix: "${signal.suffix}")`);
        });
        resolve();
      });
    });
    
    console.log('\nUpdate completed successfully!');
    
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    db.close((err) => {
      if (err) console.error('Error closing database:', err);
      else console.log('Database connection closed');
    });
  }
};

// Run the update
main();
