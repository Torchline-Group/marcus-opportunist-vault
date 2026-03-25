import { NextResponse } from "next/server";
import { seedIdeasFromVault } from "../../../lib/parseVault";

export async function GET() {
  const ideas = await seedIdeasFromVault();
  return NextResponse.json({ ideas });
}

