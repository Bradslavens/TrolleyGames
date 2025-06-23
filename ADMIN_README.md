# Trolley Games Signal Admin System

This admin system provides a comprehensive interface for managing signal data for your Trolley Games project.

## Features

- **CRUD Operations**: Create, read, update, and delete signals
- **Database Storage**: All signals are stored in SQLite database for persistence
- **Admin Interface**: User-friendly web interface for managing signals
- **Import/Export**: Import signals from JSON and export current signals
- **Filtering**: Filter signals by line and page
- **Pagination**: Handle large datasets efficiently
- **Hitbox Management**: Define clickable areas for each signal
- **Backward Compatibility**: Existing games continue to work with fallback data

## Database Schema

The `signals` table contains the following fields:

- `id`: Primary key (auto-increment)
- `prefix`: Text before the number (e.g., "ST", "RT")
- `number`: The main signal number (required)
- `suffix`: Text after the number (e.g., "A", "B")
- `correct`: Boolean indicating if this is a correct signal
- `location`: Description of signal location
- `hitbox_x`, `hitbox_y`: Position coordinates for clickable area
- `hitbox_width`, `hitbox_height`: Dimensions of clickable area
- `line`: Transit line name (required)
- `page`: Page or level identifier
- `created_at`, `updated_at`: Timestamps

## Setup Instructions

### 1. Run the Migration

First, migrate your existing signal data to the database:

```bash
cd server
node migrate-signals.js
```

This will populate the database with your existing `correctSignals` data.

### 2. Start the Server

```bash
cd server
npm start
```

The server will run on port 3001 by default.

### 3. Access the Admin Interface

Open your browser and navigate to:
- Local: `http://localhost:5500/admin.html`
- Production: `https://your-domain.com/admin.html`

## API Endpoints

### Signals CRUD

- `GET /api/signals` - Get all signals (supports `?line=` and `?page=` filters)
- `GET /api/signals/:id` - Get signal by ID
- `POST /api/signals` - Create new signal
- `PUT /api/signals/:id` - Update signal
- `DELETE /api/signals/:id` - Delete signal

### Export

- `GET /api/signals/export/correctSignals` - Export in correctSignals format

## Using the Admin Interface

### Adding Signals

1. Click "Add New Signal"
2. Fill in the required fields (number and line)
3. Set correct/incorrect status
4. Define hitbox dimensions if needed
5. Save

### Importing Signals

1. Click "Import from JSON"
2. Paste JSON data in the format:
   ```json
   {
     "Blue Line North East": ["2", "046", "089"],
     "Orange Line East": ["358", "466", "6"]
   }
   ```
3. Choose import options
4. Execute import

### Filtering and Search

- Use the line dropdown to filter by transit line
- Use the page filter to search by page/level
- Clear filters to see all signals

## Integration with Games

Your games can now use signals from the database:

```javascript
import { getSignals, signalsLoader } from './data/correctSignals.js';

// Get signals (automatically uses database when available, falls back to static data)
const signals = await getSignals();

// Or use the loader directly for more control
const correctSignals = await signalsLoader.getCorrectSignals();
const testSignals = await signalsLoader.getTestSignals();
```

## File Structure

```
├── server/
│   ├── server.js              # Main server with API endpoints
│   ├── migrate-signals.js     # Migration script
│   └── users.db              # SQLite database
├── public/
│   ├── admin.html            # Admin interface
│   ├── admin-styles.css      # Admin styling
│   ├── admin-script.js       # Admin functionality
│   └── src/
│       └── signals-api.js    # API utility class
└── src/data/
    └── correctSignals.js     # Updated with database integration
```

## Security Notes

- This admin interface has no authentication - add authentication for production
- Consider adding role-based access control
- Validate and sanitize all inputs on the server side
- Use HTTPS in production

## Troubleshooting

### Database Issues

If signals don't load:
1. Check that the server is running
2. Verify the database file exists
3. Run the migration script again if needed

### CORS Issues

If admin interface can't connect to API:
1. Check CORS settings in `server.js`
2. Add your domain to `allowedOrigins`
3. Ensure server URL is correct in admin scripts

### Import/Export Problems

If import fails:
1. Verify JSON format is correct
2. Check for duplicate signal numbers
3. Ensure all required fields are present

## Future Enhancements

- User authentication and roles
- Signal validation rules
- Bulk operations
- Signal usage analytics
- Visual hitbox editor
- Signal image management
- Backup and restore functionality
