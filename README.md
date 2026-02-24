# Botnoi Flow - Frontend

Frontend application สำหรับ Botnoi Flow Project Management System

## 🛠️ Tech Stack

- **Next.js 14** - React Framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS Framework
- **Shadcn UI** - Re-usable components built with Radix UI
- **Lucide React** - Beautiful & consistent icons
- **Axios** - HTTP Client

## 📁 โครงสร้างโปรเจค

```
frontend/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/            # React Components
│   ├── Header.tsx        # Top navigation
│   ├── Sidebar.tsx       # Side navigation
│   ├── KanbanBoard.tsx   # Board container
│   ├── TaskCard.tsx      # Task card component
│   └── TaskModal.tsx     # Task details modal
├── services/             # API Services
│   └── api.ts           # API client & methods
├── types/               # TypeScript Types
│   └── task.ts         # Task interfaces
└── lib/                # Utilities
    └── utils.ts        # Helper functions
```

## 🚀 การติดตั้งและใช้งาน

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:3000`

### Build

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## 🔧 Configuration

### Environment Variables

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API Integration

แก้ไขไฟล์ `next.config.js` สำหรับ proxy API requests:

```javascript
async rewrites() {
  return [
    {
      source: '/api/:path*',
      destination: 'http://localhost:8000/api/:path*',
    },
  ]
}
```

## 📦 Components

### Header
- Navigation bar
- Search functionality
- User profile
- Create task button

### Sidebar
- Project navigation
- Board sections
- Quick links

### KanbanBoard
- Three column layout (To Do, In Progress, Done)
- Task filtering
- Drag & drop support (coming soon)

### TaskCard
- Task preview
- Priority badge
- Assignee avatar
- Story points

### TaskModal
- Full task details
- Edit functionality
- Status update
- Delete option

## 🎨 Styling

### Tailwind CSS

ใช้ utility classes จาก Tailwind CSS:

```tsx
<div className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg">
  Content
</div>
```

### Shadcn UI Variables

CSS variables ใน `globals.css`:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... */
}
```

## 🔌 API Service

### Usage Example

```typescript
import { taskService } from '@/services/api'

// Get all tasks
const tasks = await taskService.getTasks()

// Create task
const newTask = await taskService.createTask({
  title: "New Task",
  description: "Description",
  status: "todo",
  priority: "high",
  assignee: "John",
  type: "task",
  points: 5
})

// Update task
await taskService.updateTask(1, { status: "done" })

// Delete task
await taskService.deleteTask(1)
```

## 📱 Responsive Design

- Mobile First Approach
- Breakpoints:
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
  - `2xl`: 1536px

## 🚧 Features Coming Soon

- [ ] Drag & Drop Tasks
- [ ] Real-time Updates
- [ ] Dark Mode
- [ ] User Authentication
- [ ] Team Collaboration
- [ ] Task Comments
- [ ] File Attachments
- [ ] Activity Timeline

## 🐛 Known Issues

- None reported yet

## 📄 License

MIT
