BLUEPRINT.md (Version 3.1 - The Subjects Expansion)
code
Markdown
# BLUEPRINT & ARCHITECTURAL STATE v3.1 - Synapse OS

**Document Status:** CANONICAL REALITY. This is your "Single Source of Truth." All code MUST conform to the structures and contracts defined herein. This version officially incorporates the **Subjects Module**.

**Current Focus: Phase 1, Sprint 2 - The Container Core**

## 1. Target Directory Structure (for `core-service`)

This structure is now expanded to include the `subjects` module.
apps/core-service/src/
├── app.module.ts
├── main.ts
├── prisma/
│ ├── schema.prisma # <--- DATABASE SCHEMA SSOT (UPDATED)
│ ├── prisma.module.ts
│ └── prisma.service.ts
├── config/
│ ├── config.module.ts
│ └── configuration.ts
├── users/
│ ├── ... (existing files)
│ └── dto/
│ └── create-user.dto.ts
├── subjects/ # <--- NEW MODULE
│ ├── subjects.module.ts
│ ├── subjects.controller.ts
│ ├── subjects.service.ts
│ └── dto/
│ └── create-subject.dto.ts
└── auth/
├── ... (existing files)
code
Code
## 2. Data Contracts (The Law of Definition-First)

The data contracts are now expanded.

### 2.1 Database Schema (`prisma/schema.prisma`)
The `Subject` model is now active and its relation to `User` is officially defined.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  subjects Subject[] // Relation to subjects
}

model Subject {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // --- Relation Field ---
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
2.2 Shared DTOs (Data Transfer Objects)
The new CreateSubjectDto is defined. It MUST be a class to support validation.
subjects/dto/create-subject.dto.ts:
code
TypeScript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject name cannot be empty.' })
  @MaxLength(100, { message: 'Subject name cannot be longer than 100 characters.' })
  name: string;
}
2.3 API Response Contracts
The SubjectResponse shape is officially defined.
SubjectResponse:
code
TypeScript
export interface SubjectResponse {
  id: string;
  name: string;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
}


3. API Contract (The Endpoints You Will Build)
Service: core-service
POST /auth/signup
Request Body: CreateUserDto
Success (201) Response Body: LoginResponse
Failure (400) Response: On validation error (e.g., weak password, invalid email).
Failure (409) Response: If email already exists.
POST /auth/login
Request Body: { email, password }
Success (200) Response Body: LoginResponse
Failure (401) Response: On invalid credentials.

4. Canonical Implementations (Core Architectural Patterns)
These are specific implementations that are non-negotiable to prevent architectural drift.
Centralized Configuration (config/configuration.ts):


Centralized Configuration (config/configuration.ts):
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  jwtSecret: process.env.JWT_SECRET,
}));


Injectable Prisma Service (prisma/prisma.service.ts):
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}