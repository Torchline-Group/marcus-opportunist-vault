import { NextResponse } from "next/server";
import Firecrawl from "firecrawl";
import fs from "fs/promises";
import path from "path";

type ScrapeRequestBody = {
  url: string;
  prompt?: string;
  writeVault?: boolean;
};

function defaultExtractionPrompt() {
  return [
    "You are extracting e-commerce product/catalog information from a luxury retail brand.",
    "Get MORE data, not less: include every product category/collection, products you can identify, detailed attributes, and any available theme/branding elements.",
    "Focus on: products (names/SKUs if present), product links, price ranges, materials, styles, colorways, sizes, shipping/returns if available, and brand theme/positioning.",
    "Also extract: site navigation categories (if visible), hero/branding colors, any design system cues (fonts/styles described), and all relevant page sections.",
    "Return a structured JSON object with keys: { brand: { name }, theme: { tone, designCues }, colors: [ ... ], products: [ { name, url, price, currency, description, attributes: { ... } } ], collections: [ { name, url } ], shippingAndReturns: { summary }, categories: [ ... ] }.",
    "If you cannot find a field, return it as null (do not omit keys)."
  ].join("\n");
}

function hostnameFromUrl(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

async function appendToVaultMarkdown(vaultPath: string, markdown: string) {
  let existing = "";
  try {
    existing = await fs.readFile(vaultPath, "utf8");
  } catch {
    // File might not exist yet.
  }

  const needsLeadingNewline = existing.length > 0 && !existing.endsWith("\n");
  const next = `${existing}${needsLeadingNewline ? "\n" : ""}${markdown}`;
  await fs.writeFile(vaultPath, next, "utf8");
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ScrapeRequestBody | null;
  const url = body?.url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Missing required field: url" }, { status: 400 });
  }

  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing FIRECRAWL_API_KEY in env" }, { status: 500 });
  }

  const extractionPrompt = body?.prompt && body.prompt.trim() ? body.prompt : defaultExtractionPrompt();
  const shouldWriteVault = body?.writeVault ?? (process.env.WRITE_VAULT === "true");

  const client = new Firecrawl({ apiKey });

  const scrapeResult = await client.scrape(url, {
    onlyMainContent: true,
    blockAds: true,
    removeBase64Images: true,
    formats: [
      "summary",
      "markdown",
      "links",
      "images",
      {
        type: "json",
        prompt: extractionPrompt
      }
    ],
    timeout: 60_000
  });

  const extractedJson = scrapeResult.json ?? null;
  const markdownSnippet = typeof scrapeResult.markdown === "string" ? scrapeResult.markdown.slice(0, 6000) : null;

  let vaultUpdated = false;
  if (shouldWriteVault) {
    const vaultPath = path.join(process.cwd(), "vault.md");
    const hostname = hostnameFromUrl(url);
    const today = new Date().toISOString().slice(0, 10);

    // Find next numeric section index like: "## 1. ..."
    let nextIndex = 1;
    try {
      const existing = await fs.readFile(vaultPath, "utf8");
      const matches = existing.match(/^##\s+(\d+)\./gm);
      nextIndex = matches ? matches.length + 1 : 1;
    } catch {
      nextIndex = 1;
    }

    const jsonPreview =
      extractedJson && typeof extractedJson === "object"
        ? JSON.stringify(extractedJson, null, 2).slice(0, 6000)
        : extractedJson
          ? String(extractedJson).slice(0, 6000)
          : null;

    const entry = [
      `\n## ${nextIndex}. ${hostname} (ROI: pending)`,
      `- Scraped: ${today}`,
      `- Status: Ready → @agent build #1`,
      extractedJson ? `- Extracted JSON: ${jsonPreview}` : `- Extracted JSON: null`,
      markdownSnippet ? `- Markdown snippet: ${markdownSnippet}` : `- Markdown snippet: null`
    ].join("\n");

    await appendToVaultMarkdown(vaultPath, entry + "\n");
    vaultUpdated = true;
  }

  return NextResponse.json(
    {
      url,
      extracted: extractedJson,
      summary: scrapeResult.summary ?? null,
      linksCount: Array.isArray(scrapeResult.links) ? scrapeResult.links.length : null,
      vaultUpdated
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    usage: {
      method: "POST",
      endpoint: "/api/scrape",
      bodyExample: {
        url: "https://memoparis.com",
        prompt: "Extract more data (products, colors, theme, categories, pricing, shipping/returns, etc.)",
        writeVault: false
      }
    }
  });
}

