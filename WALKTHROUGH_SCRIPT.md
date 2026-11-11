# 4-Minute Walkthrough Video Script — Ajaia Docs

> **Candidate:** Istiyak Hossain Ishan ([istiyakishan7@gmail.com](mailto:istiyakishan7@gmail.com))  
> **Role:** Ajaia LLC — AI-Native Full Stack Developer Take-Home Assignment  
> **Target Recording Duration:** 3:45 – 4:15 minutes

---

### [0:00 – 0:45] Main User Flow: Drafting, Formatting, and Persistence

**🖥️ On Screen:**
- Start on the Dashboard (`http://localhost:3000` or live Vercel URL). Point out the active user in the top-right navbar: **Istiyak Hossain Ishan (Reviewer Mode)**.
- Click **"New Blank Document"**.
- Click the inline title input, rename it to *"Q4 Engineering Strategy"*, and press `Enter`.
- Click into the editor. Type a heading, apply **H1**, type bullet points, and toggle **Bold** (`Cmd+B`), *Italic* (`Cmd+I`), and <u>Underline</u> (`Cmd+U`). Point out the active toolbar button highlights.
- Pause typing. Point to the Save Status indicator in the top header shifting from *"Unsaved"* to *"Saving..."* to *"Saved"*.
- Hit browser refresh (`Cmd+R` / `F5`) to demonstrate immediate persistence.
- Click the **"Snapshot"** button (or press `Cmd+S`) to save a version snapshot.

**🎙️ What to Say:**
> *"Hi everyone, my name is Istiyak Hossain Ishan, and this is my submission for the Ajaia AI-Native Full Stack Developer assignment: Ajaia Docs.*  
>  
> *Here on the dashboard, I'm signed in as my primary account. Let's create a new blank document. I can immediately rename the title inline—let's call this 'Q4 Engineering Strategy'—which auto-saves to our database on blur.*  
>  
> *Inside the editor, powered by TipTap and ProseMirror, we have full rich-text controls: Headings 1 through 3, bold, italic, underline, and nested bullet or numbered lists, all with active-state highlights. As I type, our 1.5-second debounced auto-saver keeps the document synchronized with our backend, and if I refresh the page right now, our draft persists completely. We can also capture named historical snapshots at any time with this 'Snapshot' button."*

---

### [0:45 – 1:30] File Upload Flow: Ingestion & Validation

**🖥️ On Screen:**
- Navigate back to the Dashboard. Click **"Upload File (.txt, .md, .docx)"**.
- Show the modal badge: `Supported: .txt, .md, .docx (Max 5MB)`.
- Drag and drop or browse a `.md` or `.docx` file (e.g. `architecture-spec.md`). Click **"Import & Open"**.
- Show the newly created document open in the editor with parsed headings and lists, and point out the badge *"Imported from architecture-spec.md"*.
- Next, click the **"Import File"** button in the top document header. Select a `.txt` file, choose *"Append to Document"*, and click **"Append"**. Show the text appended below a clean horizontal rule (`<hr />`).
- Open the upload modal again, attempt to select an invalid file (e.g. a `.pdf` or file over 5MB). Show the immediate error banner: *"Supported formats are .txt, .md, and .docx (max 5MB)."*

**🎙️ What to Say:**
> *"Next, let's explore our file ingestion engine. Ajaia Docs supports Word documents (.docx), Markdown (.md), and plain text (.txt) up to 5MB across two distinct workflows.*  
>  
> *First, from the dashboard, I can drag-and-drop a Markdown or Word file to convert it into a brand-new document. Our backend uses Mammoth and Marked to parse the content into clean semantic HTML while preserving headings and lists, tracking the original filename.*  
>  
> *Second, within an active draft, an editor can click 'Import File' to append research or notes directly to the bottom of the current document, cleanly separated by a horizontal divider.*  
>  
> *And if a user attempts to upload an unsupported format like a PDF or an oversized file, our Zod and buffer validation immediately blocks it with a clear error: 'Supported formats are .txt, .md, and .docx (max 5MB).'"*

---

### [1:30 – 2:30] Sharing Flow, RBAC, & The 1-Click Reviewer Switcher

**🖥️ On Screen:**
- Open *"Q4 Product Architecture & AI Roadmap"* as **Istiyak**.
- Click the **"Share"** button. Point out the Document Owner badge.
- Click the quick-select pill for **Alex Rivera** (`alex@ajaia.com`), choose `Can Edit`, and click **"Share"**.
- Click the quick-select pill for **Sam Chen** (`sam@ajaia.com`), choose `View Only`, and click **"Share"**.
- Show the collaborators list with the dropdown to change permissions in-place or revoke access.
- Click **"Copy Link"** and show the *"Copied!"* toast.
- Close the modal. Click the **Reviewer Mode** switcher in the top navbar and select **Alex Rivera**. Show the header pill update to **"Editor"** and demonstrate that Alex can edit content.
- Now switch to **Sam Chen**. The header immediately displays **"Read-Only Viewer"**, an amber banner appears (*"You have view-only access to this document"*), the formatting toolbar disables, and the canvas locks.
- Navigate back to the Dashboard as Sam. Show that *"Q4 Architecture"* is in **"Shared with Me"** with a *"View Only"* badge, while *"Engineering Onboarding Checklist"* is in **"Owned by Me"**.

**🎙️ What to Say:**
> *"Now let's look at collaboration and access control. To make evaluation completely frictionless for the Ajaia team, I built an instant 1-Click Reviewer Account Switcher in the top navbar—no burner emails or logging out required.*  
>  
> *From the Share modal, the document owner can invite teammates. I included 1-click quick-select pills for our seeded users, Alex and Sam. Let's grant Alex 'Can Edit' and Sam 'View Only'. We can adjust their roles in-place or copy the link directly.*  
>  
> *Now, let's switch our active session to Alex. The page re-renders in Editor mode. Alex can update text and save snapshots, but cannot delete the document.*  
>  
> *Now let's switch to Sam. Instantly, our zero-trust access control locks the canvas, disables the toolbar, and displays a view-only warning. Even if Sam tried to forge a PATCH or DELETE request directly to our API, our server-side route guards reject it with a 403 Forbidden.*  
>  
> *Back on the dashboard, Sam clearly sees what is 'Owned by Me' versus 'Shared with Me' with distinct permission badges."*

---

### [2:30 – 3:15] Architecture & Technical Prioritization

**🖥️ On Screen:**
- Briefly display the **Version History Drawer** by clicking **"History"**, showing saved snapshots and the **"Restore"** button.
- Briefly show the **"Export"** dropdown with Markdown, HTML, and Print-to-PDF options.
- Open `ARCHITECTURE.md` in VS Code or show the architecture diagram.

**🎙️ What to Say:**
> *"Behind the scenes, Ajaia Docs is built on Next.js 14 App Router, TypeScript, TipTap v2, and Prisma ORM backed by Neon Serverless PostgreSQL in production, with zero-config SQLite support for local runs.*  
>  
> *In prioritizing within the 4 to 6 hour timebox, I made intentional engineering tradeoffs:*  
> *First, I chose TipTap and ProseMirror over native contentEditable to guarantee deterministic HTML structure and prevent cursor jumping.*  
> *Second, I prioritized rock-solid persistence—debounced auto-save, atomic version snapshots with 1-click restore, and server-enforced RBAC—over real-time WebSocket CRDTs like Yjs, which introduce unnecessary operational fragility on serverless platforms.*  
>  
> *With an additional 2 to 4 hours, adding live remote cursor presence via Yjs and PartyKit and inline text commenting would be the immediate next steps."*

---

### [3:15 – 4:00] AI-Native Workflow, Critical Interventions, & Test Suite

**🖥️ On Screen:**
- Switch to the terminal. Run `npm test`. Show all **32 Vitest tests passing** in under 1 second.
- Open `AI_WORKFLOW.md` on screen.

**🎙️ What to Say:**
> *"Finally, regarding my AI-native workflow: I paired with Gemini Flash 3.8 to rapidly scaffold relational schemas, Zod validations, and TipTap toolbar bindings, saving about two hours of manual typing.*  
>  
> *However, human engineering oversight was critical. I rejected three key AI proposals:*  
> *1. I rejected raw document.execCommand in favor of TipTap's schema model.*  
> *2. I rejected file-based SQLite on Vercel—which fails due to ephemeral serverless containers—and re-architected persistence to cloud Neon Postgres with an automatic first-load cloud initializer.*  
> *3. I rejected frontend-only disabled states, implementing zero-trust server guards on all API routes and XSS sanitization on text imports.*  
>  
> *Here in the terminal, our 32 automated Vitest tests verify every file parser rule, schema boundary, and RBAC permission in under a second.*  
>  
> *Thank you for your time, and I look forward to discussing the architecture with the Ajaia team!"*
