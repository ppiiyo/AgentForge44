import fs from "fs";
import path from "path";

export const FileReadSchema = {
  name: "file_read",
  description: "Read text contents of safe files inside the active workspace directory.",
  parameters: {
    type: "OBJECT",
    properties: {
      filePath: {
        type: "STRING",
        description: "The relative path from project root (e.g., 'src/types.ts', 'server.ts')."
      }
    },
    required: ["filePath"]
  }
};

export async function executeFileRead(filePath: string): Promise<string> {
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\))+/, '');
  const absolute = path.resolve(process.cwd(), normalized);

  if (!absolute.startsWith(process.cwd())) {
    return "Permission Denied: Directory traversal is prohibited outside project workspace.";
  }

  try {
    if (!fs.existsSync(absolute)) {
      return `File not found: ${filePath}`;
    }
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) {
      return `Target is not a standard readable file: ${filePath}`;
    }
    if (stat.size > 1024 * 1024) {
      return "Size Limit Exceeded: Safe reading is limited to maximum of 1MB text payloads.";
    }
    return fs.readFileSync(absolute, "utf-8");
  } catch (err: any) {
    return `Error: Failed to read from path: ${err.message}`;
  }
}
