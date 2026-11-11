import { describe, it, expect } from "vitest";
import {
  parseUploadedFileToHtml,
  deriveTitleFromFileName,
  escapeHtml,
  parseTextToHtml,
  parseMarkdownToHtml,
  getFileExtension,
  ERROR_UNSUPPORTED_OR_TOO_LARGE,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/file-parser";

describe("File Parser & Ingestion Engine (src/lib/file-parser.ts)", () => {
  describe("1. Plain Text (.txt) Parsing & Sanitization", () => {
    it("safely escapes HTML tags to prevent XSS attacks", () => {
      const maliciousPayload = `<script>alert('XSS')</script><img src="x" onerror="stealCookies()" />`;
      const escaped = escapeHtml(maliciousPayload);

      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("<img");
      expect(escaped).toContain("&lt;script&gt;");
      expect(escaped).toContain("&lt;img");
      expect(escaped).toContain("&#039;XSS&#039;");
      expect(escaped).toContain("&quot;x&quot;");
    });

    it("converts multi-paragraph text files into semantic <p> and <br /> tags", () => {
      const rawText =
        "Paragraph 1 line A\nParagraph 1 line B\n\nParagraph 2 line C\n\nParagraph 3 line D";
      const html = parseTextToHtml(rawText);

      expect(html).toContain("<p>Paragraph 1 line A<br />Paragraph 1 line B</p>");
      expect(html).toContain("<p>Paragraph 2 line C</p>");
      expect(html).toContain("<p>Paragraph 3 line D</p>");
    });

    it("parses .txt buffer through parseUploadedFileToHtml", async () => {
      const textContent =
        "Meeting Minutes\n\nDiscussion on Q4 roadmap and architecture deliverables.";
      const buffer = Buffer.from(textContent, "utf-8");

      const result = await parseUploadedFileToHtml("meeting-notes.txt", buffer);

      expect(result.title).toBe("meeting-notes");
      expect(result.htmlContent).toContain("<p>Meeting Minutes</p>");
      expect(result.htmlContent).toContain(
        "<p>Discussion on Q4 roadmap and architecture deliverables.</p>"
      );
    });
  });

  describe("2. Markdown (.md) Semantic Conversion", () => {
    it("converts # Headings, **bold**, *italic*, lists, and code blocks into semantic HTML", async () => {
      const markdown = `# Architecture Overview

This is **high priority** and *confidential*.

## Deliverables
- Step 1: Database Setup
- Step 2: API Endpoints
- Step 3: TipTap Editor

1. Ordered Item 1
2. Ordered Item 2

\`console.log("hello world");\`
`;

      const html = await parseMarkdownToHtml(markdown);

      expect(html).toContain("<h1>Architecture Overview</h1>");
      expect(html).toContain("<strong>high priority</strong>");
      expect(html).toContain("<em>confidential</em>");
      expect(html).toContain("<h2>Deliverables</h2>");
      expect(html).toContain("<ul>");
      expect(html).toContain("<li>Step 1: Database Setup</li>");
      expect(html).toContain("<ol>");
      expect(html).toContain("<li>Ordered Item 1</li>");
      expect(html).toContain("<code>console.log(&quot;hello world&quot;);</code>");
    });

    it("parses .md buffer through parseUploadedFileToHtml", async () => {
      const mdContent = "## Sprint Goals\n\nShip **Ajaia Docs** taking home MVP.";
      const buffer = Buffer.from(mdContent, "utf-8");

      const result = await parseUploadedFileToHtml("Sprint-Goals.MD", buffer);

      expect(result.title).toBe("Sprint-Goals");
      expect(result.htmlContent).toContain("<h2>Sprint Goals</h2>");
      expect(result.htmlContent).toContain("<strong>Ajaia Docs</strong>");
    });
  });

  describe("3. Extension & Payload Validation", () => {
    it("extracts and normalizes file extensions accurately", () => {
      expect(getFileExtension("spec.md")).toBe(".md");
      expect(getFileExtension("SPEC.DOCX")).toBe(".docx");
      expect(getFileExtension("notes.TXT")).toBe(".txt");
      expect(getFileExtension("archive.tar.gz")).toBe(".gz");
      expect(getFileExtension("noextension")).toBe("");
    });

    it("derives clean titles from various filename patterns", () => {
      expect(deriveTitleFromFileName("Q4_Roadmap_Draft.md")).toBe(
        "Q4_Roadmap_Draft"
      );
      expect(deriveTitleFromFileName("Sprint-Notes.v2.docx")).toBe(
        "Sprint-Notes.v2"
      );
      expect(deriveTitleFromFileName("README.txt")).toBe("README");
    });

    it("rejects unsupported file extensions (.exe, .pdf, .zip, etc.) with the exact required error", async () => {
      const pdfBuffer = Buffer.from("%PDF-1.4 sample data", "utf-8");
      await expect(
        parseUploadedFileToHtml("document.pdf", pdfBuffer)
      ).rejects.toThrow(ERROR_UNSUPPORTED_OR_TOO_LARGE);

      const exeBuffer = Buffer.from("MZ binary data", "utf-8");
      await expect(
        parseUploadedFileToHtml("malware.exe", exeBuffer)
      ).rejects.toThrow(ERROR_UNSUPPORTED_OR_TOO_LARGE);

      const zipBuffer = Buffer.from("PK zip archive", "utf-8");
      await expect(
        parseUploadedFileToHtml("archive.zip", zipBuffer)
      ).rejects.toThrow(ERROR_UNSUPPORTED_OR_TOO_LARGE);
    });

    it("rejects files exceeding the 5MB size threshold", async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1);

      await expect(
        parseUploadedFileToHtml("large-file.txt", oversizedBuffer)
      ).rejects.toThrow(ERROR_UNSUPPORTED_OR_TOO_LARGE);
    });
  });
});

