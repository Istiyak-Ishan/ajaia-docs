/**
 * scripts/verify-all.mjs
 * Comprehensive Pre-Submit Verification Audit across all 7 rubric categories.
 */

import { existsSync, statSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync, spawnSync } from 'child_process';

const ROOT = resolve('.');
const SUBMISSION_DIR = join(ROOT, 'submission-drive-folder');
const LIVE_URL = 'https://ajaia-docs-874y.vercel.app';
const YOUTUBE_URL = 'https://www.youtube.com/watch?v=s_PRixgsHTU';
const DRIVE_URL = 'https://drive.google.com/drive/folders/199KfQ95k2p8EQ4kmmARwNhzukFajDq6Q?usp=sharing';
const GITHUB_URL = 'https://github.com/Istiyak-Ishan/ajaia-docs';

const results = [];

function record(category, name, passed, details = '') {
  results.push({ category, name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${status}] ${category}: ${name} ${details ? '(' + details + ')' : ''}`);
}

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 AJAIA LLC — PRE-SUBMIT VERIFICATION AUDIT');
  console.log('Candidate: Istiyak Hossain Ishan (istiyakishan7@gmail.com)');
  console.log('Live App: ' + LIVE_URL);
  console.log('Video:    ' + YOUTUBE_URL);
  console.log('Drive:    ' + DRIVE_URL);
  console.log('Repo:     ' + GITHUB_URL);
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: Document Creation & Editing + Rich-Text Formatting
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. Document Creation & Editing + Rich-Text Formatting ---');
  try {
    const { prisma } = await import('../src/lib/prisma.ts');
    const { parseUploadedFileToHtml } = await import('../src/lib/file-parser.ts');

    // Create a new document in DB
    const testDoc = await prisma.document.create({
      data: {
        title: 'Audit Rich-Text Verification Doc',
        content: '<p>Initial</p>',
        owner: {
          connect: { email: 'istiyakishan7@gmail.com' }
        }
      }
    });

    const richHtml = '<h1>Strategic Vision</h1><h2>Phase 1</h2><h3>Milestones</h3><p><strong>Bold Text</strong> and <em>Italicized Text</em> and <u>Underlined Text</u></p><ul><li>Bullet A</li><li>Bullet B</li></ul><ol><li>Action 1</li><li>Action 2</li></ol>';

    // Update with full rich-text suite and inline title change
    const updatedDoc = await prisma.document.update({
      where: { id: testDoc.id },
      data: {
        title: 'Audit Rich-Text Verification Doc (Renamed)',
        content: richHtml
      }
    });

    // Re-fetch to confirm persistence
    const reloaded = await prisma.document.findUnique({
      where: { id: testDoc.id }
    });

    const titleOk = reloaded.title === 'Audit Rich-Text Verification Doc (Renamed)';
    const contentOk = reloaded.content === richHtml;
    const hasH1 = reloaded.content.includes('<h1>Strategic Vision</h1>');
    const hasH2 = reloaded.content.includes('<h2>Phase 1</h2>');
    const hasH3 = reloaded.content.includes('<h3>Milestones</h3>');
    const hasBold = reloaded.content.includes('<strong>Bold Text</strong>');
    const hasItalic = reloaded.content.includes('<em>Italicized Text</em>');
    const hasUnderline = reloaded.content.includes('<u>Underlined Text</u>');
    const hasBullet = reloaded.content.includes('<ul><li>Bullet A</li>');
    const hasNumbered = reloaded.content.includes('<ol><li>Action 1</li>');

    const cat1Pass = titleOk && contentOk && hasH1 && hasH2 && hasH3 && hasBold && hasItalic && hasUnderline && hasBullet && hasNumbered;

    record(
      'Cat 1: Creation & Rich-Text',
      'Create, inline rename, and rich-text persistence (H1-H3, Bold, Italic, Underline, Bullet/Numbered lists)',
      cat1Pass,
      cat1Pass ? 'All tags confirmed in DB' : 'Mismatch in persisted tags'
    );

    // Clean up
    await prisma.document.delete({ where: { id: testDoc.id } });
  } catch (err) {
    record('Cat 1: Creation & Rich-Text', 'Document lifecycle test', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: File Upload (.txt, .md, .docx) + Clear UI/README Notice
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. File Upload (.txt, .md, .docx) + Clear UI/README Notice ---');
  try {
    const { parseUploadedFileToHtml } = await import('../src/lib/file-parser.ts');

    // Test .txt parsing
    const txtBuffer = Buffer.from('Meeting Notes\n\nDiscussion on Q4 roadmap.\nSecurity & XSS <script>alert(1)</script>');
    const txtResult = await parseUploadedFileToHtml('notes.txt', txtBuffer);
    const txtHtml = txtResult.htmlContent;
    const txtPass = txtHtml.includes('<p>Meeting Notes</p>') && !txtHtml.includes('<script>') && txtHtml.includes('&lt;script&gt;');
    record('Cat 2: File Upload', 'Parse .txt with HTML/XSS entity escaping', txtPass);

    // Test .md parsing
    const mdBuffer = Buffer.from('# Architecture Guide\n\n**High Availability** and *Fast Caching*\n\n- Feature 1\n- Feature 2');
    const mdResult = await parseUploadedFileToHtml('spec.md', mdBuffer);
    const mdHtml = mdResult.htmlContent;
    const mdPass = mdHtml.includes('<h1') && mdHtml.includes('<strong>High Availability</strong>') && mdHtml.includes('<ul>');
    record('Cat 2: File Upload', 'Parse .md with semantic HTML headings, bold, and lists', mdPass);

    // Test .docx parsing
    let docxPass = false;
    try {
      const mammoth = await import('mammoth');
      docxPass = typeof mammoth.convertToHtml === 'function';
    } catch {
      docxPass = false;
    }
    record('Cat 2: File Upload', 'Mammoth docx parser wired', docxPass);

    // Test unsupported file rejection (.exe)
    let rejectedExe = false;
    try {
      await parseUploadedFileToHtml('malware.exe', Buffer.from('fake exe content'));
    } catch (err) {
      rejectedExe = err.message.includes('Supported formats are .txt, .md, and .docx');
    }
    record('Cat 2: File Upload', 'Unsupported .exe rejected with error message', rejectedExe);

    // Test unsupported file rejection (.pdf)
    let rejectedPdf = false;
    try {
      await parseUploadedFileToHtml('document.pdf', Buffer.from('%PDF fake'));
    } catch (err) {
      rejectedPdf = err.message.includes('Supported formats are .txt, .md, and .docx');
    }
    record('Cat 2: File Upload', 'Unsupported .pdf rejected with error message', rejectedPdf);

    // Verify UI notice in UploadModal.tsx and README.md
    const uploadModalSrc = readFileSync(join(ROOT, 'src/components/UploadModal.tsx'), 'utf-8');
    const readmeSrc = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    const modalHasNotice = uploadModalSrc.includes('.txt, .md, and .docx (max 5MB)') || uploadModalSrc.includes('.txt, .md, .docx');
    const readmeHasNotice = readmeSrc.includes('.txt, .md, and .docx');
    record('Cat 2: File Upload', 'UploadModal component and README.md explicitly state .txt, .md, .docx formats', modalHasNotice && readmeHasNotice);
  } catch (err) {
    record('Cat 2: File Upload', 'File parser tests', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: Sharing & Access Control (OWNER / EDIT / VIEW)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Sharing & Access Control (OWNER / EDIT / VIEW) ---');
  try {
    const { prisma } = await import('../src/lib/prisma.ts');
    const apiBase = LIVE_URL; // Verify against live production deployment

    // 1. Create doc as Istiyak (OWNER)
    const createRes = await fetch(`${apiBase}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'istiyakishan7@gmail.com' },
      body: JSON.stringify({ title: 'RBAC Verification Suite Doc', content: '<p>Initial</p>' })
    });
    const docData = await createRes.json();
    const docId = docData.id;

    // 2. Share with Alex (EDIT) and Sam (VIEW) via POST /api/documents/[id]/share
    const shareAlexRes = await fetch(`${apiBase}/api/documents/${docId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'istiyakishan7@gmail.com' },
      body: JSON.stringify({ email: 'alex@ajaia.com', permission: 'EDIT' })
    });
    const shareSamRes = await fetch(`${apiBase}/api/documents/${docId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'istiyakishan7@gmail.com' },
      body: JSON.stringify({ email: 'sam@ajaia.com', permission: 'VIEW' })
    });
    record('Cat 3: Access Control', 'Owner can grant EDIT to Alex and VIEW to Sam via /share endpoint', shareAlexRes.status === 200 && shareSamRes.status === 200);

    // 3. Verify GET /api/documents returns separate owned and shared arrays
    const alexDocsRes = await fetch(`${apiBase}/api/documents`, {
      headers: { 'x-user-email': 'alex@ajaia.com' }
    });
    const alexDocs = await alexDocsRes.json();
    const alexHasShared = alexDocs.shared && alexDocs.shared.some(d => d.id === docId);

    const samDocsRes = await fetch(`${apiBase}/api/documents`, {
      headers: { 'x-user-email': 'sam@ajaia.com' }
    });
    const samDocs = await samDocsRes.json();
    const samHasShared = samDocs.shared && samDocs.shared.some(d => d.id === docId);

    record('Cat 3: Access Control', 'GET /api/documents returns separate owned and shared arrays for collaborators', alexHasShared && samHasShared);

    // 4. Verify Alex (EDIT) can PATCH content (HTTP 200)
    const alexPatchRes = await fetch(`${apiBase}/api/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'alex@ajaia.com' },
      body: JSON.stringify({ title: 'RBAC Doc (Edited by Alex)', content: '<p>Alex edit confirmed</p>' })
    });
    record('Cat 3: Access Control', 'Alex (EDIT) can PATCH document content (HTTP 200)', alexPatchRes.status === 200);

    // 5. Verify Sam (VIEW) receives HTTP 403 Forbidden on PATCH
    const samPatchRes = await fetch(`${apiBase}/api/documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'sam@ajaia.com' },
      body: JSON.stringify({ title: 'Illegal Edit by Sam', content: '<p>Should fail</p>' })
    });
    record('Cat 3: Access Control', 'Sam (VIEW) receives HTTP 403 Forbidden on PATCH', samPatchRes.status === 403);

    // 6. Verify Sam (VIEW) receives HTTP 403 Forbidden on DELETE
    const samDeleteRes = await fetch(`${apiBase}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': 'sam@ajaia.com' }
    });
    record('Cat 3: Access Control', 'Sam (VIEW) receives HTTP 403 Forbidden on DELETE', samDeleteRes.status === 403);

    // 7. Verify Alex (EDIT) receives HTTP 403 Forbidden on DELETE (only owner can delete)
    const alexDeleteRes = await fetch(`${apiBase}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': 'alex@ajaia.com' }
    });
    record('Cat 3: Access Control', 'Alex (EDIT) receives HTTP 403 Forbidden on DELETE', alexDeleteRes.status === 403);

    // 8. Verify Istiyak (OWNER) can DELETE document (HTTP 200)
    const ownerDeleteRes = await fetch(`${apiBase}/api/documents/${docId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': 'istiyakishan7@gmail.com' }
    });
    record('Cat 3: Access Control', 'Istiyak (OWNER) has full DELETE privilege (HTTP 200)', ownerDeleteRes.status === 200);

    // 9. Verify Dashboard UI renders "Owned by Me" and "Shared with Me" sections
    const dashboardSrc = readFileSync(join(ROOT, 'src/app/page.tsx'), 'utf-8');
    const hasOwnedSection = dashboardSrc.includes('Owned by Me');
    const hasSharedSection = dashboardSrc.includes('Shared with Me');
    const hasRoleBadges = dashboardSrc.includes('Can Edit') && dashboardSrc.includes('View Only');
    record('Cat 3: Access Control', 'Dashboard UI renders Owned by Me & Shared with Me sections with role badges', hasOwnedSection && hasSharedSection && hasRoleBadges);
  } catch (err) {
    record('Cat 3: Access Control', 'RBAC test execution', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: Persistence (Local & Live Vercel Deployment)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Persistence (Local & Live Vercel Deployment) ---');
  try {
    const resHome = await fetch(LIVE_URL);
    record('Cat 4: Persistence (Live Vercel)', 'Live deployment root loads HTTP 200', resHome.status === 200);

    const resUsers = await fetch(`${LIVE_URL}/api/users`);
    const users = await resUsers.json();
    const emails = users.map(u => u.email.toLowerCase());
    const hasIstiyak = emails.includes('istiyakishan7@gmail.com');
    const hasAlex = emails.includes('alex@ajaia.com');
    const hasSam = emails.includes('sam@ajaia.com');
    record('Cat 4: Persistence (Live Vercel)', 'Production Neon DB is seeded with 3 reviewer accounts', hasIstiyak && hasAlex && hasSam);

    const resDocs = await fetch(`${LIVE_URL}/api/documents`, {
      headers: { 'x-user-email': 'istiyakishan7@gmail.com' }
    });
    record('Cat 4: Persistence (Live Vercel)', 'Production /api/documents returns HTTP 200 with owned/shared arrays', resDocs.status === 200);

    // Live create -> patch -> get -> delete persistence cycle
    const createLive = await fetch(`${LIVE_URL}/api/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'istiyakishan7@gmail.com' },
      body: JSON.stringify({ title: 'Live Verification Round-Trip', content: '<p>Alpha</p>' })
    });
    const liveDoc = await createLive.json();
    const liveId = liveDoc.id;

    const patchLive = await fetch(`${LIVE_URL}/api/documents/${liveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-user-email': 'istiyakishan7@gmail.com' },
      body: JSON.stringify({ title: 'Live Verification Round-Trip (Saved)', content: '<p><strong>Beta Verified</strong></p>' })
    });

    const getLive = await fetch(`${LIVE_URL}/api/documents/${liveId}`, {
      headers: { 'x-user-email': 'istiyakishan7@gmail.com' }
    });
    const reloadedLive = await getLive.json();
    const livePersisted = reloadedLive.title === 'Live Verification Round-Trip (Saved)' && reloadedLive.content === '<p><strong>Beta Verified</strong></p>';

    // Clean up
    await fetch(`${LIVE_URL}/api/documents/${liveId}`, {
      method: 'DELETE',
      headers: { 'x-user-email': 'istiyakishan7@gmail.com' }
    });

    record('Cat 4: Persistence (Live Vercel)', 'Live cloud round-trip create/patch/persist/delete cycle succeeds', livePersisted);
  } catch (err) {
    record('Cat 4: Persistence (Live Vercel)', 'Live Vercel connection test', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: Engineering Quality & Automated Tests
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Engineering Quality & Automated Tests ---');
  try {
    console.log('Running vitest...');
    const testResult = spawnSync('npm', ['test'], { shell: true, encoding: 'utf-8' });
    const testsPassed = testResult.status === 0 && testResult.stdout.includes('32 passed');
    record('Cat 5: Engineering Quality', 'Automated test suite (Vitest): 32/32 tests pass', testsPassed);

    console.log('Verifying production build typecheck & bundling...');
    const buildResult = spawnSync('npx', ['next', 'build'], { shell: true, encoding: 'utf-8' });
    const buildPassed = buildResult.status === 0 && !buildResult.stdout.includes('Failed to compile');
    record('Cat 5: Engineering Quality', 'Next.js production build succeeds with 0 errors', buildPassed);
  } catch (err) {
    record('Cat 5: Engineering Quality', 'Build & test run', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: Google Drive Folder Bundle Completeness
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Google Drive Folder Bundle Completeness ---');
  try {
    const folderExists = existsSync(SUBMISSION_DIR);
    record('Cat 6: Drive Bundle', 'submission-drive-folder exists', folderExists);

    const requiredFiles = [
      'ajaia-docs-source.zip',
      'README.md',
      'ARCHITECTURE.md',
      'AI_WORKFLOW.md',
      'SUBMISSION.md',
      'walkthrough_video_url.txt',
      'ajaia_walkthrough.mp4',
    ];

    for (const f of requiredFiles) {
      const p = join(SUBMISSION_DIR, f);
      const exists = existsSync(p);
      const size = exists ? statSync(p).size : 0;
      record('Cat 6: Drive Bundle', `Artifact: ${f}`, exists && size > 0, `Size: ${size.toLocaleString()} bytes`);
    }

    const screenshotsDir = join(SUBMISSION_DIR, 'screenshots');
    const screenshotsCount = existsSync(screenshotsDir) ? readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).length : 0;
    record('Cat 6: Drive Bundle', 'Screenshots directory with valid captures', screenshotsCount >= 5, `Found: ${screenshotsCount} PNGs`);
  } catch (err) {
    record('Cat 6: Drive Bundle', 'Drive bundle check', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: Portal Submission Readiness Check & Link Injection
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Portal Submission Readiness Check & Link Injection ---');
  try {
    const checkNoPlaceholders = (filePath) => {
      if (!existsSync(filePath)) return false;
      const content = readFileSync(filePath, 'utf-8');
      return !content.includes('[PASTE_');
    };

    const rootSubmissionOk = checkNoPlaceholders(join(ROOT, 'SUBMISSION.md'));
    const rootVideoUrlOk = checkNoPlaceholders(join(ROOT, 'walkthrough_video_url.txt'));
    const driveSubmissionOk = checkNoPlaceholders(join(SUBMISSION_DIR, 'SUBMISSION.md'));
    const driveVideoUrlOk = checkNoPlaceholders(join(SUBMISSION_DIR, 'walkthrough_video_url.txt'));

    record('Cat 7: Submission Readiness', 'Zero [PASTE_...] placeholders in root SUBMISSION.md and walkthrough_video_url.txt', rootSubmissionOk && rootVideoUrlOk);
    record('Cat 7: Submission Readiness', 'Zero [PASTE_...] placeholders in submission-drive-folder/ files', driveSubmissionOk && driveVideoUrlOk);

    // Verify exact links
    const submissionContent = readFileSync(join(ROOT, 'SUBMISSION.md'), 'utf-8');
    const hasLiveUrl = submissionContent.includes(LIVE_URL);
    const hasYoutubeUrl = submissionContent.includes(YOUTUBE_URL);
    const hasDriveUrl = submissionContent.includes(DRIVE_URL);
    const hasGithubUrl = submissionContent.includes(GITHUB_URL);

    record('Cat 7: Submission Readiness', 'Exact live URLs injected in SUBMISSION.md (Vercel, YouTube, Drive, GitHub)', hasLiveUrl && hasYoutubeUrl && hasDriveUrl && hasGithubUrl);

    // Verify lines under 1000
    const lines = submissionContent.split('\n').length;
    record('Cat 7: Submission Readiness', 'SUBMISSION.md is strictly under 1,000 lines', lines < 1000, `Lines: ${lines}`);
  } catch (err) {
    record('Cat 7: Submission Readiness', 'Portal readiness check', false, err.message);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary Table
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log('📊 FINAL AUDIT SUMMARY TABLE');
  console.log('================================================================');
  console.log('| Category | Check | Status | Details |');
  console.log('| :--- | :--- | :---: | :--- |');
  for (const r of results) {
    console.log(`| ${r.category} | ${r.name} | ${r.passed ? '✅ PASS' : '❌ FAIL'} | ${r.details || 'OK'} |`);
  }
  const allPassed = results.every(r => r.passed);
  console.log('================================================================');
  console.log(allPassed ? '🎉 ALL CHECKS PASSED — 100% READY FOR SUBMISSION!' : '⚠️ SOME CHECKS FAILED — REVIEW TABLE ABOVE.');
  console.log('================================================================');
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
