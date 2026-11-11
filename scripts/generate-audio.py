import asyncio
import os
import subprocess
import edge_tts

VOICE = "en-US-GuyNeural"
RATE = "+18%"
OUTPUT_DIR = "temp-walkthrough/audio"

SCRIPTS = {
    "segment1": """Hi everyone, my name is Istiyak Hossain Ishan, and this is my submission for the Ajaia AI-Native Full Stack Developer assignment: Ajaia Docs.
Here on the dashboard, I am signed in as the primary reviewer account. Let's create a new blank document. I can immediately rename the title inline to 'Q4 Engineering Strategy', which saves directly to our database on blur.
Inside the editor, powered by TipTap and ProseMirror, we have full rich-text controls: Headings 1 through 3, bold, italic, underline, and bulleted or numbered lists, all with active-state highlights. As I type, our debounced auto-saver keeps the document synchronized with PostgreSQL, and refreshing the browser proves that our draft persists completely. We can also capture named historical snapshots at any time with the Snapshot button.""",

    "segment2": """Next, let's explore our file ingestion engine. Ajaia Docs supports Word documents (.docx), Markdown (.md), and plain text (.txt) up to 5 megabytes across two distinct workflows.
First, from the dashboard, I can drag-and-drop a Markdown or Word file to convert it into a brand-new document. Our backend uses Mammoth and Marked to parse the content into clean semantic HTML while preserving headings and lists, tracking the source filename.
Second, within an active draft, an editor can click 'Import File' to append research or notes directly to the bottom of the current document, cleanly separated by a horizontal divider.
And if an unsupported format like a PDF or oversized file is uploaded, our validation immediately blocks it with a clear error message.""",

    "segment3": """Now let's examine collaboration and access control. To make evaluation frictionless, I built a 1-Click Reviewer Account Switcher in the top navbar.
From the Share modal, the document owner can invite teammates. I included 1-click quick-select pills for our seeded users, Alex and Sam. Let's grant Alex 'Can Edit' and Sam 'View Only'. We can adjust their permissions in-place or copy the link directly.
Now, let's switch our active session to Alex Rivera. The header updates to Editor mode: Alex can edit text and save snapshots, but cannot delete the document.
Next, let's switch to Sam Chen. Instantly, our zero-trust access control locks the canvas, disables the toolbar, and displays a view-only warning banner. Even if an unauthenticated user tried to send a PATCH or DELETE request to our API, our server-side route guards reject it with a 403 Forbidden. Back on the dashboard, Sam clearly sees what is 'Owned by Me' versus 'Shared with Me'.""",

    "segment4": """Behind the scenes, Ajaia Docs is built on Next.js 14 App Router, TypeScript, TipTap v2, and Prisma ORM backed by Neon Serverless PostgreSQL in production, with zero-config SQLite support for local runs.
In prioritizing within the 4 to 6 hour timebox, I made intentional engineering tradeoffs:
First, I chose TipTap and ProseMirror over native contentEditable to guarantee deterministic HTML structure and prevent cursor jumping.
Second, I prioritized rock-solid persistence—debounced auto-save, atomic version snapshots with 1-click restore, and server-enforced RBAC—over real-time WebSocket CRDTs like Yjs, which add operational fragility on serverless platforms.
With an additional 2 to 4 hours, adding live remote cursor presence via Yjs and PartyKit, plus inline commenting threads, would be the next milestones.""",

    "segment5": """Finally, regarding my AI-native workflow: I paired with Gemini Flash 3.8 to rapidly scaffold relational schemas, Zod validations, and TipTap toolbar bindings, saving about two hours of boilerplate development.
However, human engineering oversight was critical. I rejected three key AI proposals:
First, I rejected raw document.execCommand in favor of TipTap's schema model.
Second, I rejected file-based SQLite on Vercel—which fails due to ephemeral serverless containers—and re-architected persistence to cloud Neon Postgres with an automatic first-load cloud initializer.
Third, I rejected frontend-only disabled states, implementing zero-trust server guards on all API routes and XSS sanitization on text imports.
Here in the terminal, our 32 automated Vitest tests verify every file parser rule, schema boundary, and RBAC permission in under a second.
Thank you for your time, and I look forward to discussing the architecture with the Ajaia team!"""
}

async def generate():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    total_sec = 0.0
    for key, text in SCRIPTS.items():
        out_path = os.path.join(OUTPUT_DIR, f"{key}.mp3")
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(out_path)
        
        ff = r"node_modules\ffmpeg-static\ffmpeg.exe"
        res = subprocess.run([ff, "-i", out_path], stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
        for line in res.stderr.split("\n"):
            if "Duration:" in line:
                d_str = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = d_str.split(":")
                sec = int(h)*3600 + int(m)*60 + float(s)
                total_sec += sec
                print(f"{key}: {sec:.2f}s ({d_str})")
    print(f"Total Audio Duration: {total_sec:.2f}s ({total_sec/60:.2f} minutes)")

if __name__ == "__main__":
    asyncio.run(generate())
