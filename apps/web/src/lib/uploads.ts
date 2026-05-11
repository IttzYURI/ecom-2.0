import { promises as fs } from "node:fs";
import path from "node:path";

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml"
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function saveUploadedFile(file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new Error(
      `File type "${extension}" is not allowed. Accepted types: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the 5MB limit.`);
  }

  const mimeChecks = [file.type].filter(Boolean);

  if (mimeChecks.length && !ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error(`MIME type "${file.type}" is not allowed.`);
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizeFileName(
    path.basename(file.name, extension)
  )}${extension}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, bytes);

  return {
    url: `/uploads/${fileName}`,
    fileName
  };
}
