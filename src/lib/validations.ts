import { z } from "zod";

/**
 * Validation schema for creating a new document
 */
export const createDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .max(150, "Title must not exceed 150 characters")
    .optional()
    .transform((val) =>
      val && val.trim().length > 0 ? val.trim() : "Untitled Document"
    ),
  content: z.string().optional().default(""),
  sourceFileName: z.string().trim().nullable().optional(),
});

/**
 * Validation schema for updating an existing document
 */
export const updateDocumentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title must be at least 1 character long")
    .max(150, "Title must not exceed 150 characters")
    .optional(),
  content: z.string().optional(),
  createVersionSnapshot: z.boolean().optional().default(false),
});

/**
 * Validation schema for sharing a document with a team member
 */
export const shareDocumentSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  permission: z.enum(["VIEW", "EDIT"], {
    message: "Permission must be either 'VIEW' or 'EDIT'",
  }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;
