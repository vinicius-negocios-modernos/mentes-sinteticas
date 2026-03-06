/**
 * Supabase Edge Function: refresh-file-uris
 *
 * Refreshes Gemini File URIs that are expiring within 6 hours.
 * Designed to run on a cron schedule (every 12 hours) or triggered manually.
 *
 * Required secrets:
 *   - GEMINI_API_KEY
 *   - SUPABASE_URL (auto-injected)
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *
 * Cron setup (via Supabase Dashboard > Database > pg_cron):
 *   SELECT cron.schedule(
 *     'refresh-file-uris',
 *     '0 */12 * * *',
 *     $$ SELECT net.http_post(
 *       url := '<SUPABASE_URL>/functions/v1/refresh-file-uris',
 *       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *     ); $$
 *   );
 */

// @ts-nocheck — Deno runtime, not checked by Next.js build
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const EXPIRY_BUFFER_HOURS = 6;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RefreshResult {
  documents_checked: number;
  documents_refreshed: number;
  documents_failed: number;
  failures: { document_name: string; error: string }[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const result: RefreshResult = {
    documents_checked: 0,
    documents_refreshed: 0,
    documents_failed: 0,
    failures: [],
  };

  try {
    // Query expiring entries (expires_at < NOW() + 6 hours OR NULL)
    const { data: expiringEntries, error: queryError } = await supabase
      .from("file_uri_cache")
      .select(
        `
        id,
        file_uri,
        mime_type,
        expires_at,
        knowledge_document_id,
        knowledge_documents!inner (
          id,
          display_name,
          local_path
        )
      `
      )
      .or(
        `expires_at.lt.${new Date(Date.now() + EXPIRY_BUFFER_HOURS * 60 * 60 * 1000).toISOString()},expires_at.is.null`
      );

    if (queryError) {
      throw new Error(`DB query failed: ${queryError.message}`);
    }

    result.documents_checked = expiringEntries?.length ?? 0;

    for (const entry of expiringEntries ?? []) {
      const doc = entry.knowledge_documents as {
        id: string;
        display_name: string;
        local_path: string | null;
      };
      const docName = doc.display_name;

      try {
        if (!doc.local_path) {
          throw new Error(`No local_path for "${docName}"`);
        }

        // Note: In Edge Function context, the knowledge_base files need to be
        // accessible. For Supabase-deployed functions, files should be stored
        // in Supabase Storage and downloaded before upload to Gemini.
        // This is a placeholder — in production, adapt to read from Storage.

        // For now, use Gemini Files API to upload from a URL or local storage
        // This implementation assumes files are accessible via Supabase Storage
        const storagePath = `knowledge_base/${doc.local_path}`;
        const { data: fileData, error: storageError } = await supabase.storage
          .from("knowledge-files")
          .download(storagePath);

        if (storageError || !fileData) {
          throw new Error(
            `Failed to download from storage: ${storageError?.message ?? "no data"}`
          );
        }

        // Upload to Gemini Files API via REST
        const mimeType = entry.mime_type || "text/plain";

        // Step 1: Initiate resumable upload
        const initResponse = await fetch(
          `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": mimeType,
              "X-Goog-Upload-Protocol": "raw",
              "X-Goog-Upload-Command": "upload, finalize",
            },
            body: fileData,
          }
        );

        if (!initResponse.ok) {
          const errText = await initResponse.text();
          throw new Error(`Gemini upload failed: ${errText}`);
        }

        const uploadResult = await initResponse.json();
        const newUri = uploadResult.file?.uri;
        const newExpiry = uploadResult.file?.expirationTime;

        if (!newUri) {
          throw new Error("Gemini returned no URI after upload");
        }

        // Update cache entry
        const { error: updateError } = await supabase
          .from("file_uri_cache")
          .update({
            file_uri: newUri,
            expires_at: newExpiry ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", entry.id);

        if (updateError) {
          throw new Error(`DB update failed: ${updateError.message}`);
        }

        result.documents_refreshed++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        result.documents_failed++;
        result.failures.push({ document_name: docName, error: errMsg });
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errMsg, result }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
