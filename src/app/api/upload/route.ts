import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, getDocumentAccess } from "@/lib/auth";
import {
  parseUploadedFileToHtml,
  getFileExtension,
  SUPPORTED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  ERROR_UNSUPPORTED_OR_TOO_LARGE,
} from "@/lib/file-parser";

/**
 * POST /api/upload
 * Handles file ingestion (.txt, .md, .docx up to 5MB).
 * Modes:
 * - "new" (default): Creates a brand new document from the parsed file.
 * - "append": Appends the parsed HTML into an existing document with a horizontal rule.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized: Could not resolve current user" },
        { status: 401 }
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Invalid form data. Expected multipart/form-data." },
        { status: 400 }
      );
    }

    const file = formData.get("file");
    const targetDocumentId = formData.get("targetDocumentId") as string | null;
    const mode = (formData.get("mode") as string | null)?.toLowerCase() || "new";

    // 1. Verify file presence
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: "No file provided",
          details: ERROR_UNSUPPORTED_OR_TOO_LARGE,
        },
        { status: 400 }
      );
    }

    // 2. Validate file extension
    const ext = getFileExtension(file.name);
    if (
      !ext ||
      !SUPPORTED_EXTENSIONS.includes(ext as (typeof SUPPORTED_EXTENSIONS)[number])
    ) {
      return NextResponse.json(
        { error: ERROR_UNSUPPORTED_OR_TOO_LARGE },
        { status: 400 }
      );
    }

    // 3. Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: ERROR_UNSUPPORTED_OR_TOO_LARGE },
        { status: 400 }
      );
    }

    // 4. Read buffer and parse content into semantic HTML
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedResult: { title: string; htmlContent: string };
    try {
      parsedResult = await parseUploadedFileToHtml(file.name, buffer);
    } catch (parseError) {
      return NextResponse.json(
        {
          error:
            parseError instanceof Error
              ? parseError.message
              : ERROR_UNSUPPORTED_OR_TOO_LARGE,
        },
        { status: 400 }
      );
    }

    const { title, htmlContent } = parsedResult;

    // 5. Handle "append" mode
    if (mode === "append" && targetDocumentId) {
      const existingDoc = await prisma.document.findUnique({
        where: { id: targetDocumentId },
      });

      if (!existingDoc) {
        return NextResponse.json(
          { error: "Target document not found" },
          { status: 404 }
        );
      }

      const access = await getDocumentAccess(targetDocumentId, user.id);
      if (access !== "OWNER" && access !== "EDIT") {
        return NextResponse.json(
          {
            error:
              "Forbidden: You do not have permission to append to this document",
          },
          { status: 403 }
        );
      }

      // Append content with a horizontal rule separator
      const existingContent = existingDoc.content ? existingDoc.content.trim() : "";
      const separator = existingContent ? "<hr />" : "";
      const updatedContent = `${existingContent}${separator}${htmlContent}`;

      const updatedDoc = await prisma.document.update({
        where: { id: targetDocumentId },
        data: {
          content: updatedContent,
          versions: {
            create: [
              {
                title: `${existingDoc.title} (Appended from ${file.name})`,
                content: updatedContent,
                savedById: user.id,
              },
            ],
          },
        },
        include: {
          owner: {
            select: { id: true, email: true, name: true, avatarColor: true },
          },
          shares: {
            include: {
              user: {
                select: { id: true, email: true, name: true, avatarColor: true },
              },
            },
          },
          versions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });

      return NextResponse.json(
        {
          ...updatedDoc,
          effectiveRole: access,
        },
        { status: 200 }
      );
    }

    // 6. Handle "new" mode (default)
    const newDocument = await prisma.document.create({
      data: {
        title,
        content: htmlContent,
        sourceFileName: file.name,
        ownerId: user.id,
        versions: {
          create: [
            {
              title: `${title} (Imported from ${file.name})`,
              content: htmlContent,
              savedById: user.id,
            },
          ],
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, avatarColor: true },
        },
        shares: {
          include: {
            user: {
              select: { id: true, email: true, name: true, avatarColor: true },
            },
          },
        },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    return NextResponse.json(
      {
        ...newDocument,
        effectiveRole: "OWNER",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to process uploaded file",
        details: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

