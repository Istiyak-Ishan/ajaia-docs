# AI-Native Development Workflow & Engineering Oversight Note

> **Ajaia LLC — AI-Native Full Stack Developer Take-Home Assignment**  
> **Candidate:** Istiyak Hossain Ishan ([istiyakishan7@gmail.com](mailto:istiyakishan7@gmail.com))  
> **Repository:** [https://github.com/Istiyak-Ishan/ajaia-docs](https://github.com/Istiyak-Ishan/ajaia-docs)

---

## 1. AI Tooling & Pairing Methodology

For this take-home assignment, I used **Gemini Flash 3.8** as an active pair programmer within an agentic coding environment to scaffold, accelerate, and pressure-test the architecture of **Ajaia Docs**.

My philosophy toward AI-assisted engineering is:
> **AI provides velocity; the human engineer provides architectural taste, security boundaries, and rigorous verification.**

---

## 2. Where AI Materially Sped Up Development

AI materially reduced boilerplate generation time across three primary areas, saving an estimated **2 to 2.5 hours of manual typing**:

1. **Relational Data Modeling & TypeScript Typing:**
   - Rapidly generating the relational Prisma schema connecting `User`, `Document`, `DocumentShare`, and `DocumentVersion` with cascading deletes and compound indexes (`@@unique([documentId, userId])`).
   - Generating corresponding Zod validation schemas (`createDocumentSchema`, `updateDocumentSchema`, `shareDocumentSchema`) and inferred TypeScript types.
2. **TipTap ProseMirror Toolbar Wiring:**
   - Generating standard boilerplate button handlers and active state probes for TipTap commands (`editor.isActive('bold')`, `editor.chain().focus().toggleHeading({ level: 1 }).run()`, etc.).
3. **Comprehensive Test Fixture Generation:**
   - Scaffolding edge-case test suites for file extension parsing, byte size limits, and multi-user role transition tests in Vitest.

---

## 3. What AI-Generated Output I Changed or Rejected (Critical Engineering Interventions)

A key criterion for this assignment is demonstrating critical evaluation of AI output. Below are three major architectural interventions where I rejected or significantly overhauled the AI's default suggestions:

### 1. Rejected Naive `document.execCommand` / ContentEditable in Favor of TipTap ProseMirror
- **AI's Initial Direction:** LLM scaffolding often leans toward lightweight vanilla `contentEditable` wrappers utilizing `document.execCommand('bold')` to minimize npm dependency footprint.
- **Why I Rejected It:** `document.execCommand` is deprecated by W3C and behaves wildly inconsistently across Chromium, Safari, and Firefox. It injects messy tags (`<b>`, `<strong>`, `<span>` with inline styles), breaks nested unordered/ordered lists, and makes deterministic HTML serialization impossible.
- **My Intervention:** I insisted on building upon **TipTap v2 (ProseMirror)** with an immutable document schema. To prevent the notorious "cursor jumping" issue in React TipTap wrappers when debounced state updates trigger re-renders, I designed a custom local change ref tracking mechanism (`isLocalChangeRef`) that cleanly isolates typing from external document syncs.

### 2. Rejected Ephemeral File-Based SQLite for Serverless Cloud Deployment
- **AI's Initial Direction:** The AI initially defaulted to using local SQLite (`file:./dev.db`) for both local development and Vercel cloud deployment.
- **Why I Rejected It:** On Vercel (and AWS Lambda), serverless function containers are stateless, read-only, and spun down after execution. Writing to a local SQLite database in production leads to silent data loss, read-only filesystem errors, and zero persistence across browser page refreshes.
- **My Intervention:**
  1. I re-architected the database configuration to use **Neon Serverless PostgreSQL** for production via `DATABASE_URL` pooling, while keeping SQLite available for offline development.
  2. In `package.json`, I upgraded the build script to `"build": "prisma generate && prisma db push && next build"` so schema updates automatically apply during Vercel builds.
  3. I implemented an automatic first-load cloud initializer in `src/lib/seed-check.ts` (`ensureSeeded()`). When deployed to a brand-new Neon database, the system automatically detects that the user count is zero and seeds the 3 reviewer accounts and sample documents on first visit, eliminating manual CLI steps for reviewers.

### 3. Hardened Zero-Trust Server Access Control & XSS Input Sanitization
- **AI's Initial Direction:** When implementing view-only access, the AI initially relied on frontend-only disabling: simply passing `editor.setEditable(false)` and styling toolbar buttons with `pointer-events-none`. Furthermore, in plain text file uploads, it suggested reading raw strings directly into paragraph tags.
- **Why I Rejected It:**
  - Client-side disabling provides zero security. Any user with a basic HTTP client could send `PATCH /api/documents/[id]` to overwrite document titles and content, or send `DELETE` requests to wipe team documents.
  - Inserting raw `.txt` file contents directly into HTML without escaping creates an immediate **Stored Cross-Site Scripting (XSS)** vulnerability if an imported text file contains `<script>` or `<img onerror=...>` payloads.
- **My Intervention:**
  1. Created a server-side authorization guard in `src/lib/auth.ts` (`getDocumentAccess(documentId, userId)`) and applied it to every route handler (`GET`, `PATCH`, `DELETE`, `/share`, and `/upload`). `VIEW` users and unshared strangers are strictly blocked on the server with HTTP 403 Forbidden.
  2. Implemented strict HTML entity escaping (`escapeHtml`) in `src/lib/file-parser.ts` to neutralize HTML tags before plain text is converted into `<p>` elements.

---

## 4. How I Verified Correctness, UX Quality, and Reliability

To ensure that the application meets enterprise quality standards, I executed a multi-layered verification strategy:

1. **Automated Unit & Integration Testing (Vitest):**
   - Engineered **32 automated tests** in `src/__tests__/`:
     - `file-parser.test.ts`: Verifies `.txt` XSS escaping, paragraph wrapping, `.md` semantic parsing, extension extraction, and 5MB size limit rejection with the exact required error message.
     - `access-control.test.ts`: Tests `OWNER`, `EDIT`, and `VIEW` permissions against live database records, confirming that owners can delete/share, editors can only edit content, viewers are blocked from editing, and unshared users receive 403.
   - Run command: `npm test` (executes in under 1 second with 100% pass rate).
2. **Reviewer Experience & Multi-User Boundary Testing:**
   - Switched repeatedly between **Istiyak** (Owner), **Alex** (Editor), and **Sam** (Viewer) using the navigation bar switcher.
   - Verified that when viewing *"Q4 Product Architecture & AI Roadmap"* as Sam, the toolbar locks, the canvas is disabled, the view-only banner appears, and API edits return 403.
   - Verified that when viewing as Alex, editing works seamlessly, but the Delete button and Share management are forbidden.
3. **Corrupt & Edge-Case File Upload Validation:**
   - Tested drag-and-drop ingestion with `.txt`, `.md`, and `.docx` files.
   - Tested uploading invalid files (`.pdf`, `.exe`) and confirmed immediate 400 rejection with: `"Supported formats are .txt, .md, and .docx (max 5MB)."`.
   - Tested append mode to verify that imported files merge into active drafts separated by a clean `<hr />` divider.
4. **Production Build & Type-Safety Validation:**
   - Validated that `npm run build` passes with zero TypeScript warnings, zero ESLint errors, and clean static/dynamic route categorization.
