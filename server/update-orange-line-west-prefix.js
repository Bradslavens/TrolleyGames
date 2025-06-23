// update-orange-line-west-prefix.js - Add "E" prefix to Orange Line West signals
const sqlite3 = require('sqlite3').verbose();

// Initialize database
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Function to update Orange Line West signals with "E" prefix
const updateOrangeLineWestSignals = () => {
  return new Promise((resolve, reject) => {
    // First, let's see what signals we have for Orange Line West
    db.all('SELECT * FROM signals WHERE line = ?', ['Orange Line West'], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      console.log(`Found ${rows.length} Orange Line West signals:`);
      rows.forEach(signal => {
        const currentSignal = (signal.prefix || '') + signal.number + (signal.suffix || '');
        console.log(`  ID: ${signal.id}, Current: "${currentSignal}" (Prefix: "${signal.prefix}", Number: "${signal.number}", Suffix: "${signal.suffix}")`);
      });
      
      if (rows.length === 0) {
        console.log('No Orange Line West signals found to update.');
        resolve();
        return;
      }
      
      // Update each signal to add "E" prefix
      const updatePromises = rows.map(signal => {
        return new Promise((resolveUpdate, rejectUpdate) => {
          // Only add "E" if there's no prefix already, or if the prefix doesn't already contain "E"
          let newPrefix = signal.prefix || '';
          if (!newPrefix.includes('E')) {
            newPrefix = 'E' + newPrefix;
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
          console.log('All Orange Line West signals updated successfully!');
          resolve();
        })
        .catch(reject);
    });
  });
};

// Main execution function
const main = async () => {
  try {
    console.log('Starting update of Orange Line West signals...');
    await updateOrangeLineWestSignals();
    
    // Verify the updates
    console.log('\nVerifying updates...');
    await new Promise((resolve, reject) => {
      db.all('SELECT * FROM signals WHERE line = ?', ['Orange Line West'], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log(`\nAfter update - Orange Line West signals:`);
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
