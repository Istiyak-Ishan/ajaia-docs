import prisma from "@/lib/prisma";

let isSeeding = false;

/**
 * Ensures the database is populated with the 3 reviewer test users
 * and 3 realistic sample documents.
 * 
 * Runs automatically on first application request in production (e.g. Neon Postgres on Vercel)
 * so reviewers always get a fully initialized, interactive experience with zero manual steps.
 */
export async function ensureSeeded(forceReset = false): Promise<boolean> {
  if (isSeeding) return false;

  try {
    const userCount = await prisma.user.count();

    if (userCount > 0 && !forceReset) {
      return false;
    }

    isSeeding = true;
    console.log("🌱 Auto-seeding database for Ajaia Docs...");

    if (forceReset) {
      await prisma.documentVersion.deleteMany({});
      await prisma.documentShare.deleteMany({});
      await prisma.document.deleteMany({});
      await prisma.user.deleteMany({});
    }

    // 1. Seed the 3 required reviewer accounts
    const istiyak = await prisma.user.create({
      data: {
        email: "istiyakishan7@gmail.com",
        name: "Istiyak Hossain Ishan",
        avatarColor: "#2563EB", // Blue (Candidate Primary)
      },
    });

    const alex = await prisma.user.create({
      data: {
        email: "alex@ajaia.com",
        name: "Alex Rivera",
        avatarColor: "#059669", // Emerald Green (Collaborator - Editor)
      },
    });

    const sam = await prisma.user.create({
      data: {
        email: "sam@ajaia.com",
        name: "Sam Chen",
        avatarColor: "#7C3AED", // Violet (Collaborator - Viewer)
      },
    });

    // 2. Seed Document 1: Q4 Product Architecture & AI Roadmap
    // Owned by Istiyak, shared with Alex (EDIT) and Sam (VIEW)
    await prisma.document.create({
      data: {
        title: "Q4 Product Architecture & AI Roadmap",
        content: `<h1>Q4 Product Architecture & AI Roadmap</h1>
<p><strong>Status:</strong> Active Draft &nbsp;|&nbsp; <strong>Lead Architect:</strong> Istiyak Hossain Ishan &nbsp;|&nbsp; <strong>Target Release:</strong> Q4 2026</p>
<hr />
<h2>Executive Summary</h2>
<p>This architectural roadmap outlines the core engineering milestones for transforming <strong>Ajaia Docs</strong> into a resilient, AI-native collaborative workspace. Our focus is delivering seamless multi-user collaboration, robust document import pipelines, and contextual intelligence.</p>
<h2>1. Core Engineering Pillars</h2>
<ul>
  <li><strong>Local-First & Offline Resilience:</strong> Instant local state updates backed by optimistic concurrency controls and SQLite/PostgreSQL persistence.</li>
  <li><strong>AI-Assisted Workflow Suite:</strong> Seamless summarization, context-aware writing assistance, and natural language formatting commands directly inside TipTap.</li>
  <li><strong>Universal Ingestion Engine:</strong> Ingest existing corporate knowledge bases from Word (<code>.docx</code>), Markdown (<code>.md</code>), and plain text.</li>
</ul>
<h2>2. Milestones & Delivery Schedule</h2>
<ol>
  <li><strong>Milestone A — Core Editor & Schema:</strong> Complete TipTap WYSIWYG integration with heading, list, and formatting controls.</li>
  <li><strong>Milestone B — Collaboration & Permissions:</strong> Implement granular Role-Based Access Control (<em>Owner</em>, <em>Editor</em>, <em>Viewer</em>).</li>
  <li><strong>Milestone C — Document Versioning & Export:</strong> Snapshot version tracking with one-click restore capabilities.</li>
</ol>
<p><em>Confidential &mdash; Internal Engineering Distribution Only.</em></p>`,
        sourceFileName: "q4-architecture-plan.md",
        ownerId: istiyak.id,
        shares: {
          create: [
            { userId: alex.id, permission: "EDIT" },
            { userId: sam.id, permission: "VIEW" },
          ],
        },
        versions: {
          create: [
            {
              title: "Q4 Product Architecture & AI Roadmap (Initial Snapshot)",
              content: `<h1>Q4 Product Architecture & AI Roadmap</h1><p>Initial draft outlining Q4 deliverables and team assignments.</p>`,
              savedById: istiyak.id,
            },
          ],
        },
      },
    });

    // 3. Seed Document 2: Sprint Planning Notes
    // Owned by Alex, shared with Istiyak (EDIT)
    await prisma.document.create({
      data: {
        title: "Sprint Planning Notes",
        content: `<h1>Sprint Planning & Execution Notes</h1>
<p><strong>Sprint:</strong> Sprint 42 (Nov 12 - Nov 26) &nbsp;|&nbsp; <strong>Scrum Lead:</strong> Alex Rivera</p>
<hr />
<h2>Sprint Goals</h2>
<p>Ship the MVP of the collaborative document editor with rock-solid permission enforcement and complete test coverage.</p>
<h2>Key Deliverables & Tasks</h2>
<ul>
  <li><strong>Editor Toolbar:</strong> Implement active states for Bold, Italic, Underline, Headings (H1, H2, H3), and Lists.</li>
  <li><strong>Share Dialog Modal:</strong> Allow document owners to grant <em>EDIT</em> or <em>VIEW</em> access to team members by email.</li>
  <li><strong>User Switcher UI:</strong> Floating quick-switch profile bar in development mode for instantaneous permission testing.</li>
  <li><strong>Automated Testing:</strong> Vitest unit tests verifying permission boundaries and HTML sanitization.</li>
</ul>
<h2>Team Ownership</h2>
<p><strong>Alex Rivera:</strong> Frontend components, Tailwind styling, and responsive layout polish.</p>
<p><strong>Istiyak Hossain Ishan:</strong> Backend API routes, Prisma queries, file import converters, and Vitest suite.</p>
<p><strong>Sam Chen:</strong> QA validation, edge-case testing with complex Word documents, and documentation review.</p>`,
        sourceFileName: null,
        ownerId: alex.id,
        shares: {
          create: [{ userId: istiyak.id, permission: "EDIT" }],
        },
      },
    });

    // 4. Seed Document 3: Engineering Onboarding Checklist
    // Owned by Sam, shared with Istiyak (VIEW)
    await prisma.document.create({
      data: {
        title: "Engineering Onboarding Checklist",
        content: `<h1>Engineering Onboarding & Developer Guide</h1>
<p><strong>Welcome to the Ajaia Engineering Team!</strong> This guide walks you through your first week of setup, best practices, and codebase conventions.</p>
<hr />
<h2>Day 1: Machine Setup & First Run</h2>
<ul>
  <li><strong>Node.js Environment:</strong> Verify Node 18+ or 20+ is installed on your workstation.</li>
  <li><strong>Clone & Install:</strong> Run <code>git clone</code> followed by <code>npm install</code>.</li>
  <li><strong>Database Bootstrap:</strong> Execute <code>npm run db:setup</code> to push the Prisma schema and seed demo users.</li>
  <li><strong>Local Server:</strong> Launch the dev server via <code>npm run dev</code> and navigate to <code>http://localhost:3000</code>.</li>
</ul>
<h2>Architecture & Code Conventions</h2>
<ol>
  <li><strong>Framework:</strong> Next.js 14 App Router with React Server Components (RSC) and Client Components where interactivity is required.</li>
  <li><strong>ORM:</strong> Prisma Client with SQLite for local dev and PostgreSQL for production deployments.</li>
  <li><strong>Typography & Design:</strong> Tailwind CSS with modern neutral palettes and high-contrast accessibility standards.</li>
</ol>
<p><em>If you have questions, please reach out in the <strong>#dev-onboarding</strong> Slack channel.</em></p>`,
        sourceFileName: "onboarding-guide.docx",
        ownerId: sam.id,
        shares: {
          create: [{ userId: istiyak.id, permission: "VIEW" }],
        },
      },
    });

    console.log(" Database seeded successfully!");
    return true;
  } catch (error) {
    console.error("Error ensuring database is seeded:", error);
    return false;
  } finally {
    isSeeding = false;
  }
}

