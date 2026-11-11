# Ajaia Docs — Final Candidate Submission Package

> **Ajaia LLC — AI-Native Full Stack Developer Take-Home Assignment**  
> **Candidate:** Istiyak Hossain Ishan  
> **Email:** [istiyakishan7@gmail.com](mailto:istiyakishan7@gmail.com)  
> **Date:** November 2026

---

## 🔗 Quick Reference Links

| Resource | Link |
| :--- | :--- |
| **Live Deployed Application** | **[PASTE_LIVE_VERCEL_URL_HERE]** *(e.g. `https://ajaia-docs.vercel.app`)* |
| **Walkthrough Video (Loom / YouTube)** | **[PASTE_VIDEO_LINK_HERE]** |
| **GitHub Repository** | [https://github.com/Istiyak-Ishan/ajaia-docs](https://github.com/Istiyak-Ishan/ajaia-docs) |
| **Google Drive Submission Folder** | **[PASTE_GOOGLE_DRIVE_FOLDER_LINK_HERE]** |

---

## 📦 Google Drive Submission Folder Inventory

The Google Drive submission folder contains the following complete artifacts:

```
📁 Ajaia_Docs_Submission_Istiyak_Ishan/
├── 📁 source-code/               # Full source code archive (.zip, excludes node_modules & .next)
├── 📄 README.md                  # Complete project setup, feature matrix, and local instructions
├── 📄 ARCHITECTURE.md            # System architecture diagram, design decisions, and tradeoffs
├── 📄 AI_WORKFLOW.md             # AI pairing methodology, rejected AI suggestions, verification
├── 📄 SUBMISSION.md              # This master submission document
├── 📄 walkthrough_video_url.txt  # Plain-text backup link to the 4-minute walkthrough video
└── 📁 screenshots/               # High-resolution UI captures of all core flows
    ├── 01_dashboard_owned_and_shared.png
    ├── 02_tiptap_editor_toolbar_active.png
    ├── 03_reviewer_account_switcher_dropdown.png
    ├── 04_share_modal_permissions_management.png
    ├── 05_file_upload_ingestion_modal.png
    └── 06_version_history_drawer_restore.png
```

---

## 👥 Seeded Reviewer Test Accounts & Evaluation Guide

To evaluate multi-user permissions without requiring reviewers to register multiple email accounts or open incognito windows, **Ajaia Docs** features a **1-Click Reviewer Mode Switcher** directly in the top navigation header.

Switching accounts updates your session cookie (`ajaia_user_email`), passes custom `x-user-email` headers, and immediately re-evaluates role-based access rules.

| Reviewer Persona | Email | Seeded Permissions & Ownership |
| :--- | :--- | :--- |
| **Istiyak Hossain Ishan** *(Primary Candidate)* | `istiyakishan7@gmail.com` | • **OWNER** of *"Q4 Product Architecture & AI Roadmap"*<br>• **EDIT** collaborator on *"Sprint Planning Notes"*<br>• **VIEW** collaborator on *"Engineering Onboarding Checklist"* |
| **Alex Rivera** *(Collaborator)* | `alex@ajaia.com` | • **OWNER** of *"Sprint Planning Notes"*<br>• **EDIT** collaborator on *"Q4 Product Architecture & AI Roadmap"* |
| **Sam Chen** *(Collaborator)* | `sam@ajaia.com` | • **OWNER** of *"Engineering Onboarding Checklist"*<br>• **VIEW** collaborator on *"Q4 Product Architecture & AI Roadmap"* |

### Recommended 60-Second Reviewer Walkthrough:
1. **Open the Live App:** Navigate to the live URL. You are automatically signed in as **Istiyak** (Owner).
2. **Explore the Dashboard:** Notice the clear visual separation between **"Owned by Me"** and **"Shared with Me"** documents.
3. **Open the Primary Doc:** Click into *"Q4 Product Architecture & AI Roadmap"*. You have full Owner controls (editable title, formatting toolbar, snapshot save, file import, and share management).
4. **Test Real-Time Permission Shifts:**
   - Click the **Reviewer Mode** pill in the top-right navbar and switch to **Alex Rivera**. The page re-renders as **Editor**: you can format and edit text, but you cannot delete the document or manage sharing.
   - Switch to **Sam Chen**. The page immediately locks into **Read-Only Viewer** mode: toolbar buttons disable, the text canvas locks, and a warning banner appears stating: *"You have view-only access to this document."* Direct API patch/delete requests return `403 Forbidden`.

---

## 📂 Supported File Upload Formats

- **Accepted Extensions:** `.txt`, `.md`, and `.docx` *(Word Documents)* up to **5MB**.
- **Mode 1 — New Document:** From the Dashboard, click **"Upload File (.txt, .md, .docx)"** to parse and create a new document with source file tracking (`sourceFileName`).
- **Mode 2 — Append to Draft:** From the Document Editor, click **"Import File"** to append parsed content directly into your active draft separated by a clean `<hr />`.
- **Validation:** Files over 5MB or invalid formats (`.pdf`, `.exe`, `.zip`) are rejected with the explicit error:  
  `"Supported formats are .txt, .md, and .docx (max 5MB)."`

---

## ⚡ Local Setup (Under 4 Commands)

```bash
git clone https://github.com/Istiyak-Ishan/ajaia-docs.git
cd ajaia-docs
npm install
npm run db:setup
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Run the test suite anytime via `npm test`.

---

## 📊 Summary of What Works, Scope Cuts, and Next Steps

### ✅ What Works End-to-End
- **TipTap ProseMirror WYSIWYG Core:** Headings 1-3, bold, italic, underline, lists, undo/redo with active state highlights.
- **Role-Based Access Control (RBAC):** Server-enforced `OWNER`, `EDIT`, and `VIEW` permissions on all API endpoints (`/api/documents/[id]`, `/api/documents/[id]/share`, and `/api/upload`).
- **Debounced Auto-Save & Manual Snapshots:** 1.5s debounced auto-save with live status indicators (`Saving...`, `Unsaved`, `Saved`) + `Cmd+S` snapshot creation.
- **Version History Drawer:** Historical snapshot timeline with author details, timestamps, and 1-click restore.
- **Dual-Mode File Upload Engine:** Parses `.docx` via Mammoth, `.md` via Marked, and `.txt` with XSS entity escaping.
- **Interactive Share Modal:** 1-click test teammate quick-add pills, in-place role updates (`EDIT` ↔ `VIEW`), access revocation, and 1-click URL copying.
- **Document Export:** Export as `.md`, standalone `.html`, or clean print-to-PDF (`window.print()`).
- **Persistent Cloud Database:** Powered by Neon Serverless PostgreSQL with auto-seeding on first request.

### ⏳ Intentionally Scoped Out (Timebox Tradeoffs)
- **Real-time WebSocket CRDTs (Yjs / Liveblocks):** Prioritized bulletproof state persistence, debounced auto-saving, atomic version snapshots, and server-side RBAC over stateful WebSocket server infrastructure within the 4–6 hour limit.
- **Third-Party OAuth (NextAuth / Clerk):** Replaced with a zero-friction **1-Click Reviewer Switcher** to eliminate reviewer signup friction.

### 🔮 Next 2–4 Hours Roadmap
1. **Multiplayer Live Cursors:** Integrate TipTap with Yjs + PartyKit for remote cursor presence.
2. **Inline Text Commenting:** Add ProseMirror marks allowing text highlighting with threaded comment sidebars.
3. **Public Share Link Tokens:** Secret read-only share URLs (`/shared/[token]`) for unauthenticated viewers.

---

## 🏗️ Architecture & AI-Native Workflow Summary

- **Frontend:** Next.js 14 App Router, React 18, TipTap v2 / ProseMirror, Tailwind CSS. Custom local change ref tracking (`isLocalChangeRef`) isolates typing from external updates, eliminating cursor jumping.
- **Backend & Database:** Next.js Route Handlers, Zod v4 validation, Prisma ORM 6.19 with Neon PostgreSQL in production and SQLite for local runs.
- **AI Tooling & Pairing (Gemini Flash 3.8):** Accelerated Prisma schema scaffolding, TipTap toolbar event wiring, and test fixture generation (saving ~2 hours).
- **Critical Human Interventions & Rejected AI Proposals:**
  1. *Rejected Naive `contentEditable` / `execCommand`:* Enforced TipTap/ProseMirror for structured, deterministic HTML serialization and stable nested lists.
  2. *Rejected Ephemeral File-Based SQLite on Vercel:* Re-architected persistence to Neon Serverless PostgreSQL with an automatic first-load cloud initializer (`ensureSeeded()`) to prevent production data loss.
  3. *Hardened Server-Side RBAC & XSS Sanitization:* Transformed frontend-only disabled states into strict server-side guards returning HTTP 403 on unauthorized mutations, and added HTML entity escaping on `.txt` file uploads.
- **Automated Verification:** 32 automated Vitest tests (`npm test`) verify all access control rules, schema constraints, and file parsing pipelines in under 1 second.
