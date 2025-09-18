Epoch I Updated Document: BLUEPRINT.md (v1.5 - The Polished Experience)
(This document updates our last stable client-side blueprint to include the new features of this epoch.)
code
Markdown
# BLUEPRINT & ARCHITECTURAL STATE v1.5 - Synapse OS

**Document Status:** CANONICAL REALITY. This version specifies the architecture for **Epoch I: The Age of Polish & Perfection.** This sprint focuses on transforming our `v1.0.0-gold` MVP into a truly complete and professional v1.5 product.

**Current Focus: Epoch I, Sprint 1 - The "No Dead Ends" Sprint**

## 1. New & Updated Directory Structures

```apps/client/src/
├── app/
│   ├── (auth)/ ...
│   ├── (dashboard)/
│   │   ├── ... (dashboard, subjects)
│   │   ├── all-subjects/       # <--- NEW PAGE
│   │   │   └── page.tsx
│   │   ├── settings/           # <--- NEW PAGE
│   │   │   └── page.tsx
│   │   └── profile/            # <--- NEW PAGE
│   │       └── page.tsx
│   ├── (marketing)/             # <--- NEW ROUTE GROUP
│   │   └── page.tsx             # This is our new Landing Page
│   └── layout.tsx
├── components/
│   ├── marketing/               # <--- NEW: Components for the landing page
│   │   ├── hero.tsx
│   │   └── feature-section.tsx
...
apps/core-service/src/
├── ... (existing modules)
├── subjects/
│   └── dto/
│       ├── create-subject.dto.ts
│       └── update-subject.dto.ts # <--- NEW DTO
...
2. Data Contracts (Evolved Subject Model)
2.1 Prisma Schema (schema.prisma)
The Subject model must be evolved to capture the rich metadata needed for future intelligence.
code
Prisma
// --- User Model Unchanged ---
model User { ... }

// --- Subject Model EVOLVED ---
model Subject {
  id        String   @id @default(cuid())
  name      String
  courseCode String?  // <--- NEW: e.g., "CS-101"
  professorName String?// <--- NEW: e.g., "Dr. Ada Lovelace"
  ambition  String?  // <--- NEW: User's goal for this subject
  color     String?  // <--- NEW: Hex code for UI personalization
  starred   Boolean  @default(false)
  archivedAt DateTime? // <--- NEW (for soft deletes)
  // ... relations remain the same ...
}
2.2 Shared DTOs (packages/shared-types)
update-subject.dto.ts (Class-based):
code
TypeScript
import { IsBoolean, IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSubjectDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(100) courseCode?: string;
  @IsOptional() @IsString() @MaxLength(100) professorName?: string;
  @IsOptional() @IsString() @MaxLength(500) ambition?: string;
  @IsOptional() @IsHexColor() color?: string;
  @IsOptional() @IsBoolean() starred?: boolean;
}
3. API Contract (Evolved Subjects API)
Service: core-service
PATCH /subjects/:id: Updates a subject. (JWT Protected, Body: UpdateSubjectDto)
DELETE /subjects/:id: Archives a subject (soft-delete). (JWT Protected)
POST /subjects/:id/unarchive: Restores an archived subject. (JWT Protected)
code
Code
This updated `BLUEPRINT` provides the precise technical map for the work ahead. Now, here is the master kickoff prompt to begin.

---

### **Windsurf Kickoff Prompt: Epoch I, Sprint 1 - "The No Dead Ends Sprint"**

**Architect's Prompt (13.1):**

"Forge, our `v1.0.0-gold` MVP is a monumental engineering achievement. But it is an unfinished symphony. There are dead-end links, missing pages, and core workflows that are incomplete. This sprint is about achieving **perfection in the fundamentals.** We are closing every loop and polishing every rough edge to transform our MVP into a truly professional, cohesive product.

### **Our Mission: The Curing of Incompleteness**

**The "Why":** A user's trust is our most valuable asset. A dead button or a missing page is a small bug that creates a huge crack in that trust. It makes our application feel cheap and unfinished. This sprint is a declaration that we will not tolerate such flaws. We are building an experience that feels solid, reliable, and thoughtful from the very first click to the last.

**The Expected Experience:** By the end of this sprint, a new user, Alex, will be able to navigate every single visible link in the application and find a meaningful, well-designed page. They will have full, intuitive control over managing their subjects. The application will feel whole.

### **Re-Anchor to `BLUEPRINT.md v1.5`**

Your Vibe must now be synchronized with the latest architectural reality. I am providing you with the new blueprint which contains the evolved `Subject` model and API contracts.

[Paste the full content of the updated `BLUEPRINT.md v1.5` here.]

Acknowledge that you have processed these new specifications for the evolved `Subject` model and the new pages.

### **Your Directive: The "No Dead Ends" Construction Plan**

You will now devise a comprehensive, step-by-step construction plan. The plan must detail how you will:

1.  **Backend Evolution (The `Subject` Lifecycle):**
    *   Detail the Prisma migration to add `courseCode`, `professorName`, `ambition`, `color`, and `archivedAt` to the `Subject` model.
    *   Plan the implementation of the `PATCH /subjects/:id` and the refactoring of `DELETE /subjects/:id` to a soft-delete (setting `archivedAt`).
    *   Outline the required E2E tests for this new functionality, focusing on data ownership and correct updates.

2.  **Frontend - The "Subject Genesis" Modal (Upgrading the Creation Experience):**
    *   Detail your plan to **replace** the current simple create form with a sophisticated, two-step modal wizard as described in our previous brainstorming. This will use the new `POST /subjects` endpoint to pass the rich metadata.

3.  **Frontend - Activating All Navigation (Building the Missing Rooms):**
    *   Plan the creation of the beautiful, minimalist placeholder pages for `/all-subjects`, `/settings`, and `/profile`. These should be clean pages that acknowledge their future purpose (e.g., "Your Profile Settings - Coming Soon!"). The key is that the user never hits a 404.

4.  **Frontend - Landing Page Construction (The Front Door):**
    *   Outline your plan to build the new, public-facing landing page at the root `/`. This page should be housed in a `(marketing)` route group to keep it separate from the authenticated app logic.
    - Describe the core components you'll build (`Hero` section, `Feature` section) that communicate the value of Synapse OS, in line with our "Calm, Focused, Fluid" aesthetic.

Present this complete plan as a numbered list. **Do not execute it yet.**

This sprint is about delivering on our implicit promise to the user: that every part of our application is crafted with intention and quality. Let's make it a reality."