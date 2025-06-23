// update-green-line-west-prefix.js - Add "M" prefix to Green Line West signals
const sqlite3 = require('sqlite3').verbose();

// Initialize database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Function to update Green Line West signals with "M" prefix
const updateGreenLineWestSignals = () => {
  return new Promise((resolve, reject) => {
    // First, let's see what signals we have for Green Line West
    db.all('SELECT * FROM signals WHERE line = ?', ['Green Line West'], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`Found ${rows.length} Green Line West signals:`);
      rows.forEach(signal => {
        const currentSignal = (signal.prefix || '') + signal.number + (signal.suffix || '');
        console.log(`  ID: ${signal.id}, Current: "${currentSignal}" (Prefix: "${signal.prefix}", Number: "${signal.number}", Suffix: "${signal.suffix}")`);
      });
      
      if (rows.length === 0) {
        console.log('No Green Line West signals found to update.');
        resolve();
        return;
      }
      
      // Update each signal to add "M" prefix
      const updatePromises = rows.map(signal => {
        return new Promise((resolveUpdate, rejectUpdate) => {
          // Only add "M" if there's no prefix already, or if the prefix doesn't already contain "M"
          let newPrefix = signal.prefix || '';
          if (!newPrefix.includes('M')) {
            newPrefix = 'M' + newPrefix;
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
          console.log('All Green Line West signals updated successfully!');
          resolve();
        })
        .catch(reject);
    });
  });
};

// Main execution function
const main = async () => {
  try {
    console.log('Starting update of Green Line West signals...');
    await updateGreenLineWestSignals();
    
    // Verify the updates
    console.log('\nVerifying updates...');
    await new Promise((resolve, reject) => {
      db.all('SELECT * FROM signals WHERE line = ?', ['Green Line West'], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`\nAfter update - Green Line West signals:`);
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
