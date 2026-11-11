import { marked } from "marked";
import mammoth from "mammoth";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Megabytes
export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx"] as const;
export const ERROR_UNSUPPORTED_OR_TOO_LARGE =
  "Supported formats are .txt, .md, and .docx (max 5MB).";

/**
 * Extracts and normalizes the lowercase extension from a filename (including the dot).
 */
export function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Derives a human-readable document title from a filename by stripping the extension.
 */
export function deriveTitleFromFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const nameWithoutExt = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const cleaned = nameWithoutExt.trim();
  return cleaned || "Untitled Imported Document";
}

/**
 * Escapes unsafe HTML characters to prevent XSS during text parsing.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Converts raw plain text into semantic HTML paragraphs (<p> and <br />).
 */
export function parseTextToHtml(rawText: string): string {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalized) {
    return "<p></p>";
  }

  const paragraphs = normalized.split(/\n\n+/);
  return paragraphs
    .map((paragraph) => {
      const lines = paragraph.split("\n");
      const escapedLines = lines.map((line) => escapeHtml(line.trim()));
      return `<p>${escapedLines.join("<br />")}</p>`;
    })
    .join("");
}

/**
 * Converts Markdown content into semantic HTML via `marked`.
 */
export async function parseMarkdownToHtml(rawMarkdown: string): Promise<string> {
  const parsed = await marked.parse(rawMarkdown, {
    gfm: true,
    breaks: true,
  });
  return parsed.trim();
}

/**
 * Converts a Microsoft Word (.docx) buffer into semantic HTML via `mammoth`.
 */
export async function parseDocxToHtml(buffer: Buffer): Promise<string> {
  const result = await mammoth.convertToHtml({ buffer });
  return result.value.trim();
}

/**
 * Pure parsing orchestrator that validates extension and size,
 * extracts a clean title, and converts .txt, .md, or .docx to semantic HTML.
 */
export async function parseUploadedFileToHtml(
  fileName: string,
  buffer: Buffer
): Promise<{ title: string; htmlContent: string }> {
  const ext = getFileExtension(fileName);

  if (
    !ext ||
    !SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number]) ||
    buffer.length > MAX_FILE_SIZE_BYTES
  ) {
    throw new Error(ERROR_UNSUPPORTED_OR_TOO_LARGE);
  }

  const title = deriveTitleFromFileName(fileName);
  let htmlContent = "";

  if (ext === ".txt") {
    const rawText = buffer.toString("utf-8");
    htmlContent = parseTextToHtml(rawText);
  } else if (ext === ".md") {
    const rawMarkdown = buffer.toString("utf-8");
    htmlContent = await parseMarkdownToHtml(rawMarkdown);
  } else if (ext === ".docx") {
    htmlContent = await parseDocxToHtml(buffer);
  }

  return {
    title,
    htmlContent,
  };
}

