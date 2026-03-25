import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import type { DashboardState } from "../../../../lib/dashboardTypes";

export async function GET() {
  const sb = createSupabaseAdmin();

  const tenantRes = await sb.from("tenants").select("id").eq("name", "default").single();
  if (tenantRes.error) {
    return NextResponse.json({ error: tenantRes.error.message }, { status: 500 });
  }

  const tenantId = tenantRes.data.id as string;

  const [storesRes, productsRes, ideasRes, techRes] = await Promise.all([
    sb.from("stores").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    sb.from("products").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    sb.from("ideas").select("id,title,roi,readme,codebase_url,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }),
    sb.from("tech_projects").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false })
  ]);

  if (storesRes.error || productsRes.error || ideasRes.error || techRes.error) {
    return NextResponse.json(
      { error: [storesRes.error, productsRes.error, ideasRes.error, techRes.error].filter(Boolean).map((e) => (e as any).message) },
      { status: 500 }
    );
  }

  // Load tasks + sources for each idea
  const ideaIds = (ideasRes.data ?? []).map((i) => i.id);
  const [tasksRes, sourcesRes] = await Promise.all([
    sb.from("idea_tasks").select("*").eq("tenant_id", tenantId).in("idea_id", ideaIds),
    sb.from("idea_sources").select("*").eq("tenant_id", tenantId).in("idea_id", ideaIds)
  ]);

  const tasksByIdea = new Map<string, any[]>();
  (tasksRes.data ?? []).forEach((t) => {
    const list = tasksByIdea.get(t.idea_id) ?? [];
    list.push({ id: t.id, text: t.text, done: t.done });
    tasksByIdea.set(t.idea_id, list);
  });

  const sourcesByIdea = new Map<string, string[]>();
  (sourcesRes.data ?? []).forEach((s) => {
    const list = sourcesByIdea.get(s.idea_id) ?? [];
    list.push(s.source_url);
    sourcesByIdea.set(s.idea_id, list);
  });

  const ideas = (ideasRes.data ?? []).map((i) => {
    const tasks = tasksByIdea.get(i.id) ?? [];
    const sources = sourcesByIdea.get(i.id) ?? [];
    return {
      id: i.id,
      title: i.title,
      roi: i.roi,
      readme: i.readme ?? "",
      sources,
      codebaseUrl: i.codebase_url ?? undefined,
      tasks,
      createdAt: i.created_at
    };
  });

  const state: DashboardState = {
    version: 1,
    ideas,
    stores: (storesRes.data ?? []) as any,
    products: (productsRes.data ?? []) as any,
    techProjects: (techRes.data ?? []) as any,
    ui: { mainTab: "dashboard" }
  };

  return NextResponse.json({ state });
}

