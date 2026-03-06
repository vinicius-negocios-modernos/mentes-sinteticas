import { describe, it, expect } from "vitest";
import { ManifestSchema } from "@/lib/validations/manifest";

describe("ManifestSchema", () => {
  const validManifest = {
    minds: {
      "test-mind": {
        files: [
          {
            name: "file1.pdf",
            displayName: "File One",
            uri: "gs://bucket/file1.pdf",
            mimeType: "application/pdf",
            localPath: "/path/to/file1.pdf",
          },
        ],
        last_updated: "2025-01-01T00:00:00Z",
      },
    },
  };

  it("accepts valid manifest with mind and files", () => {
    const result = ManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it("accepts manifest with null last_updated", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              name: "file1.pdf",
              displayName: "File One",
              uri: "gs://bucket/file1.pdf",
              mimeType: "application/pdf",
              localPath: "/path/to/file1.pdf",
            },
          ],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it("accepts manifest with optional expires_at", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              name: "file1.pdf",
              displayName: "File One",
              uri: "gs://bucket/file1.pdf",
              mimeType: "application/pdf",
              localPath: "/path/to/file1.pdf",
              expires_at: "2025-12-31T23:59:59Z",
            },
          ],
          last_updated: "2025-01-01T00:00:00Z",
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.minds["test-mind"].files[0].expires_at).toBe(
        "2025-12-31T23:59:59Z"
      );
    }
  });

  it("rejects manifest without minds field", () => {
    const result = ManifestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects file without name", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              displayName: "File One",
              uri: "gs://bucket/file1.pdf",
              mimeType: "application/pdf",
              localPath: "/path/to/file1.pdf",
            },
          ],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("rejects file without uri", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              name: "file1.pdf",
              displayName: "File One",
              mimeType: "application/pdf",
              localPath: "/path/to/file1.pdf",
            },
          ],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("rejects file without mimeType", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              name: "file1.pdf",
              displayName: "File One",
              uri: "gs://bucket/file1.pdf",
              localPath: "/path/to/file1.pdf",
            },
          ],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("rejects file without localPath", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [
            {
              name: "file1.pdf",
              displayName: "File One",
              uri: "gs://bucket/file1.pdf",
              mimeType: "application/pdf",
            },
          ],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(false);
  });

  it("accepts manifest with empty files array", () => {
    const manifest = {
      minds: {
        "test-mind": {
          files: [],
          last_updated: null,
        },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it("accepts manifest with multiple minds", () => {
    const manifest = {
      minds: {
        "mind-a": { files: [], last_updated: null },
        "mind-b": { files: [], last_updated: "2025-06-01" },
      },
    };
    const result = ManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });
});
