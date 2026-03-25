import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { Idea, TaskItem } from "./dashboardTypes";

function stripBracketsIdeaTitle(title: string) {
  // vault uses: "## 2. [Add your next idea]"
  return title.replace(/^\[|\]$/g, "").trim();
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function seedIdeasFromVault(): Promise<Idea[]> {
  const vaultPath = path.join(process.cwd(), "vault.md");
  let raw = "";
  try {
    raw = await fs.readFile(vaultPath, "utf8");
  } catch {
    return [];
  }

  const sections = raw.split(/^##\s+/m).slice(1);
  const ideas: Idea[] = [];

  for (const sec of sections) {
    // Each section starts with: "{n}. {title} (ROI: ...)\n- ..."
    const headerLine = sec.split("\n")[0] ?? "";
    if (!headerLine.trim()) continue;

    // Stop if it looks like placeholder
    const titleMatch = headerLine.match(/^\d+\.\s+(.*?)\s*\(ROI:/);
    const roiMatch = headerLine.match(/\(ROI:\s*(.*?)\)\s*$/);
    const plainTitleMatch = headerLine.match(/^\d+\.\s+(.*)$/);

    if (!plainTitleMatch) continue;

    const rawTitle = titleMatch ? titleMatch[1].trim() : plainTitleMatch[1].trim();
    const title = rawTitle.startsWith("[") ? stripBracketsIdeaTitle(rawTitle) : rawTitle;

    if (title.toLowerCase().includes("add your next idea")) continue;

    const roi = roiMatch ? roiMatch[1].trim() : "pending";
    const sectionBody = sec.replace(/^.*\n/, "").trim(); // remove header line

    const lines = sectionBody.split("\n").map((l) => l.trim());
    const sources = lines
      .map((l) => {
        const m = l.match(/https?:\/\/[^\s)]+/);
        return m ? m[0] : null;
      })
      .filter(Boolean) as string[];

    const readme = sectionBody
      .split("\n")
      .map((l) => (l.startsWith("- ") ? l.slice(2) : l))
      .join("\n");

    const idea: Idea = {
      // Supabase `ideas.id` is a UUID primary key.
      id: randomUUID(),
      title,
      roi,
      readme: `# ${title}\n\n${readme}`.trim(),
      sources,
      codebaseUrl: undefined,
      tasks: [] as TaskItem[],
      createdAt: new Date().toISOString()
    };

    ideas.push(idea);
  }

  return ideas;
}

