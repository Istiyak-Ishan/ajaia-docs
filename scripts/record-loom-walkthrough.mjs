/**
 * record-loom-walkthrough.mjs
 * Beat-synchronized 1080p Playwright walkthrough recorder for Ajaia Docs.
 *
 * Architecture:
 * 1. Load 14 audio beat durations from beat-audio/ via ffprobe
 * 2. Compute cumulative timestamps so each beat starts at exactly the right wall-clock time
 * 3. Record Chromium at 1920x1080 with Playwright recordVideo
 * 4. Execute all 14 beats with injected cursor, caption, and ripple overlays
 * 5. After context close, mux webm + full_narration.mp3 → submission-drive-folder/ajaia_walkthrough.mp4
 */

import { chromium } from "playwright";
import { execSync, spawnSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { performance } from "perf_hooks";

// ─── Configuration ────────────────────────────────────────────────────────────
const FFMPEG = resolve("node_modules/ffmpeg-static/ffmpeg.exe");
const BEAT_AUDIO_DIR = resolve("beat-audio");
const VIDEO_TEMP_DIR = resolve("temp-walkthrough/recording");
const OUTPUT_DIR = resolve("submission-drive-folder");
const OUTPUT_MP4 = join(OUTPUT_DIR, "ajaia_walkthrough.mp4");
const CONCAT_AUDIO = join(BEAT_AUDIO_DIR, "full_narration.mp3");
const SCREENSHOTS_DIR = resolve("screenshots");
const SUBMISSION_SCREENSHOTS = join(OUTPUT_DIR, "screenshots");
const TEST_FILES_DIR = resolve("temp-walkthrough/test-files");

const BASE_URL = "http://localhost:3000";
const VIEWPORT = { width: 1920, height: 1080 };

// ─── Utilities ─────────────────────────────────────────────────────────────────

/**
 * Get exact duration of an MP3 file in milliseconds using ffprobe.
 */
function getAudioDurationMs(filePath) {
  const result = spawnSync(FFMPEG, ["-i", filePath], { encoding: "utf8" });
  // Duration is in stderr
  const output = result.stderr || "";
  const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!match) {
    console.warn(`⚠ Could not parse duration for ${filePath}, assuming 13s`);
    return 13000;
  }
  const h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const s = parseFloat(match[3]);
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}

/**
 * Load all 14 beat durations and compute cumulative timestamps.
 * Returns: { durations: number[], cumulative: number[], total: number }
 */
function loadBeatTimings() {
  const durations = [];
  for (let i = 1; i <= 14; i++) {
    const file = join(BEAT_AUDIO_DIR, `beat_${String(i).padStart(2, "0")}.mp3`);
    if (!existsSync(file)) {
      throw new Error(`Missing beat audio: ${file}`);
    }
    const ms = getAudioDurationMs(file);
    durations.push(ms);
    console.log(`  Beat ${String(i).padStart(2, " ")}: ${(ms / 1000).toFixed(2)}s`);
  }

  const cumulative = [];
  let sum = 0;
  for (const d of durations) {
    cumulative.push(sum);
    sum += d;
  }
  return { durations, cumulative, total: sum };
}

/**
 * Concatenate all 14 beat MP3s into a single full_narration.mp3 using ffmpeg.
 */
function concatenateAudio(beatDir, outputFile) {
  const listFile = join(beatDir, "concat_list.txt");
  let listContent = "";
  for (let i = 1; i <= 14; i++) {
    const f = join(beatDir, `beat_${String(i).padStart(2, "0")}.mp3`);
    listContent += `file '${f.replace(/\\/g, "/")}'\n`;
  }
  writeFileSync(listFile, listContent);

  const result = spawnSync(FFMPEG, [
    "-y", "-f", "concat", "-safe", "0",
    "-i", listFile,
    "-c", "copy",
    outputFile,
  ]);

  if (result.status !== 0) {
    console.error("FFmpeg concat stderr:", (result.stderr || "").toString());
    throw new Error("Failed to concatenate audio files");
  }
  console.log(`✅ Full narration audio: ${outputFile}`);
}

/**
 * Wait until wall-clock time since recording start reaches targetMs.
 * Uses an async loop with 100ms polling to avoid overshooting.
 */
async function waitUntilCumulative(recordingStartMs, targetMs) {
  while (true) {
    const elapsed = performance.now() - recordingStartMs;
    if (elapsed >= targetMs) break;
    const remaining = targetMs - elapsed;
    await sleep(Math.min(remaining, 100));
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Inject loom-style overlays: custom cursor, click ripple, caption bar, presenter badge.
 * Returns helper functions bound to the page.
 */
async function injectOverlays(page) {
  await page.addInitScript(() => {
    // Custom red cursor dot
    const cursorDot = document.createElement("div");
    cursorDot.id = "__loom_cursor__";
    Object.assign(cursorDot.style, {
      position: "fixed",
      top: "0px",
      left: "0px",
      width: "14px",
      height: "14px",
      borderRadius: "50%",
      backgroundColor: "rgba(220, 38, 38, 0.9)",
      boxShadow: "0 0 0 3px rgba(220,38,38,0.3), 0 0 12px rgba(220,38,38,0.4)",
      zIndex: "2147483647",
      pointerEvents: "none",
      transform: "translate(-50%, -50%)",
      transition: "transform 0.05s ease",
    });
    document.body.appendChild(cursorDot);

    // Caption banner (bottom-center)
    const caption = document.createElement("div");
    caption.id = "__loom_caption__";
    Object.assign(caption.style, {
      position: "fixed",
      bottom: "48px",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "880px",
      padding: "10px 20px",
      borderRadius: "12px",
      backgroundColor: "rgba(15, 23, 42, 0.88)",
      backdropFilter: "blur(8px)",
      color: "white",
      fontSize: "15px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: "500",
      lineHeight: "1.5",
      textAlign: "center",
      zIndex: "2147483646",
      pointerEvents: "none",
      display: "none",
      whiteSpace: "pre-wrap",
    });
    document.body.appendChild(caption);

    // Chapter label (top of caption)
    const chapter = document.createElement("div");
    chapter.id = "__loom_chapter__";
    Object.assign(chapter.style, {
      position: "fixed",
      bottom: "108px",
      left: "50%",
      transform: "translateX(-50%)",
      padding: "4px 14px",
      borderRadius: "20px",
      backgroundColor: "rgba(37, 99, 235, 0.9)",
      color: "white",
      fontSize: "11px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: "700",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      zIndex: "2147483646",
      pointerEvents: "none",
      display: "none",
    });
    document.body.appendChild(chapter);

    // Presenter badge (bottom-left)
    const badge = document.createElement("div");
    badge.id = "__loom_badge__";
    Object.assign(badge.style, {
      position: "fixed",
      bottom: "20px",
      left: "24px",
      padding: "8px 14px",
      borderRadius: "10px",
      backgroundColor: "rgba(15, 23, 42, 0.80)",
      color: "white",
      fontSize: "11px",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: "600",
      zIndex: "2147483646",
      pointerEvents: "none",
    });
    badge.textContent = "Istiyak Hossain Ishan  ·  Ajaia Full Stack Assignment";
    document.body.appendChild(badge);

    // Track mouse for cursor dot
    document.addEventListener("mousemove", (e) => {
      cursorDot.style.left = e.clientX + "px";
      cursorDot.style.top = e.clientY + "px";
    });

    // Click ripple effect
    document.addEventListener("click", (e) => {
      const ripple = document.createElement("div");
      Object.assign(ripple.style, {
        position: "fixed",
        left: e.clientX + "px",
        top: e.clientY + "px",
        width: "0px",
        height: "0px",
        borderRadius: "50%",
        backgroundColor: "rgba(220, 38, 38, 0.4)",
        transform: "translate(-50%, -50%)",
        zIndex: "2147483645",
        pointerEvents: "none",
        animation: "none",
      });
      document.body.appendChild(ripple);

      let size = 0;
      let opacity = 0.6;
      const grow = setInterval(() => {
        size += 8;
        opacity -= 0.04;
        ripple.style.width = size + "px";
        ripple.style.height = size + "px";
        ripple.style.opacity = opacity;
        if (size > 80) {
          clearInterval(grow);
          ripple.remove();
        }
      }, 16);
    });

    // JS API for caption updates
    window.__updateCaption = (chapterText, captionText) => {
      const cap = document.getElementById("__loom_caption__");
      const chap = document.getElementById("__loom_chapter__");
      if (cap && chap) {
        if (captionText) {
          cap.textContent = captionText;
          cap.style.display = "block";
        } else {
          cap.style.display = "none";
        }
        if (chapterText) {
          chap.textContent = chapterText;
          chap.style.display = "block";
        } else {
          chap.style.display = "none";
        }
      }
    };

    // JS API for simulating click ripple at arbitrary position
    window.__simulateClick = (x, y) => {
      const event = new MouseEvent("click", { clientX: x, clientY: y, bubbles: true });
      document.dispatchEvent(event);
    };

    // Move cursor to position
    window.__moveCursor = (x, y) => {
      const dot = document.getElementById("__loom_cursor__");
      if (dot) {
        dot.style.left = x + "px";
        dot.style.top = y + "px";
      }
    };
  });
}

/**
 * Smooth mouse move + click helper.
 */
async function smoothClick(page, selector, options = {}) {
  const { timeout = 10000, force = false } = options;
  try {
    const el = await page.waitForSelector(selector, { timeout, state: "visible" });
    const box = await el.boundingBox();
    if (box) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;
      await page.mouse.move(targetX, targetY, { steps: 20 });
      await sleep(120);
      // Try ripple effect (only available after init script has fired via page reload)
      await page.evaluate(({ x, y }) => {
        if (window.__simulateClick) window.__simulateClick(x, y);
      }, { x: targetX, y: targetY }).catch(() => {});
      await sleep(100);
    }
    if (force) {
      await el.click({ force: true });
    } else {
      await el.click();
    }
    return el;
  } catch (err) {
    console.warn(`⚠ smoothClick failed for "${selector}": ${err.message.split('\n')[0]}`);
    // Fallback: try force click
    try {
      const el = await page.$(selector);
      if (el) await el.click({ force: true });
    } catch (_) {}
  }
}

/**
 * Update the on-screen caption overlay.
 */
async function updateCaption(page, chapterText, captionText) {
  await page.evaluate(({ ch, cap }) => {
    if (window.__updateCaption) window.__updateCaption(ch, cap);
  }, { ch: chapterText, cap: captionText });
}

/**
 * Take a screenshot and save to both screenshots/ and submission-drive-folder/screenshots/.
 */
async function takeScreenshot(page, name) {
  const fileName = `${name}.png`;
  const p1 = join(SCREENSHOTS_DIR, fileName);
  const p2 = join(SUBMISSION_SCREENSHOTS, fileName);
  await page.screenshot({ path: p1, fullPage: false });
  copyFileSync(p1, p2);
  console.log(`  📸 Screenshot: ${fileName}`);
}

// ─── Main Recording Logic ───────────────────────────────────────────────────

async function main() {
  // Verify environment
  if (!existsSync(FFMPEG)) throw new Error(`FFmpeg not found at ${FFMPEG}`);
  for (let i = 1; i <= 14; i++) {
    const f = join(BEAT_AUDIO_DIR, `beat_${String(i).padStart(2, "0")}.mp3`);
    if (!existsSync(f)) throw new Error(`Missing: ${f}`);
  }

  // Setup dirs
  mkdirSync(VIDEO_TEMP_DIR, { recursive: true });
  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  mkdirSync(SUBMISSION_SCREENSHOTS, { recursive: true });

  // Step 1: Load beat timings
  console.log("\n📊 Loading beat timings...");
  const { durations, cumulative, total } = loadBeatTimings();
  console.log(`\n⏱  Total narration: ${(total / 1000).toFixed(1)}s`);

  // Step 2: Concatenate audio
  console.log("\n🎵 Concatenating audio...");
  concatenateAudio(BEAT_AUDIO_DIR, CONCAT_AUDIO);

  // Step 3: Launch browser and record
  console.log("\n🎬 Launching Chromium at 1920x1080...");
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--start-maximized",
      "--disable-infobars",
      "--no-default-browser-check",
    ],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEO_TEMP_DIR, size: VIEWPORT },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  // Set the initial reviewer cookie
  await context.addCookies([{
    name: "ajaia_user_email",
    value: "istiyakishan7@gmail.com",
    domain: "localhost",
    path: "/",
  }]);

  const page = await context.newPage();

  // Inject overlays BEFORE navigation so init script fires
  await injectOverlays(page);

  // ─── RECORDING START ───────────────────────────────────────────────────────
  const recordingStart = performance.now();
  console.log("\n🔴 Recording started...\n");

  // ── BEAT 01: Dashboard Overview ────────────────────────────────────────────
  console.log("▶ Beat 01: Dashboard Overview");
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
  await sleep(800);
  await updateCaption(page,
    "Beat 01 · Dashboard Overview",
    "Welcome! I'm Istiyak Hossain Ishan — here's Ajaia Docs, a lightweight\ncollaborative document editor built for the Ajaia Full Stack assignment."
  );
  await sleep(2000);
  // Pan/scroll to show both sections
  await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
  await sleep(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);
  // Take screenshot 1
  await takeScreenshot(page, "01-dashboard");
  await waitUntilCumulative(recordingStart, cumulative[1]);

  // ── BEAT 02: Create New Document ───────────────────────────────────────────
  console.log("▶ Beat 02: Create New Document");
  await updateCaption(page,
    "Beat 02 · Create Document",
    "Clicking 'New Blank Document' — then renaming the title inline.\nTitle auto-saves to Neon PostgreSQL on blur."
  );
  await smoothClick(page, "button:has-text('New Blank Document')");
  await page.waitForURL(/\/documents\//, { timeout: 15000 });
  await sleep(1200);
  // Clear title and type new one
  const titleInput = await page.waitForSelector("input[placeholder='Untitled Document']", { timeout: 8000 });
  await titleInput.click({ clickCount: 3 });
  await sleep(300);
  await titleInput.fill("Ajaia Product Strategy & Q4 Spec");
  await sleep(400);
  await titleInput.press("Tab"); // triggers blur / save
  await sleep(1500);
  // Take screenshot 2
  await takeScreenshot(page, "02-new-document");
  await waitUntilCumulative(recordingStart, cumulative[2]);

  // ── BEAT 03: Rich Text Formatting + Auto-Save ───────────────────────────────
  console.log("▶ Beat 03: Rich Text Formatting");
  await updateCaption(page,
    "Beat 03 · Rich Text Editor",
    "Applying Heading 1, H2, Bold, Italic, Underline, Bullet List.\nWatch auto-save cycle: Unsaved → Saving → Saved."
  );
  const editor = await page.waitForSelector(".ProseMirror", { timeout: 8000 });
  await editor.click();
  await sleep(400);

  // Apply H1
  await smoothClick(page, "button[title='Heading 1']");
  await sleep(200);
  await page.keyboard.type("Strategic Goals for Q4 2026");
  await page.keyboard.press("Enter");
  await sleep(300);

  // Back to paragraph, then type with H2
  await smoothClick(page, "button[title='Heading 2']");
  await sleep(200);
  await page.keyboard.type("1. Product Engineering");
  await page.keyboard.press("Enter");
  await sleep(300);

  // Normal paragraph with Bold
  await smoothClick(page, "button[title='Normal Paragraph']");
  await sleep(200);
  await smoothClick(page, "button[title='Bold (Cmd+B)']");
  await sleep(150);
  await page.keyboard.type("Priority: ");
  await smoothClick(page, "button[title='Bold (Cmd+B)']");
  await sleep(150);
  await page.keyboard.type("Ship collaborative editor with RBAC");
  await page.keyboard.press("Enter");
  await sleep(300);

  // Italic text
  await smoothClick(page, "button[title='Italic (Cmd+I)']");
  await sleep(150);
  await page.keyboard.type("Timeline: October 2026 — December 2026");
  await smoothClick(page, "button[title='Italic (Cmd+I)']");
  await page.keyboard.press("Enter");
  await sleep(300);

  // Underline
  await smoothClick(page, "button[title='Underline (Cmd+U)']");
  await sleep(150);
  await page.keyboard.type("Key Result: 32/32 tests passing");
  await smoothClick(page, "button[title='Underline (Cmd+U)']");
  await page.keyboard.press("Enter");
  await sleep(300);

  // Bullet list
  await smoothClick(page, "button[title='Bullet List']");
  await sleep(200);
  await page.keyboard.type("File import engine (.txt, .md, .docx)");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Role-based access control (Owner, Editor, Viewer)");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Version snapshots with one-click restore");
  await page.keyboard.press("Escape");
  await sleep(600);

  // Wait for save status to cycle
  await sleep(2500); // let debounce fire (1.5s) and save to complete

  // Now refresh and verify persistence
  await updateCaption(page,
    "Beat 03 · Persistence Check",
    "Refreshing browser — all formatting must persist from PostgreSQL."
  );
  await page.reload({ waitUntil: "networkidle", timeout: 20000 });
  await sleep(1500);
  await takeScreenshot(page, "03-editor-formatting");
  await waitUntilCumulative(recordingStart, cumulative[3]);

  // ── BEAT 04: File Upload from Dashboard ────────────────────────────────────
  console.log("▶ Beat 04: File Upload Modal");
  await updateCaption(page,
    "Beat 04 · File Ingestion Engine",
    "From the dashboard: 'Upload File' opens the import modal.\nSupports .txt, .md, .docx up to 5MB — create new doc or append."
  );
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });
  await sleep(800);
  await smoothClick(page, "button:has-text('Upload File (.txt, .md, .docx)')");
  const uploadModal = await page.waitForSelector("h3:has-text('Import Document')", { timeout: 8000 });
  await sleep(1200);
  await takeScreenshot(page, "04-upload-modal");
  await waitUntilCumulative(recordingStart, cumulative[4]);

  // ── BEAT 05: Upload MD File → New Document ─────────────────────────────────
  console.log("▶ Beat 05: Upload Markdown File");
  await updateCaption(page,
    "Beat 05 · Markdown Import",
    "Selecting an architecture spec .md file — Marked library converts\nheadings, bold, code blocks into clean semantic HTML."
  );
  // Set the file on the hidden input
  const fileInputNew = await page.waitForSelector("input[type='file']", { timeout: 5000, state: "attached" });
  await fileInputNew.setInputFiles(join(TEST_FILES_DIR, "architecture-spec.md"));
  await sleep(1200);
  // Click Import & Open
  await smoothClick(page, "button:has-text('Import & Open')");
  // Wait for navigation to new doc
  await page.waitForURL(/\/documents\//, { timeout: 20000 });
  await sleep(1500);
  await takeScreenshot(page, "05-imported-markdown");
  await waitUntilCumulative(recordingStart, cumulative[5]);

  // ── BEAT 06: Append TXT File + Reject PDF ─────────────────────────────────
  console.log("▶ Beat 06: Append TXT + PDF Rejection");
  await updateCaption(page,
    "Beat 06 · Append & Validation",
    "Clicking 'Import File' to append plain-text meeting notes.\nThen: a .pdf file is immediately rejected by Zod validation."
  );
  await smoothClick(page, "button:has-text('Import File')");
  await page.waitForSelector("h3:has-text('Import Document')", { timeout: 8000 });
  await sleep(600);

  // Switch to Append mode (it should default to append since targetDocumentId is set)
  const appendBtn = await page.$("button:has-text('Append to Current Doc')");
  if (appendBtn) {
    await smoothClick(page, "button:has-text('Append to Current Doc')");
    await sleep(300);
  }

  // Select the .txt file
  const fileInputAppend = await page.waitForSelector("input[type='file']", { timeout: 5000, state: "attached" });
  await fileInputAppend.setInputFiles(join(TEST_FILES_DIR, "meeting-notes.txt"));
  await sleep(800);
  await smoothClick(page, "button:has-text('Append to Document')");
  // Wait for modal to close (append completes)
  await page.waitForSelector("h3:has-text('Import Document')", { state: "hidden", timeout: 15000 });
  await sleep(1000);

  // Now demonstrate PDF rejection: open upload modal again
  await smoothClick(page, "button:has-text('Import File')");
  await page.waitForSelector("h3:has-text('Import Document')", { timeout: 8000 });
  await sleep(600);

  // Set invalid PDF file — this triggers Zod validation on front end
  const fileInputPdf = await page.waitForSelector("input[type='file']", { timeout: 5000, state: "attached" });
  await fileInputPdf.setInputFiles({
    name: "invalid-format.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 fake pdf for rejection test"),
  });
  await sleep(1200); // Error banner should appear
  await takeScreenshot(page, "06-pdf-rejection");
  // Close upload modal via Escape (no aria-label on upload modal X button)
  await page.keyboard.press("Escape");
  await sleep(400);
  // If still open, click the Cancel button
  const cancelBtn = await page.$("button:has-text('Cancel')");
  if (cancelBtn) await cancelBtn.click();
  await sleep(600);
  await waitUntilCumulative(recordingStart, cumulative[6]);

  // ── BEAT 07: Share Modal — Grant Alex Edit ─────────────────────────────────
  console.log("▶ Beat 07: Share Modal — Grant Alex Edit");
  await updateCaption(page,
    "Beat 07 · Share & Permissions",
    "Opening Share modal — quick-select pill for Alex Rivera.\nGranting 'Can Edit' access with one click."
  );
  await smoothClick(page, "button:has-text('Share')");
  await page.waitForSelector("h3:has-text('Share & Permissions')", { timeout: 8000 });
  await sleep(1000);

  // Click Alex Rivera quick-select pill
  await smoothClick(page, "button:has-text('Alex Rivera')");
  await sleep(600);

  // Make sure permission is EDIT (should be default)
  const permSelect = await page.$("form select");
  if (permSelect) {
    await permSelect.selectOption("EDIT");
    await sleep(300);
  }

  // Click Share button
  await smoothClick(page, "form button:has-text('Share')");
  await sleep(1500);
  await takeScreenshot(page, "07-share-alex");
  await waitUntilCumulative(recordingStart, cumulative[7]);

  // ── BEAT 08: Share Modal — Grant Sam View ─────────────────────────────────
  console.log("▶ Beat 08: Share Modal — Grant Sam View");
  await updateCaption(page,
    "Beat 08 · View-Only Sharing",
    "Granting Sam Chen 'View Only' access — collaborator list updates instantly.\nCopying document link."
  );

  // Click Sam Chen quick-select pill (if visible — if already shared, it won't appear)
  const samPill = await page.$("button:has-text('Sam Chen')");
  if (samPill) {
    await smoothClick(page, "button:has-text('Sam Chen')");
    await sleep(400);

    // Set permission to VIEW
    const permSelectSam = await page.$("form select");
    if (permSelectSam) {
      await permSelectSam.selectOption("VIEW");
      await sleep(300);
    }

    await smoothClick(page, "form button:has-text('Share')");
    await sleep(1500);
  } else {
    // Sam already shared — use email input
    const emailInput = await page.$("form input[type='email']");
    if (emailInput) {
      await emailInput.fill("sam@ajaia.com");
      const permSelectSam = await page.$("form select");
      if (permSelectSam) await permSelectSam.selectOption("VIEW");
      await sleep(300);
      await smoothClick(page, "form button:has-text('Share')");
      await sleep(1500);
    }
  }

  // Copy link
  await smoothClick(page, "button:has-text('Copy Link')");
  await sleep(1200);
  await takeScreenshot(page, "08-share-sam-view");

  // Close Share Modal using aria-label
  await smoothClick(page, "button[aria-label='Close Share Modal']");
  await sleep(600);
  await waitUntilCumulative(recordingStart, cumulative[8]);

  // ── BEAT 09: Switch to Alex Rivera ────────────────────────────────────────
  console.log("▶ Beat 09: Switch to Alex Rivera");
  await updateCaption(page,
    "Beat 09 · Editor Role (Alex Rivera)",
    "Switching to Alex Rivera via Reviewer Account Switcher.\nEditor role badge appears — Alex can type and auto-save fires."
  );

  // Open switcher dropdown
  await smoothClick(page, "button[aria-label='Switch Test User']");
  await sleep(600);
  // Click Alex Rivera in dropdown
  await smoothClick(page, "button:has-text('Alex Rivera')");
  await sleep(2000); // let page re-render with Alex's session

  // The editor badge should now show "Editor"
  await page.waitForSelector("span:has-text('Editor')", { timeout: 8000 }).catch(() => {});
  await sleep(500);

  // Type a collaborative note
  const editorAsAlex = await page.$(".ProseMirror");
  if (editorAsAlex) {
    await editorAsAlex.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await smoothClick(page, "button[title='Heading 2']");
    await sleep(200);
    await page.keyboard.type("Alex Rivera's Collaborative Notes");
    await page.keyboard.press("Enter");
    await smoothClick(page, "button[title='Normal Paragraph']");
    await sleep(200);
    await page.keyboard.type("Added review comments on the Q4 architecture decisions.");
    await sleep(2500); // wait for auto-save
  }
  await takeScreenshot(page, "09-alex-editor");
  await waitUntilCumulative(recordingStart, cumulative[9]);

  // ── BEAT 10: Switch to Sam Chen — View-Only ──────────────────────────────
  console.log("▶ Beat 10: Switch to Sam Chen — View-Only");
  await updateCaption(page,
    "Beat 10 · View-Only Role (Sam Chen)",
    "Switching to Sam Chen — 'View Only' badge, amber read-only banner.\nAll toolbar buttons disabled. Server rejects PATCH with 403."
  );

  // Go to dashboard first
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });
  await sleep(800);

  // Switch to Sam
  await smoothClick(page, "button[aria-label='Switch Test User']");
  await sleep(600);
  await smoothClick(page, "button:has-text('Sam Chen')");
  await sleep(2000);

  // Sam's dashboard — Shared with Me section shows View Only
  await takeScreenshot(page, "10a-sam-dashboard");
  await sleep(500);

  // Click the shared document (find it in Shared with Me section)
  const sharedDocLink = await page.$("section a[href^='/documents/']");
  if (sharedDocLink) {
    await sharedDocLink.click();
    await page.waitForURL(/\/documents\//, { timeout: 10000 });
    await sleep(1500);
  }

  // Should show amber read-only banner
  await page.waitForSelector("span:has-text('Read-Only Viewer')", { timeout: 8000 }).catch(() => {});
  await sleep(500);
  await takeScreenshot(page, "10b-sam-view-only");
  await waitUntilCumulative(recordingStart, cumulative[10]);

  // ── BEAT 11: Version History + Export ─────────────────────────────────────
  console.log("▶ Beat 11: Version History + Export");
  await updateCaption(page,
    "Beat 11 · Stretch Features",
    "Version History: named snapshots with one-click restore.\nExport: Markdown download, HTML export, or Print to PDF."
  );

  // Switch back to Istiyak (owner)
  await smoothClick(page, "button[aria-label='Switch Test User']");
  await sleep(500);
  await smoothClick(page, "button:has-text('Istiyak Hossain Ishan')");
  await sleep(1500);

  // Click Snapshot button to create a version
  const snapshotBtn = await page.$("button:has-text('Snapshot')");
  if (snapshotBtn) {
    await smoothClick(page, "button:has-text('Snapshot')");
    await sleep(1500);
  }

  // Open History drawer
  await smoothClick(page, "button:has-text('History')");
  await page.waitForSelector("h3:has-text('Version History')", { timeout: 8000 });
  await sleep(1200);
  await takeScreenshot(page, "11a-version-history");
  await sleep(600);

  // Close history drawer
  await smoothClick(page, "button[aria-label='Close Version History']");
  await sleep(600);

  // Open Export dropdown
  await smoothClick(page, "button:has-text('Export')");
  await page.waitForSelector("text=Export as Markdown (.md)", { timeout: 5000 });
  await sleep(1000);
  await takeScreenshot(page, "11b-export-menu");

  // Close export menu (press Escape)
  await page.keyboard.press("Escape");
  await sleep(400);
  await waitUntilCumulative(recordingStart, cumulative[11]);

  // ── BEAT 12: Architecture Callout ─────────────────────────────────────────
  console.log("▶ Beat 12: Architecture Callout");
  await updateCaption(page,
    "Beat 12 · Architecture",
    "Next.js 14 App Router · TypeScript · TipTap ProseMirror · Prisma ORM\nNeon Serverless PostgreSQL · Server-enforced RBAC on every route."
  );
  // Show dashboard with both doc sections
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });
  await sleep(1000);
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
  await sleep(1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await sleep(1000);
  await takeScreenshot(page, "12-architecture-view");
  await waitUntilCumulative(recordingStart, cumulative[12]);

  // ── BEAT 13: AI Collaboration Story ───────────────────────────────────────
  console.log("▶ Beat 13: AI Collaboration Story");
  await updateCaption(page,
    "Beat 13 · AI-Assisted Development",
    "Pair-programmed with Gemini Flash for scaffolding.\nKey human decisions: TipTap over execCommand, Neon over SQLite,\nserver-side RBAC over frontend-only guards."
  );
  // Show document page (the main one) with the editor toolbar visible
  const ownedLink = await page.$("section a[href^='/documents/']");
  if (ownedLink) {
    await ownedLink.click();
    await page.waitForURL(/\/documents\//, { timeout: 10000 });
    await sleep(1200);
  }
  await takeScreenshot(page, "13-ai-collab");
  await waitUntilCumulative(recordingStart, cumulative[13]);

  // ── BEAT 14: Test Suite + Closing ─────────────────────────────────────────
  console.log("▶ Beat 14: Test Suite + Closing");
  await updateCaption(page,
    "Beat 14 · 32 Vitest Tests Passing",
    "32 unit tests covering file parser rules, Zod schema validation,\nand all RBAC permission boundaries — 100% passing in <1 second.\nAjaia Docs is live and ready for review. Thank you!"
  );
  // Stay on the editor page and show the full UI for the closing beat
  await sleep(1500);
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 20000 });
  await sleep(2000);
  await takeScreenshot(page, "14-closing-dashboard");

  // Wait until all 14 beats' audio is complete
  await waitUntilCumulative(recordingStart, cumulative[13] + durations[13] + 1500);
  await updateCaption(page, "", ""); // hide caption
  await sleep(500);

  const totalRecordedMs = performance.now() - recordingStart;
  console.log(`\n⏹  Recording complete: ${(totalRecordedMs / 1000).toFixed(1)}s`);

  // ─── Close browser and mux video ──────────────────────────────────────────
  await context.close();
  await browser.close();

  // Find the recorded webm
  const webmFiles = readdirSync(VIDEO_TEMP_DIR).filter((f) => f.endsWith(".webm"));
  if (webmFiles.length === 0) {
    throw new Error(`No webm file found in ${VIDEO_TEMP_DIR}`);
  }
  const webmPath = join(VIDEO_TEMP_DIR, webmFiles[0]);
  console.log(`\n🎞  Source video: ${webmPath}`);

  // Step 4: Mux video + audio → H.264 MP4
  console.log("🔧 Muxing video + audio...");
  const muxResult = spawnSync(FFMPEG, [
    "-y",
    "-i", webmPath,
    "-i", CONCAT_AUDIO,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    OUTPUT_MP4,
  ]);

  if (muxResult.status !== 0) {
    console.error("FFmpeg mux stderr:", (muxResult.stderr || "").toString());
    throw new Error("FFmpeg mux failed");
  }

  console.log(`\n✅ Video ready: ${OUTPUT_MP4}`);

  // Verify output
  const verifyResult = spawnSync(FFMPEG, ["-i", OUTPUT_MP4]);
  const verifyOutput = (verifyResult.stderr || "").toString();
  for (const line of verifyOutput.split("\n")) {
    const l = line.trim();
    if (l.includes("Duration:") || l.includes("Video:") || l.includes("Audio:")) {
      console.log("   " + l);
    }
  }

  console.log("\n🏁 Walkthrough video pipeline complete!");
  console.log(`   Output: ${OUTPUT_MP4}`);
  console.log(`   Screenshots: ${SCREENSHOTS_DIR}`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
