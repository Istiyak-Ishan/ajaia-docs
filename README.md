# Ajaia Docs — Lightweight Collaborative Document Editor

> **Ajaia LLC — AI-Native Full Stack Developer Take-Home Assignment**  
> **Candidate:** Istiyak Hossain Ishan ([istiyakishan7@gmail.com](mailto:istiyakishan7@gmail.com))  
> **Repository:** [https://github.com/Istiyak-Ishan/ajaia-docs](https://github.com/Istiyak-Ishan/ajaia-docs)  
> **Live Deployment:** [https://ajaia-docs-874y.vercel.app/](https://ajaia-docs-874y.vercel.app/)  
> **Walkthrough Video:** [https://www.youtube.com/watch?v=s_PRixgsHTU](https://www.youtube.com/watch?v=s_PRixgsHTU)  
> **Google Drive Submission:** [https://drive.google.com/drive/folders/199KfQ95k2p8EQ4kmmARwNhzukFajDq6Q?usp=sharing](https://drive.google.com/drive/folders/199KfQ95k2p8EQ4kmmARwNhzukFajDq6Q?usp=sharing)

---

## 🚀 Overview

**Ajaia Docs** is a lightweight, responsive, AI-native collaborative document editor built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **TipTap (ProseMirror)**, and **Prisma ORM** backed by **Neon PostgreSQL** (with zero-config SQLite support for local offline development).

It delivers a robust rich-text drafting experience, strict server-enforced **Role-Based Access Control (RBAC)**, universal document ingestion (`.txt`, `.md`, `.docx`), debounced auto-saving, lightweight version history snapshots with one-click restore, and an instant **Reviewer Test Account Switcher** designed for frictionless evaluation.

---

## 👥 Reviewer Test Accounts & Instant Switcher

To allow reviewers to evaluate multi-user permissions without signing up or managing multiple browser sessions, Ajaia Docs includes a **1-Click Reviewer Account Switcher** in the top navigation bar. Switching accounts immediately updates your session cookie (`ajaia_user_email`), passes `x-user-email` headers, and re-renders the workspace with the selected user's permission boundaries.

| Account Name | Email | Role in Demo Seed Data |
| :--- | :--- | :--- |
| **Istiyak Hossain Ishan** *(Primary Candidate)* | `istiyakishan7@gmail.com` | **OWNER** of *"Q4 Product Architecture & AI Roadmap"*, **EDIT** on *"Sprint Planning Notes"*, **VIEW** on *"Engineering Onboarding Checklist"* |
| **Alex Rivera** *(Collaborator)* | `alex@ajaia.com` | **OWNER** of *"Sprint Planning Notes"*, **EDIT** on *"Q4 Product Architecture & AI Roadmap"* |
| **Sam Chen** *(Collaborator)* | `sam@ajaia.com` | **OWNER** of *"Engineering Onboarding Checklist"*, **VIEW** on *"Q4 Product Architecture & AI Roadmap"* |

> 💡 **Try this 10-second test:** Open *"Q4 Product Architecture & AI Roadmap"*. As **Istiyak**, you have full Owner controls. Switch to **Alex** via the top switcher—you now have Editor controls. Switch to **Sam**—the editor instantly shifts into Read-Only Viewer mode with a locked canvas, disabled toolbar, and permission banner!

---

## 📂 Supported File Upload Formats

Ajaia Docs supports importing local documents up to **5MB** in two distinct workflows:

- **Supported Formats:** `.txt`, `.md`, and `.docx` *(Word Documents)* up to 5MB.
- **Workflow 1: Create New Document from File**  
  Click **"Upload File (.txt, .md, .docx)"** on the main dashboard. Drag-and-drop or select a file to parse it into clean HTML and create a brand-new document with `sourceFileName` tracking.
- **Workflow 2: Import File into Active Draft (Append)**  
  Inside the editor, document owners and editors can click **"Import File"** to append parsed content directly into the active draft separated by a clean horizontal rule (`<hr />`).
- **Validation:** Uploads exceeding 5MB or invalid formats (`.pdf`, `.exe`, `.zip`) are immediately rejected with the descriptive error message:  
  `"Supported formats are .txt, .md, and .docx (max 5MB)."`

---

## ⚡ Quickstart / Local Setup (Under 4 Commands)

Run the entire application locally with zero external database dependencies:

```bash
# 1. Clone repository and install dependencies
git clone https://github.com/Istiyak-Ishan/ajaia-docs.git
cd ajaia-docs
npm install

# 2. Configure environment (pre-configured with local SQLite by default)
cp .env.example .env

# 3. Synchronize database schema and seed the 3 demo reviewer accounts & sample documents
npm run db:setup

# 4. Start local development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

### Running Automated Tests
Execute the complete Vitest test suite (32 unit & integration tests covering access control, schema validation, and upload parsing):

```bash
npm test
```

---

## 📊 Feature Matrix

### ✅ Working End-to-End
- **TipTap WYSIWYG Rich-Text Core:** Semantic document structure powered by ProseMirror (`StarterKit` + `Underline` + `Placeholder`). Supports Heading 1-3, bold, italic, underline, bullet lists, numbered lists, and undo/redo with active-state toolbar highlights.
- **Server-Side Access Control (RBAC):** Granular `OWNER`, `EDIT`, and `VIEW` authorization enforced at the API route layer (`/api/documents/[id]`, `/api/documents/[id]/share`, and `/api/upload`). Direct API manipulation by unauthorized users is blocked with HTTP 403 Forbidden.
- **Smart Auto-Save & Manual Snapshots:** 1.5-second debounced auto-save with real-time status indicators (`Saving...`, `Unsaved`, `Saved`) plus explicit **"Snapshot"** button (`Cmd/Ctrl + S`).
- **Version History Drawer:** Slide-over history timeline listing all named versions with author avatars, timestamps, and 1-click version restoration.
- **Dual-Mode File Upload Engine:** Parses `.txt` (with XSS sanitization), `.md` (via Marked), and `.docx` (via Mammoth) into semantic HTML for new documents or draft appending.
- **Document Sharing Modal:** Document owners can grant access, use **1-click quick-select pills** for test teammates, update collaborator permissions in-place (`EDIT` ↔ `VIEW`), revoke access, and copy document URLs with a "Copied!" feedback state.
- **Document Export:** Export documents as Markdown (`.md`), standalone HTML (`.html`), or print-to-PDF (`window.print()`).
- **Automated First-Load Cloud Seeding:** `ensureSeeded()` automatically provisions the 3 test users and sample documents upon first request to a fresh production database with zero manual CLI intervention.

### ⏳ Intentionally Scoped Out (Timebox Tradeoffs)
- **Real-Time WebSocket CRDTs (e.g. Yjs / Liveblocks):** Within the 4–6 hour scope, building a fault-tolerant persistence model with debounced auto-saving, atomic version snapshots, and RBAC enforcement was prioritized over real-time multiplayer cursor synchronization.
- **Third-Party OAuth / Password Authentication:** Deferred in favor of the **1-Click Reviewer Switcher**, allowing interview evaluators to test multi-tenant roles in seconds without account registration friction.

### 🔮 Next 2–4 Hours Roadmap
1. **Real-Time Cursor Presence:** Connect TipTap with Yjs and a WebSocket provider (e.g. PartyKit or Liveblocks) for live collaborative typing and remote cursor badges.
2. **Inline Text-Range Commenting:** Add comment marks to TipTap allowing users to highlight text ranges and leave threaded discussions.
3. **Public Share Link Tokens:** Generate cryptographic read-only view tokens for public sharing without requiring an account.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 14.2 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict Mode)
- **Editor Engine:** TipTap v2 / ProseMirror Core (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`)
- **Database & ORM:** Prisma ORM 6.19 with Neon PostgreSQL (Production) / SQLite (Local)
- **Styling:** Tailwind CSS 3.4 with custom typography styling
- **File Parsers:** Mammoth (Word `.docx`), Marked (Markdown `.md`)
- **Validation:** Zod v4 schemas for API boundaries
- **Icons:** Lucide React
- **Test Runner:** Vitest v5 (`npm test`)
