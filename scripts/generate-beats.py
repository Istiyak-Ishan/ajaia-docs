"""
Beat Audio Generator — Ajaia Docs Walkthrough
Generates 14 MP3 clips using edge-tts voice: en-US-AndrewMultilingualNeural
Output: beat-audio/beat_01.mp3 .. beat-audio/beat_14.mp3
"""

import asyncio
import os
import sys

VOICE = "en-US-AndrewMultilingualNeural"
RATE = "+2%"
OUTPUT_DIR = "beat-audio"

BEATS = [
    # beat_01
    "Welcome! I'm Istiyak Hossain Ishan. Here's Ajaia Docs — a lightweight collaborative document editor built for the Ajaia Full Stack assignment. The dashboard shows documents split into Owned by Me and Shared with Me, each with live role badges.",
    # beat_02
    "Let me create a new blank document. I'll click New Blank Document, then rename the title inline to Ajaia Product Strategy Q4 Spec. Title changes auto-save to our Neon PostgreSQL database on blur.",
    # beat_03
    "In the TipTap ProseMirror editor, I'll apply Heading 1 for Strategic Goals, then switch to Heading 2, add bold and italic text, an underlined key result, then a bulleted list and a numbered action plan. Watch the auto-save status cycle from Unsaved to Saving to Saved. After a browser refresh, all formatting persists perfectly.",
    # beat_04
    "Now let's test our file ingestion engine. From the dashboard, I'll click Upload File to open the import modal. It supports dot-txt, dot-md, and dot-docx files up to 5 megabytes in two modes: creating a new document or appending to an existing draft.",
    # beat_05
    "I'll select an architecture specification Markdown file. Our backend uses the Marked library to convert headings, bold text, code blocks, and lists into clean semantic HTML. The document opens immediately, fully formatted and editable.",
    # beat_06
    "Inside this draft, I'll click Import File to append a plain-text meeting notes file. The content is XSS-sanitized, converted into HTML paragraphs, and inserted below a horizontal rule. Watch what happens with an unsupported file type like a PDF — our Zod validation immediately rejects it with a clear error message.",
    # beat_07
    "Now let me demonstrate role-based access control. I'll click Share to open the Share and Permissions modal. As the document owner, I see quick-select pills for our seeded test accounts. I'll grant Alex Rivera Can Edit access with one click and Share.",
    # beat_08
    "Now I'll grant Sam Chen View Only access. The collaborators list immediately reflects both shares, and each user's role can be changed in-place or revoked. I'll copy the document link — perfect for real-world sharing workflows.",
    # beat_09
    "Using the top-bar Reviewer Account Switcher, I'll switch to Alex Rivera in one click. No logout required. The page immediately re-renders showing Alex's Editor role badge. Alex can edit the document content — I'll type a collaborative note — and auto-save fires within 1.5 seconds.",
    # beat_10
    "Now I'll switch to Sam Chen. Sam's dashboard shows Shared with Me with a View Only badge. Opening the document shows an amber read-only banner: You have view-only access. The entire formatting toolbar is disabled. Even if Sam directly called our PATCH API, our server-side route guard would reject it with a 403 Forbidden.",
    # beat_11
    "Let me show our stretch features. Version History captures named snapshots with one-click restore. The Export dropdown lets users download the document as Markdown or print directly to PDF, preserving the semantic HTML structure through our custom htmlToMarkdown converter.",
    # beat_12
    "Architecturally, Ajaia Docs is built on Next.js 14 App Router with TypeScript, TipTap ProseMirror, and Prisma ORM. For production, I connected a free Neon Serverless PostgreSQL database, solving Vercel's ephemeral container limitation for SQLite. Server-enforced RBAC validates every API route. I traded real-time WebSocket CRDTs — which are fragile on serverless — for deterministic debounced auto-save and version snapshots, the right call for a 4 to 6 hour timebox.",
    # beat_13
    "Throughout this build, I pair-programmed with Gemini Flash to accelerate scaffolding of Prisma schemas, Zod validators, and TipTap bindings. But critical human intervention was essential. I rejected document.execCommand in favor of TipTap's schema model. I rejected ephemeral local SQLite and re-architected to Neon Postgres. And I rejected frontend-only permission checks, adding zero-trust server guards and XSS sanitization on all text imports.",
    # beat_14
    "Here are our 32 Vitest tests covering file parser rules, schema validations, and all RBAC permission boundaries — 100% passing in under a second. Ajaia Docs is fully deployed and ready for review. Thank you for your time, and I look forward to discussing the architecture!",
]


async def generate_beat(index: int, text: str) -> bool:
    """Generate a single beat MP3 using edge-tts CLI."""
    filename = os.path.join(OUTPUT_DIR, f"beat_{index:02d}.mp3")
    cmd = f'edge-tts --voice "{VOICE}" --rate "{RATE}" --text "{text}" --write-media "{filename}"'
    
    print(f"  Generating beat_{index:02d}.mp3 ...", flush=True)
    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    
    if proc.returncode != 0:
        print(f"  ERROR beat_{index:02d}: {stderr.decode()}", file=sys.stderr)
        return False
    
    size = os.path.getsize(filename)
    print(f"  ✓ beat_{index:02d}.mp3 ({size:,} bytes)", flush=True)
    return True


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"Generating {len(BEATS)} audio beats with voice: {VOICE} at rate {RATE}")
    print(f"Output directory: {os.path.abspath(OUTPUT_DIR)}\n")
    
    success_count = 0
    for i, text in enumerate(BEATS, start=1):
        ok = await generate_beat(i, text)
        if ok:
            success_count += 1
    
    print(f"\n✅ Done: {success_count}/{len(BEATS)} beats generated successfully.")
    if success_count < len(BEATS):
        print("⚠️  Some beats failed. Check errors above.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

