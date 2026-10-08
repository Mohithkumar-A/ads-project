// ─────────────────────────────────────────────────────────────
// Temporary file manager
// Handles writing uploaded / pasted log data to temp files
// and cleaning them up after processing.
// ─────────────────────────────────────────────────────────────

import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

/** Root directory for ephemeral log files */
const TEMP_DIR = path.resolve(__dirname, "../../temp");

/**
 * Ensures the temp directory exists.
 * Called once at server startup.
 */
export async function ensureTempDir(): Promise<void> {
  await fs.mkdir(TEMP_DIR, { recursive: true });
}

/**
 * Writes raw log text to a unique temp file and returns the absolute path.
 *
 * @param logText - The raw log content (pasted or read from upload)
 * @returns Absolute path to the created temp file
 */
export async function saveTempFile(logText: string): Promise<string> {
  const filename = `investigation_${uuidv4()}.log`;
  const filepath = path.join(TEMP_DIR, filename);
  await fs.writeFile(filepath, logText, "utf-8");
  return filepath;
}

/**
 * Reads an uploaded file from disk (multer already saved it)
 * and returns its text content.
 *
 * @param uploadPath - Path where multer stored the file
 * @returns The raw text content of the uploaded file
 */
export async function readUploadedFile(uploadPath: string): Promise<string> {
  return fs.readFile(uploadPath, "utf-8");
}

/**
 * Securely deletes a temp file after processing.
 * Silently ignores if the file was already removed.
 *
 * @param filepath - Absolute path to the file to delete
 */
export async function cleanupTempFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch {
    // File already deleted or never created — safe to ignore
  }
}

/**
 * Cleans up a multer-uploaded file (separate from the temp file).
 * Called in the finally block of the route handler.
 *
 * @param uploadPath - Path where multer stored the uploaded file
 */
export async function cleanupUpload(uploadPath: string | undefined): Promise<void> {
  if (!uploadPath) return;
  try {
    await fs.unlink(uploadPath);
  } catch {
    // Already cleaned — safe to ignore
  }
}
