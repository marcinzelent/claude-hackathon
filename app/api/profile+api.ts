import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CV_IMPORT_SYSTEM_PROMPT } from "../../prompts/cvImport";

// POST multipart form with field "file" (a PDF) -> { goal, background, tip }.
// The PDF goes to Claude and is then dropped; nothing is written to disk.

const MAX_PDF_BYTES = 10 * 1024 * 1024;

const ProfileSchema = z.object({
  goal: z.string(),
  background: z.string(),
  tip: z.string().nullable(),
});

let client: Anthropic | null = null;

const fail = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) return fail(500, "Add ANTHROPIC_API_KEY to .env and restart the server.");
  client ??= new Anthropic();

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

  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: zodOutputFormat(ProfileSchema) },
      system: CV_IMPORT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: bytes.toString("base64") } },
            { type: "text", text: "Here is my CV. Fill in my goal and background." },
          ],
        },
      ],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return fail(502, "Couldn't read that CV. Type your goal and background instead.");
    }
    return Response.json(response.parsed_output);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return fail(500, "The server's ANTHROPIC_API_KEY is invalid.");
    if (error instanceof Anthropic.RateLimitError) return fail(429, "Claude is busy right now. Try again in a minute.");
    if (error instanceof Anthropic.BadRequestError) return fail(400, "Claude couldn't read that PDF. Try another file.");
    console.error("profile import failed", error);
    return fail(500, "Import failed. Try again.");
  }
}
