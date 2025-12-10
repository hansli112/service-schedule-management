# Service Schedule Management Tool - Project Documentation
## 竹圍靈糧福音中心服事表安排系統

### Project Overview
Service Schedule Management Tool is a comprehensive scheduling system for managing service assignments and worker rotations at Zhuwei Ling Liang Gospel Center.

---

## Project Structure

```
service-schedule-management/
├── pages/
│   ├── Schedule.js           # Main scheduling interface
│   ├── Workers.js            # Worker management page
│   └── ServiceSettings.js     # Service configuration page
├── components/
│   ├── schedule/
│   │   ├── WorkerSelector.js         # Worker selection dialog
│   │   ├── ScheduleGrid.js           # Schedule grid display
│   │   ├── ExportableScheduleGrid.js # Grid with export functionality
│   │   ├── AutoScheduler.js          # Automatic scheduling logic
│   │   ├── ServiceConfig.js          # Service item configuration
│   │   ├── NoticePanel.js            # Notes and announcements
│   │   ├── ImportantDatesPanel.js    # Special dates/tags
│   │   ├── WorkerStatsPanel.js       # Worker statistics
│   │   ├── ScheduleTypePicke.js      # Schedule type selector
│   │   ├── QuarterPicker.js          # Quarter/season selector
│   │   ├── TagEditor.js              # Date tag editor
│   │   └── ScheduleWarnings.js       # Conflict warnings
│   └── workers/
│       └── WorkerEditor.js           # Worker form editor
├── entities/
│   ├── Worker.js             # Worker data model
│   ├── Schedule.js           # Schedule data model
│   ├── ServiceItem.js        # Service role definitions
│   ├── ServiceConfig.js      # Service configuration
│   ├── ImportantDate.js      # Special date data model
│   └── AppSettings.js        # Application settings
├── Layout.js                 # Main layout wrapper
├── README.md                 # Project overview
├── DOCUMENTATION.md          # This file
├── .gitignore               # Git ignore rules
└── package.json             # Project dependencies
```

---

## File Descriptions

### Pages
Pages represent the top-level views/routes in the application:

#### pages/Schedule.js
- **Purpose**: Main interface for scheduling and worker assignment
- **Components**: Uses ScheduleGrid, WorkerSelector, AutoScheduler, NoticePanel
- **Features**: 
  - Drag-and-drop worker reassignment
  - One-click automatic scheduling
  - Conflict detection
  - Multiple schedule types (Sunday/Youth Worship/Children's Service)

#### pages/Workers.js
- **Purpose**: Worker database management
- **Components**: Uses WorkerEditor, worker statistics
- **Features**:
  - Add/edit/delete workers
  - Assign service participation
  - View worker statistics

#### pages/ServiceSettings.js
- **Purpose**: Configure service items and scheduling rules
- **Components**: Uses ServiceConfig, TagEditor
- **Features**:
  - Add/remove/reorder service items
  - Set primary workers per service
  - Configure multi-worker services
  - Manage important dates and tags

### Components

#### Schedule Components (components/schedule/)

**WorkerSelector.js**
- Dialog component for selecting workers
- Single or multiple selection mode
- Manual worker input capability

**ScheduleGrid.js**
- Core grid component displaying schedule matrix
- Drag-and-drop functionality
- Real-time updates
- Conflict highlighting

**ExportableScheduleGrid.js**
- Extended ScheduleGrid with export-to-image feature
- Print-optimized formatting
- No background colors for clean export

**AutoScheduler.js**
- Automatic scheduling engine
- Intelligent worker rotation
- Primary worker prioritization
- Vocal assignments limited to max 2 people

**ServiceConfig.js**
- Configuration UI for service items
- Drag-to-reorder functionality
- Primary worker assignment
- Multi-worker flag toggle

**NoticePanel.js**
- Displays schedule notes/announcements
- Markdown support
- Per-schedule-type independent content

**ImportantDatesPanel.js**
- Shows special date tags (聖餐、愛餐、宣教主日, etc.)
- Per-schedule-type configuration

**WorkerStatsPanel.js**
- Displays worker assignment statistics
- Utilization rate information
- Service item breakdown

**ScheduleTypePicke.js**
- Selector for schedule type:
  - 主日 (Sunday Service)
  - 青年崇拜 (Youth Worship)
  - 兒主 (Children's Service)

**QuarterPicker.js**
- Seasonal quarter selector
- Year and quarter selection

**TagEditor.js**
- UI for creating/editing special date tags
- Color coding support

**ScheduleWarnings.js**
- Displays scheduling conflicts and warnings
- Real-time validation alerts

#### Worker Components (components/workers/)

**WorkerEditor.js**
- Modal form for creating/editing workers
- Scrollable dialog for many service roles
- Unavailable week specification
- Service type participation selection

### Entities (Data Models)

**Worker**
- Worker personal information
- Service role assignments (per schedule type)
- Unavailable weeks
- Independent per schedule type

**Schedule**
- Specific date service assignments
- Per-service worker listings
- Schedule type indicator
- Special date tags
- Metadata (created_by, timestamps)

**ServiceItem**
- Service role definitions (敬拜, Vocal, 司琴, etc.)
- Schedule type association
- Multi-worker flag
- Active/inactive status

**ServiceConfig**
- Primary workers list for each service
- Worker ordering/ranking
- Schedule type specific

**ImportantDate**
- Special date markers (聖餐, 愛餐, 宣教主日, etc.)
- Associated schedule type
- Display metadata

**AppSettings**
- Global application configuration
- Default service items
- UI preferences per schedule type

---

## Key Features

### Scheduling
- ✅ Drag-and-drop worker reassignment
- ✅ One-click automatic scheduling
- ✅ Conflict detection and highlighting
- ✅ Primary worker rotation logic
- ✅ Vocal assignment limiting (max 2 people)
- ✅ Undo/Redo support

### Data Management
- ✅ Worker CRUD operations
- ✅ Service item configuration
- ✅ Per-schedule-type data isolation
- ✅ Availability/unavailable week tracking

### Multiple Schedule Types
- ✅ 主日 (Sunday Service)
- ✅ 青年崇拜 (Youth Worship - Saturday)
- ✅ 兒主 (Children's Service)
- ✅ Fully independent worker and service item management

### User Experience
- ✅ Responsive modal dialogs
- ✅ Scrollable forms for many options
- ✅ Color-coded worker pills
- ✅ Markdown support in notes
- ✅ Export to image for printing

---

## Accessing Code in Base44

All source code is available in the Base44 platform at:

```
https://app.base44.com/apps/692fbe6257a177cfdc1e6e9f/editor/workspace/code
```

To access a specific file, append the filePath parameter:

```
?filePath=components%2Fschedule%2FWorkerSelector
```

### File Path Patterns
- Components: `components/schedule/ComponentName`
- Workers: `components/workers/ComponentName`
- Pages: `Pages/PageName`
- Entities: `entities/Entity Name` (space-separated)

---

## Notes

- **Repository Purpose**: This GitHub repository serves as a backup and structural reference for the Base44 project
- **Code Editing**: Full code editing available in Base44 platform
- **Placeholder Files**: Files in this repo contain placeholders pointing to Base44 source
- **Structure**: File structure mirrors the original Base44 project layout
- **Last Updated**: December 2025

---

## Getting Started

1. View the project structure in the `/pages` and `/components` directories
2. Check individual files for component descriptions
3. Access full code in Base44 platform
4. Follow the component documentation for implementation details

---

For more information, please contact the project maintainer or refer to the Base44 platform directly.
