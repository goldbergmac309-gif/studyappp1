# BLUEPRINT & ARCHITECTURAL STATE v6.0 - Synapse OS

**Document Status:** CANONICAL REALITY. This version specifies the full architectural and data contracts for **Epoch II: The Oracle Core & Simulation Engine.** All work must conform to these new specifications.

**Current Focus: Phase 2, Sprint 1 - The Command Center Upgrade**

## 1. Target Directory Structure (Updates)

The `core-service` structure will be updated to include DTOs for the new functionality. The `oracle-service` is now a primary, complex application.


apps/core-service/src/
├── ... (existing modules)
├── subjects/
│ └── dto/
│ ├── create-subject.dto.ts
│ └── update-subject.dto.ts # <--- NEW
└── ...
apps/oracle-service/
├── app/
│ ├── celery_app.py
│ ├── config.py
│ ├── core/ # <--- NEW: For human-written logic cores
│ │ └── conceptual_engine.py
│ ├── processors/ # <--- For AI-written wrapper/utility logic
│ ├── vector_db/
│ └── workers/
│ ├── v1_analysis_worker.py # Legacy worker
│ └── v2_reindex_worker.py # <--- NEW


## 2. Data Contracts (The Law of Definition-First)

The database schema evolves significantly to support our new intelligence layer.

### 2.1 Database Schema (`prisma/schema.prisma`)
**Migration Note:** We are officially migrating from SQLite to **PostgreSQL**. The `provider` in the `datasource` block must be changed.

```prisma
// ... (provider must be updated to "postgresql") ...

// --- User Model Unchanged ---
model User { ... }

// --- Subject Model EVOLVED ---
model Subject {
  id        String   @id @default(cuid())
  name      String
  courseCode String?  // <--- NEW
  professorName String?// <--- NEW
  ambition  String?  // <--- NEW
  color     String?  // <--- NEW
  archivedAt DateTime? // <--- NEW (for soft deletes)
  // ... (relations remain the same) ...

  documentChunks DocumentChunk[] // <--- NEW Relation
}

// --- Document Model Unchanged ---
model Document { ... }

// --- AnalysisResult Model DEPRECATED IN FAVOR OF CHUNKS ---
// This model will be kept for legacy data but new analysis flows here:

// --- NEW MODEL: DocumentChunk ---
model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex  Int      // The order of the chunk within the document
  content     String
  tokenCount  Int

  embedding   Embedding? // Relation to its vector embedding

  @@index([documentId])
}

// --- NEW MODEL: Embedding ---
model Embedding {
  id        String   @id @default(cuid())
  chunkId   String   @unique
  chunk     DocumentChunk @relation(fields: [chunkId], references: [id], onDelete: Cascade)
  modelName String   // e.g., 'all-MiniLM-L6-v2'
  vector    Unsupported("vector(384)") // The vector embedding from pgvector
}


2.2 DTOs (apps/core-service/.../dto/)
The new UpdateSubjectDto is defined.
update-subject.dto.ts:```typescript
import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';
export class UpdateSubjectDto {
@IsOptional()
@IsString()
@MaxLength(100)
name?: string;
@IsOptional()
@IsString()
@MaxLength(100)
courseCode?: string;
// ... (other optional, validated fields: professorName, ambition, color)
@IsOptional()
@Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'Color must be a valid hex code.'})
color?: string;
}



## 3. API Contract (Epoch II Endpoints)

-   **Service:** `core-service`
    -   `PATCH /subjects/:id`: Updates a subject. (JWT Protected, Body: `UpdateSubjectDto`)
    -   `DELETE /subjects/:id`: Archives a subject. (JWT Protected)
    -   `POST /subjects/:id/reindex`: Triggers a deep analysis. (JWT Protected)
    -   `GET /subjects/:id/search`: Performs semantic search. (JWT Protected, Query Param: `q`)

-   **Service:** `oracle-service` (Internal APIs, Not User-Facing)
    *This service does not expose public endpoints. It only listens to RabbitMQ and makes callbacks to the `core-service` internal API.*

## 4. Asynchronous Contract (Epoch II Queues)

-   **Queue Name:** `v2_reindexing_jobs`
-   **Message Payload:** `{ "subjectId": "...", "userId": "..." }`

---
This updated blueprint is now the single source of truth for all of Epoch II. It provides the full architectural specification required to build our Simulation and Prophecy engine.