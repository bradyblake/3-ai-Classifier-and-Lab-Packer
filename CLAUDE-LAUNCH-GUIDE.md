# Claude Launch Guide - Project Management System

## System Overview
The Revolutionary Classifier AI-Powered Project Management System is a React-based Kanban board application with integrated waste classification and project tracking capabilities. This system includes:

- **Kanban Board**: Drag-and-drop project management
- **AI-Powered Document Parser**: Automatic project data extraction from uploaded files
- **End of Period (EOP) Archival**: Sales period closure with automated archiving
- **Recurring Job Scheduler**: Automatic creation of scheduled recurring tasks
- **Waste Classification System**: Hazardous material classification and lab pack planning

## Quick Launch Commands

### Primary Launch Method
```bash
cd "C:\Users\brady\Desktop\8-2-25\REVOLUTIONARY-CLASSIFIER\3-ai-Classifier-and-Lab-Packer"
npm run dev
```

### Alternative Ports (if primary is occupied)
```bash
# Port 3000
npm run dev -- --port 3000

# Port 5173 (Vite default)
npm run dev

# Port 5174
npm run dev -- --port 5174
```

### Background Launch
```bash
cd "C:\Users\brady\Desktop\8-2-25\REVOLUTIONARY-CLASSIFIER\3-ai-Classifier-and-Lab-Packer" && npm run dev -- --host 0.0.0.0 --port 3000 &
```

## Application URLs
After launch, access the application at:
- **Primary**: http://localhost:5173
- **Alternative**: http://localhost:3000
- **Network Access**: http://localhost:3000 (when using --host 0.0.0.0)

## Key Features and Functions

### 1. Kanban Board Management
- **Columns**: Incoming, Scheduled, In Progress, Completed, Invoiced
- **Card Operations**: Create, edit, move, archive
- **File Uploads**: Drag and drop documents for automatic parsing
- **Search and Filter**: Real-time filtering by customer, status, tags

### 2. End of Period (EOP) System
- **Access**: Click "Close Period" button in header
- **Function**: Archives completed jobs and generates period reports
- **Process**: 3-step modal workflow (Review → Archive → Complete)
- **Data**: Maintains historical records with timestamps

### 3. Recurring Jobs
- **Setup**: Right-click any card → "Set Recurring"
- **Frequencies**: Daily, Weekly, Monthly, Quarterly, Annually, Custom
- **Auto-Creation**: Automatically adds new instances to "Scheduled" column
- **Management**: Full CRUD operations with preview schedules

### 4. Document Parser
- **Supported Formats**: .txt, .csv, PDF (planned), images (planned)
- **Extraction**: Customer name, project title, job number, total amount, address
- **AI Matching**: Finds similar existing projects using string similarity
- **Confidence Scoring**: Automatic quality assessment of extracted data

## Common Troubleshooting

### Application Won't Load
1. Check if port is already in use:
   ```bash
   netstat -ano | findstr :5173
   ```
2. Kill existing processes:
   ```bash
   taskkill /PID [process_id] /F
   ```
3. Clear Vite cache:
   ```bash
   if exist "node_modules\.vite" rmdir /s /q "node_modules\.vite"
   ```

### Console Errors
- **"handleEopComplete is not defined"**: EOP modal components disabled - check imports in KanbanBoard.jsx:16-17
- **"parseGlobalDocument not exported"**: Document parser import issue - verify documentParser.js exports
- **"checkAndCreateRecurringJobs is not defined"**: Recurring job scheduler import missing - check line 34 in KanbanBoard.jsx

### Performance Issues
- Clear browser localStorage: Press F12 → Application → Storage → Clear All
- Restart development server
- Check for memory leaks in recurring job scheduler

## File Structure
```
3-ai-Classifier-and-Lab-Packer/
├── src/
│   ├── components/
│   │   ├── KanbanBoard.jsx        # Main application component
│   │   ├── EndOfPeriodModal.jsx   # EOP archival system
│   │   ├── RecurringJobModal.jsx  # Recurring job configuration
│   │   └── FileDropPanel.jsx     # Document upload interface
│   ├── utils/
│   │   ├── documentParser.js      # AI document processing
│   │   └── recurringJobScheduler.js # Job automation
│   └── App.jsx                    # Application entry point
├── package.json                   # Dependencies and scripts
└── vite.config.js                # Development server config
```

## Development Commands
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type checking (if configured)
npm run typecheck
```

## Data Storage
- **Method**: Browser localStorage
- **Keys**:
  - `kanbanCards`: All project cards
  - `kanbanLanes`: Column configuration
  - `eopArchive`: Archived period data
- **Backup**: Export functionality available in EOP modal

## Security Notes
- All data stored locally in browser
- No external API calls for sensitive data
- File uploads processed client-side only
- No authentication system (local use only)

## Integration Points

### Waste Classification System
- Access classification tools from any project card
- Generate lab pack plans and hazardous waste reports
- Export compliance documentation

### AI Document Processing
- Automatic project data extraction
- Smart project matching and deduplication
- Confidence scoring for data quality

## Launch Checklist
- [ ] Navigate to project directory
- [ ] Verify npm dependencies installed
- [ ] Check port availability (5173, 3000)
- [ ] Start development server
- [ ] Confirm application loads at localhost:5173
- [ ] Test Kanban board functionality
- [ ] Verify file upload and parsing
- [ ] Check EOP modal opens correctly
- [ ] Test recurring job setup
- [ ] Confirm data persistence in localStorage

## Emergency Recovery
If the application becomes unusable:
1. Clear all localStorage data
2. Restart development server
3. Re-import any backup data through EOP modal
4. Reconfigure recurring jobs as needed

## Contact and Support
This system is designed for local use. For issues:
1. Check console errors (F12 → Console)
2. Review this launch guide
3. Restart development server
4. Clear browser cache and localStorage

---

**Last Updated**: September 24, 2025
**System Version**: v2.1 (EOP + Recurring Jobs Enabled)
**Compatible Browsers**: Chrome, Firefox, Safari, Edge (ES2020+ required)