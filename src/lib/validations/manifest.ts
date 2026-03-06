import { z } from "zod";

const MindFileSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  uri: z.string(),
  mimeType: z.string(),
  localPath: z.string(),
  expires_at: z.string().optional(),
});

const MindDataSchema = z.object({
  files: z.array(MindFileSchema),
  last_updated: z.string().nullable(),
});

export const ManifestSchema = z.object({
  minds: z.record(z.string(), MindDataSchema),
});
