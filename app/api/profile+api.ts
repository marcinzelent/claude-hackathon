import { fail } from "../../src/server/claude";
import { profileFromClaude } from "../../src/server/profileFromClaude";

// POST multipart form with field "file" (a PDF) -> { goal, background, tip }.
// The PDF goes to Claude and is then dropped; only Claude's answer stays in server memory for an hour. Nothing is written to disk.

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request): Promise<Response> {
  // The server runs on Node, but this project's types are React Native's, whose FormData lacks get().
  type UploadedFile = { size: number; arrayBuffer(): Promise<ArrayBuffer> };
  let file: UploadedFile | null = null;
  try {
    const form = (await request.formData()) as unknown as { get(name: string): unknown };
    const entry = form.get("file") as Partial<UploadedFile> | null;
    if (entry && typeof entry.arrayBuffer === "function") file = entry as UploadedFile;
  } catch {
    // fall through to the error below
  }
  if (!file) return fail(400, "Upload a PDF of your CV or LinkedIn profile.");
  if (file.size > MAX_PDF_BYTES) return fail(413, "That file is over 10 MB. Try LinkedIn's 'Save to PDF' version.");

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0, 4).toString("latin1") !== "%PDF") {
    return fail(400, "Please upload a PDF (your CV, or LinkedIn's 'Save to PDF').");
  }

  return profileFromClaude(
    [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } },
      { type: "text", text: "Here is my CV. Fill in my goal and background." },
    ],
    "CV",
  );
}
