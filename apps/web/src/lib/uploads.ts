import { promises as fs } from "node:fs";
import path from "node:path";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function saveUploadedFile(file: File) {
  const extension = path.extname(file.name) || ".bin";
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
