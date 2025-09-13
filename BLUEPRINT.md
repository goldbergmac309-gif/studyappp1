# BLUEPRINT & ARCHITECTURAL STATE v7.0 - Synapse OS

**Document Status:** CANONICAL REALITY. This version specifies the architecture for **Epoch III: The Age of Synthesis & Creation.**

**Current Focus: Epoch III, Sprint 1 - The Zeitgeist Canvas & Persona System**

## 1. Target Directory Structure (Updates)

The `client` and `core-service` will expand significantly to support the new workspace and creative tools.

apps/core-service/src/
├── ... (existing modules)
└── workspace/ # <--- NEW MODULE
├── workspace.module.ts
├── workspace.controller.ts
├── workspace.service.ts
└── dto/
apps/client/src/
├── app/(dashboard)/
│ └── subjects/[subjectId]/
│ ├── _components/
│ │ ├── ... (existing tabs)
│ │ ├── canvas/ # <--- NEW: Components for the widget canvas
│ │ │ └── widget-wrapper.tsx
│ │ └── widgets/ # <--- NEW: All individual widget components
│ │ ├── notes-widget.tsx
│ │ └── mind-map-widget.tsx
│ └── canvas/ # <--- NEW: Main "Canvas" route/page
│ └── page.tsx
├── components/
│ └── nexus/ # <--- NEW: AI Nexus panel components
│ └── ai-nexus-panel.tsx
...


## 2. Data Contracts (The Law of Definition-First)

The database schema must now support storing user-defined layouts and content.

### 2.1 Database Schema (`prisma/schema.prisma`)
**New Models:**

```prisma
// --- Workspace Models ---

// Pre-defined templates for a subject's canvas
model Persona {
  id        String @id @default(cuid())
  name      String @unique // e.g., "STEM Lab", "Humanities Hub"
  widgets   Json   // Default set of widgets and their initial configuration
}

// A user's saved layout configuration
model Blueprint {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   // e.g., "My Weekly Planner Layout"
  layout    Json     // The saved positions and sizes of widgets
  
  @@unique([userId, name])
}

// An instance of a widget on a specific subject's canvas
model WidgetInstance {
  id        String    @id @default(cuid())
  subjectId String
  subject   Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  type      WidgetType // The type of widget (e.g., NOTES, MIND_MAP)
  position  Json      // { x, y } coordinates
  size      Json      // { width, height } dimensions
  content   Json      // The specific data for this widget instance

  @@index([subjectId])
}

enum WidgetType {
  NOTES
  MIND_MAP
  FLASHCARDS
  // ... more to come
}

// --- Extend Subject Model ---
model Subject {
  // ... (existing fields)
  activeLayout Blueprint? @relation(fields: [blueprintId], references: [id])
  blueprintId  String?
  widgets      WidgetInstance[]
}

2.2 Shared DTOs (packages/shared-types)
We will need new types and DTOs for managing workspace layouts.
export interface WidgetPosition { x: number; y: number; }
export interface WidgetSize { width: number; height: number; }
export interface WidgetContent { /* ... flexible based on type */ }

export interface WidgetInstanceDto {
  id: string;
  type: 'NOTES' | 'MIND_MAP' | 'FLASHCARDS';
  position: WidgetPosition;
  size: WidgetSize;
  content: WidgetContent;
}

export interface UpdateWorkspaceLayoutDto {
  widgets: Array<Pick<WidgetInstanceDto, 'id' | 'position' | 'size'>>;
}

3. API Contract (Epoch III Endpoints)
Service: core-service
GET /workspace/personas: Retrieves the list of available one-click workspace personas.
POST /subjects/:id/apply-persona: Applies a persona's default layout to a subject's canvas. (JWT Protected)
GET /subjects/:id/workspace: Retrieves all widget instances for a subject's canvas. (JWT Protected)
PATCH /subjects/:id/workspace/layout: Saves the new positions and sizes of widgets on a canvas. (JWT Protected, Body: UpdateWorkspaceLayoutDto)
(Further endpoints for creating/updating individual widgets will be defined per-sprint).