import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { seedIdeasFromVault } from "../../../../lib/parseVault";

export async function POST() {
  const sb = createSupabaseAdmin();

  const tenantRes = await sb.schema("opportunist").from("tenants").select("id").eq("name", "default").single();
  if (tenantRes.error) {
    return NextResponse.json({ error: tenantRes.error.message }, { status: 500 });
  }

  const tenantId = tenantRes.data.id as string;

  const ideas = await seedIdeasFromVault();
  if (!ideas.length) {
    return NextResponse.json({ inserted: 0 });
  }

  // For single-user flow: wipe + re-seed.
  const wipe = await sb.schema("opportunist").from("ideas").delete().eq("tenant_id", tenantId);
  if (wipe.error) return NextResponse.json({ error: wipe.error.message }, { status: 500 });

  await Promise.all([
    sb.schema("opportunist").from("idea_tasks").delete().eq("tenant_id", tenantId),
    sb.schema("opportunist").from("idea_sources").delete().eq("tenant_id", tenantId)
  ]);

  const inserted = await sb.schema("opportunist").from("ideas").insert(
    ideas.map((i) => ({
      tenant_id: tenantId,
      id: i.id,
      title: i.title,
      roi: i.roi,
      readme: i.readme,
      codebase_url: i.codebaseUrl ?? null,
      created_at: i.createdAt,
      updated_at: i.createdAt
    }))
  );

  if (inserted.error) {
    return NextResponse.json({ error: inserted.error.message }, { status: 500 });
  }

  // Insert sources if present
  const sourcesInserts = ideas.flatMap((i) =>
    (i.sources ?? []).map((s) => ({
      tenant_id: tenantId,
      idea_id: i.id,
      source_url: s,
      source_label: null as any
    }))
  );

  if (sourcesInserts.length) {
    const srcRes = await sb.schema("opportunist").from("idea_sources").insert(sourcesInserts);
    if (srcRes.error) return NextResponse.json({ error: srcRes.error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: ideas.length });
}

