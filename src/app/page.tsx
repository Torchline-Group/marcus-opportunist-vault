"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DashboardState,
  Idea,
  MainTab,
  Product,
  Store,
  StoreStatus,
  TaskItem,
  TechCompletion,
  TechProject
} from "../lib/dashboardTypes";
import { getDefaultState, loadDashboardState, saveDashboardState } from "../lib/dashboardStorage";
import { uid } from "../lib/uids";

type IdeaModalTab = "tasks" | "sources" | "codebase";

const MAIN_TABS: Array<{ id: MainTab; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "ideas", label: "Ideas & Projects" },
  { id: "products", label: "Products" },
  { id: "tech", label: "Tech / SaaS" }
];

const TECH_GROUPS: Array<{ key: TechCompletion; label: string }> = [
  { key: "brainstorming", label: "Brainstorming" },
  { key: "idea_validated", label: "Idea validated" },
  { key: "in_progress", label: "In progress" },
  { key: "finishing_touches", label: "Finishing touches" },
  { key: "complete", label: "Complete" },
  { key: "on_hold", label: "On hold" }
];

const STORE_STATUSES: Array<{ key: StoreStatus; label: string }> = [
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "deactivated", label: "Deactivated" }
];

function safeNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Failed to read file"));
    r.onload = () => resolve(String(r.result ?? ""));
    r.readAsDataURL(file);
  });
}

function countOpenTasks(ideas: Idea[]) {
  return ideas.reduce((acc, i) => acc + i.tasks.filter((t) => !t.done).length, 0);
}

function findById<T extends { id: string }>(arr: T[], id?: string) {
  if (!id) return undefined;
  return arr.find((x) => x.id === id);
}

export default function Page() {
  const [state, setState] = useState<DashboardState>(() => {
    const saved = loadDashboardState();
    return saved ?? getDefaultState();
  });

  const [seedLoaded, setSeedLoaded] = useState(false);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [ideaModalTab, setIdeaModalTab] = useState<IdeaModalTab>("tasks");
  const [busy, setBusy] = useState<string | null>(null);

  // Idea modal edit mode
  const selectedIdea = useMemo(() => findById(state.ideas, state.ui.selectedIdeaId), [state.ideas, state.ui.selectedIdeaId]);
  const selectedStore = useMemo(() => findById(state.stores, state.ui.selectedStoreId), [state.stores, state.ui.selectedStoreId]);

  // Seed from vault.md once (if no ideas yet)
  useEffect(() => {
    if (seedLoaded) return;
    if (state.ideas.length > 0) {
      setSeedLoaded(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/seed");
        if (!res.ok) return;
        const data = (await res.json()) as { ideas?: Idea[] };
        if (!data.ideas?.length) return;
        setState((s) => ({
          ...s,
          ideas: data.ideas ?? s.ideas
        }));
      } finally {
        setSeedLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedLoaded]);

  // Persist
  useEffect(() => {
    saveDashboardState(state);
  }, [state]);

  const mainTab = state.ui.mainTab;

  const analytics = useMemo(() => {
    const activeStores = state.stores.filter((s) => s.status === "active").length;
    const products = state.products.length;
    const ideas = state.ideas.length;
    const openTasks = countOpenTasks(state.ideas);
    return { activeStores, products, ideas, openTasks };
  }, [state.stores, state.products, state.ideas]);

  function setMainTab(tab: MainTab) {
    setState((s) => ({ ...s, ui: { ...s.ui, mainTab: tab } }));
  }

  function setSelectedIdea(id?: string) {
    setState((s) => ({ ...s, ui: { ...s.ui, selectedIdeaId: id } }));
  }

  function setSelectedStore(id?: string) {
    setState((s) => ({ ...s, ui: { ...s.ui, selectedStoreId: id } }));
  }

  function upsertIdea(patch: Partial<Idea> & { id: string }) {
    setState((s) => ({
      ...s,
      ideas: s.ideas.map((i) => (i.id === patch.id ? { ...i, ...patch } : i))
    }));
  }

  function deleteIdea(id: string) {
    setState((s) => ({
      ...s,
      ideas: s.ideas.filter((i) => i.id !== id),
      ui: { ...s.ui, selectedIdeaId: s.ui.selectedIdeaId === id ? undefined : s.ui.selectedIdeaId }
    }));
  }

  function upsertStore(patch: Partial<Store> & { id: string }) {
    setState((s) => ({
      ...s,
      stores: s.stores.map((st) => (st.id === patch.id ? { ...st, ...patch } : st))
    }));
  }

  function deleteStore(id: string) {
    setState((s) => ({
      ...s,
      stores: s.stores.filter((st) => st.id !== id),
      products: s.products.map((p) => (p.storeId === id ? { ...p, storeId: undefined } : p)),
      ui: { ...s.ui, selectedStoreId: s.ui.selectedStoreId === id ? undefined : s.ui.selectedStoreId }
    }));
  }

  function upsertProduct(patch: Partial<Product> & { id: string }) {
    setState((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === patch.id ? { ...p, ...patch } : p))
    }));
  }

  function deleteProduct(id: string) {
    setState((s) => ({
      ...s,
      products: s.products.filter((p) => p.id !== id)
    }));
  }

  function upsertTechProject(patch: Partial<TechProject> & { id: string }) {
    setState((s) => ({
      ...s,
      techProjects: s.techProjects.map((t) => (t.id === patch.id ? { ...t, ...patch } : t))
    }));
  }

  function deleteTechProject(id: string) {
    setState((s) => ({
      ...s,
      techProjects: s.techProjects.filter((t) => t.id !== id)
    }));
  }

  // Add forms state (kept local)
  const [newStore, setNewStore] = useState<{ name: string; storefrontUrl?: string; status: StoreStatus }>({
    name: "",
    storefrontUrl: "",
    status: "active"
  });

  const [newIdea, setNewIdea] = useState<{ title: string; roi: string; readme: string }>({ title: "", roi: "pending", readme: "" });
  const [newTaskText, setNewTaskText] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newCodebaseUrl, setNewCodebaseUrl] = useState("");

  const [productForm, setProductForm] = useState<{
    name: string;
    storeId?: string;
    photoDataUrl?: string;
    currency?: string;
    retailPrice?: number;
    cogs?: number;
    shippingEst?: number;
    landedCost?: number;
    scrapedDetails?: Record<string, unknown>;
    sourceUrl?: string;
  }>({
    name: "",
    storeId: undefined,
    photoDataUrl: undefined,
    currency: "USD",
    retailPrice: undefined,
    cogs: undefined,
    shippingEst: undefined,
    landedCost: undefined,
    scrapedDetails: undefined,
    sourceUrl: undefined
  });

  const [scrapeImport, setScrapeImport] = useState<{ url: string; prompt: string }>({ url: "https://memoparis.com", prompt: "" });

  const [techForm, setTechForm] = useState<{ name: string; status: TechCompletion; linkedFrom?: Exclude<TechCompletion, "on_hold">; notes?: string }>({
    name: "",
    status: "brainstorming",
    linkedFrom: undefined,
    notes: ""
  });

  const productsFiltered = useMemo(() => {
    if (mainTab !== "products") return [];
    if (!state.ui.selectedStoreId) return state.products;
    return state.products.filter((p) => p.storeId === state.ui.selectedStoreId);
  }, [mainTab, state.products, state.ui.selectedStoreId]);

  async function handleImportScrape() {
    const url = scrapeImport.url.trim();
    if (!url) return;
    setBusy("Scraping via Firecrawl…");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          prompt: scrapeImport.prompt?.trim() ? scrapeImport.prompt : undefined,
          writeVault: false
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const extracted = data?.extracted as any;
      const items = extracted?.products as any[] | undefined;
      if (!items?.length) {
        alert("Scrape returned no products. Try adjusting the prompt / URL.");
        return;
      }

      const storeId = state.ui.selectedStoreId;
      const now = new Date().toISOString();

      const imported: Product[] = items
        .filter(Boolean)
        .map((it) => {
          const pricing = it?.pricing ?? {};
          const retailPrice = safeNumber(pricing?.price);
          const currency = typeof pricing?.currency === "string" ? pricing.currency : undefined;

          return {
            id: uid("prod"),
            name: String(it?.name ?? "Untitled product"),
            storeId,
            currency,
            retailPrice,
            cogs: undefined,
            shippingEst: undefined,
            landedCost: undefined,
            photoDataUrl: undefined,
            scrapedDetails: it,
            sourceUrl: url,
            createdAt: now
          };
        });

      setState((s) => ({
        ...s,
        products: [...imported, ...s.products]
      }));

      setMainTab("products");
      setBusy(null);
    } catch (e: any) {
      setBusy(null);
      alert(`Scrape import failed: ${String(e?.message ?? e)}`);
    }
  }

  function addStore() {
    const name = newStore.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    const store: Store = {
      id: uid("store"),
      name,
      storefrontUrl: newStore.storefrontUrl?.trim() || undefined,
      status: newStore.status,
      notes: "",
      adSpend: undefined,
      profit: undefined,
      createdAt: now
    };
    setState((s) => ({ ...s, stores: [store, ...s.stores] }));
    setSelectedStore(store.id);
    setNewStore({ name: "", storefrontUrl: "", status: "active" });
  }

  function addIdea() {
    const title = newIdea.title.trim();
    if (!title) return;
    const now = new Date().toISOString();
    const idea: Idea = {
      id: uid("idea"),
      title,
      roi: newIdea.roi.trim() || "pending",
      readme: newIdea.readme.trim() || "",
      sources: [],
      codebaseUrl: undefined,
      tasks: [],
      createdAt: now
    };

    setState((s) => ({ ...s, ideas: [idea, ...s.ideas] }));
    setNewIdea({ title: "", roi: "pending", readme: "" });
  }

  function openIdeaModal(ideaId: string) {
    setSelectedIdea(ideaId);
    setIdeaModalTab("tasks");
    setIdeaModalOpen(true);
    setNewTaskText("");
    setNewSource("");
    setNewCodebaseUrl("");
  }

  function addTaskToSelectedIdea() {
    if (!selectedIdea) return;
    const text = newTaskText.trim();
    if (!text) return;
    const task: TaskItem = { id: uid("task"), text, done: false };
    upsertIdea({ id: selectedIdea.id, tasks: [task, ...selectedIdea.tasks] });
    setNewTaskText("");
  }

  function toggleTask(taskId: string, done: boolean) {
    if (!selectedIdea) return;
    upsertIdea({
      id: selectedIdea.id,
      tasks: selectedIdea.tasks.map((t) => (t.id === taskId ? { ...t, done } : t))
    });
  }

  function deleteTask(taskId: string) {
    if (!selectedIdea) return;
    upsertIdea({ id: selectedIdea.id, tasks: selectedIdea.tasks.filter((t) => t.id !== taskId) });
  }

  function addSourceToSelectedIdea() {
    if (!selectedIdea) return;
    const s = newSource.trim();
    if (!s) return;
    const next = Array.from(new Set([...selectedIdea.sources, s]));
    upsertIdea({ id: selectedIdea.id, sources: next });
    setNewSource("");
  }

  function setCodebaseForSelectedIdea() {
    if (!selectedIdea) return;
    const u = (newCodebaseUrl.trim() || selectedIdea.codebaseUrl || "").trim();
    upsertIdea({ id: selectedIdea.id, codebaseUrl: u || undefined });
  }

  function addProductFromForm() {
    const name = productForm.name.trim();
    if (!name) return;
    const now = new Date().toISOString();

    const landed = productForm.landedCost ?? (productForm.cogs != null || productForm.shippingEst != null
      ? (productForm.cogs ?? 0) + (productForm.shippingEst ?? 0)
      : undefined);

    const p: Product = {
      id: uid("prod"),
      name,
      storeId: productForm.storeId || undefined,
      photoDataUrl: productForm.photoDataUrl,
      currency: productForm.currency?.trim() || undefined,
      retailPrice: productForm.retailPrice,
      cogs: productForm.cogs,
      shippingEst: productForm.shippingEst,
      landedCost: landed,
      scrapedDetails: productForm.scrapedDetails,
      sourceUrl: productForm.sourceUrl,
      createdAt: now
    };

    setState((s) => ({ ...s, products: [p, ...s.products] }));

    setProductForm({
      name: "",
      storeId: state.ui.selectedStoreId,
      photoDataUrl: undefined,
      currency: "USD",
      retailPrice: undefined,
      cogs: undefined,
      shippingEst: undefined,
      landedCost: undefined,
      scrapedDetails: undefined,
      sourceUrl: undefined
    });
  }

  function addTechProject() {
    const name = techForm.name.trim();
    if (!name) return;
    const now = new Date().toISOString();

    const t: TechProject = {
      id: uid("tech"),
      name,
      status: techForm.status,
      linkedFrom: techForm.status === "on_hold" ? techForm.linkedFrom : undefined,
      notes: techForm.notes?.trim() || undefined,
      createdAt: now
    };

    setState((s) => ({ ...s, techProjects: [t, ...s.techProjects] }));
    setTechForm({ name: "", status: "brainstorming", linkedFrom: undefined, notes: "" });
  }

  const ideasSorted = [...state.ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="appRoot">
      {/* Left: primary nav */}
      <aside className="panel nav">
        <div className="brand">
          <div className="brandTitle">Opportunist Dashboard</div>
          <div className="brandSub">Scrape → organize → track.</div>
        </div>

        <div className="navGroup">
          <div className="navLabel">Workspace</div>
          {MAIN_TABS.map((t) => (
            <button
              key={t.id}
              className={`navBtn ${mainTab === t.id ? "navBtnActive" : ""}`}
              onClick={() => setMainTab(t.id)}
            >
              <span style={{ fontWeight: 850 }}>{t.label}</span>
              {t.id === "dashboard" ? <span className="pill">{analytics.openTasks} open</span> : null}
            </button>
          ))}
        </div>

        <div className="navGroup">
          <div className="navLabel">Quick stats</div>
          <div className="card" style={{ cursor: "default" }}>
            <div className="cardTitle">Active stores</div>
            <div className="cardMeta">
              <span className="pill">{analytics.activeStores}</span>
              <span className="pill">{analytics.products} products</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="panel main">
        {mainTab === "dashboard" ? (
          <DashboardView analytics={analytics} />
        ) : null}

        {mainTab === "ideas" ? (
          <IdeasView
            ideas={ideasSorted}
            newIdea={newIdea}
            setNewIdea={setNewIdea}
            onAddIdea={addIdea}
            onOpenIdea={openIdeaModal}
          />
        ) : null}

        {mainTab === "products" ? (
          <ProductsView
            state={state}
            selectedStore={selectedStore}
            productsFiltered={productsFiltered}
            scrapeImport={scrapeImport}
            setScrapeImport={setScrapeImport}
            onImportScrape={handleImportScrape}
            productForm={productForm}
            setProductForm={setProductForm}
            onAddProduct={addProductFromForm}
            onDeleteProduct={deleteProduct}
          />
        ) : null}

        {mainTab === "tech" ? (
          <TechView techProjects={state.techProjects} techForm={techForm} setTechForm={setTechForm} onAddTech={addTechProject} onUpsert={upsertTechProject} onDelete={deleteTechProject} />
        ) : null}
      </main>

      {/* Right: stores sidebar */}
      <aside className="panel right">
        <StoresSidebar
          stores={state.stores}
          selectedStore={selectedStore}
          onSelectStore={(id) => setSelectedStore(id)}
          newStore={newStore}
          setNewStore={setNewStore}
          onAddStore={addStore}
          onUpsertStore={upsertStore}
          onDeleteStore={deleteStore}
          products={state.products}
        />
      </aside>

      {/* Ideas modal */}
      {ideaModalOpen && selectedIdea ? (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIdeaModalOpen(false);
          }}
        >
          <div className="modal">
            <div className="modalLeft">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="modalTitle">{selectedIdea.title}</div>
                  <div className="cardMeta" style={{ marginTop: 10 }}>
                    <span className="pill">ROI: {selectedIdea.roi}</span>
                    <span className="pill">{selectedIdea.tasks.filter((t) => !t.done).length} tasks open</span>
                  </div>
                </div>
                <button className="closeBtn" onClick={() => setIdeaModalOpen(false)}>
                  Close
                </button>
              </div>

              <div className="section stack" style={{ marginTop: 12 }}>
                <label>Project README (from vault)</label>
                <textarea
                  value={selectedIdea.readme}
                  onChange={(e) => upsertIdea({ id: selectedIdea.id, readme: e.target.value })}
                />
              </div>

              <div className="section">
                <div className="tabs">
                  <button className={`tabBtn ${ideaModalTab === "tasks" ? "tabBtnActive" : ""}`} onClick={() => setIdeaModalTab("tasks")}>
                    Task Lists
                  </button>
                  <button className={`tabBtn ${ideaModalTab === "sources" ? "tabBtnActive" : ""}`} onClick={() => setIdeaModalTab("sources")}>
                    Sources
                  </button>
                  <button className={`tabBtn ${ideaModalTab === "codebase" ? "tabBtnActive" : ""}`} onClick={() => setIdeaModalTab("codebase")}>
                    Codebase / Git Repo
                  </button>
                </div>

                {ideaModalTab === "tasks" ? (
                  <div className="list">
                    <div className="formRow">
                      <div>
                        <label>Add task</label>
                        <input value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="e.g., Build theme skeleton" />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button className="btn btnPrimary" onClick={addTaskToSelectedIdea}>
                          Add
                        </button>
                      </div>
                    </div>

                    {selectedIdea.tasks.length === 0 ? (
                      <div className="muted">No tasks yet. Add your first one above.</div>
                    ) : null}

                    {selectedIdea.tasks.map((t) => (
                      <div key={t.id} className="taskRow">
                        <input type="checkbox" checked={t.done} onChange={(e) => toggleTask(t.id, e.target.checked)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 13, textDecoration: t.done ? "line-through" : "none" }}>{t.text}</div>
                        </div>
                        <button className="btn btnSmall btnDanger" onClick={() => deleteTask(t.id)}>
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {ideaModalTab === "sources" ? (
                  <div className="stack">
                    <div className="formRow">
                      <div>
                        <label>Add source URL</label>
                        <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="https://..." />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button className="btn btnPrimary" onClick={addSourceToSelectedIdea}>
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="list">
                      {selectedIdea.sources.length === 0 ? <div className="muted">No sources yet.</div> : null}
                      {selectedIdea.sources.map((s) => (
                        <div key={s} className="miniCard">
                          <div className="miniCardName" style={{ wordBreak: "break-word" }}>
                            {s}
                          </div>
                          <div className="x">
                            <button
                              className="btn btnSmall btnDanger"
                              onClick={() =>
                                upsertIdea({
                                  id: selectedIdea.id,
                                  sources: selectedIdea.sources.filter((x) => x !== s)
                                })
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {ideaModalTab === "codebase" ? (
                  <div className="stack">
                    <div className="formRow">
                      <div>
                        <label>Git repo / codebase URL</label>
                        <input value={newCodebaseUrl || selectedIdea.codebaseUrl || ""} onChange={(e) => setNewCodebaseUrl(e.target.value)} placeholder="https://github.com/..." />
                      </div>
                      <div style={{ display: "flex", alignItems: "flex-end" }}>
                        <button
                          className="btn btnPrimary"
                          onClick={() => {
                            setCodebaseForSelectedIdea();
                            setNewCodebaseUrl("");
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <div className="muted">Tip: you can paste a GitHub repo link and open it after saving.</div>

                    {selectedIdea.codebaseUrl ? (
                      <div className="miniCard">
                        <div className="miniCardName" style={{ wordBreak: "break-word" }}>{selectedIdea.codebaseUrl}</div>
                        <div className="x">
                          <a className="btn btnSmall" href={selectedIdea.codebaseUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        </div>
                      </div>
                    ) : null}

                    <div className="section">
                      <button
                        className="btn btnSmall btnDanger"
                        onClick={() => {
                          if (confirm("Delete this idea/project?")) {
                            deleteIdea(selectedIdea.id);
                            setIdeaModalOpen(false);
                          }
                        }}
                      >
                        Delete idea/project
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="modalRight">
              <div className="tabs" style={{ marginBottom: 10 }}>
                <span className="pill">Quick view</span>
                <span className="pill">Vault seeded</span>
              </div>

              <div className="preWrap">{selectedIdea.readme}</div>

              <div className="section">
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Sources</div>
                {selectedIdea.sources.length ? (
                  <div className="list">
                    {selectedIdea.sources.slice(0, 6).map((s) => (
                      <div key={s} className="miniCard">
                        <div className="miniCardName" style={{ wordBreak: "break-word" }}>{s}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">None yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Busy indicator */}
      {busy ? (
        <div style={{ position: "fixed", bottom: 18, left: 18, zIndex: 70 }}>
          <div className="panel" style={{ padding: "12px 14px" }}>
            <div style={{ fontWeight: 900 }}>{busy}</div>
          </div>
        </div>
      ) : null}
    </div>
  );

  function DashboardView({ analytics }: { analytics: { activeStores: number; products: number; ideas: number; openTasks: number } }) {
    return (
      <div className="stack">
        <div className="headerRow">
          <div>
            <h2 className="hTitle">Dashboard</h2>
            <p className="hSub">Minimal overview across stores, ideas, products, and tasks.</p>
          </div>
          <div>
            <span className="pill">Local persistence (demo)</span>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <SummaryCard title="Active stores" value={analytics.activeStores} hint="Status: active" accent="var(--accent)" />
          <SummaryCard title="Products tracked" value={analytics.products} hint="Global products list" accent="var(--accent2)" />
          <SummaryCard title="Open tasks" value={analytics.openTasks} hint="Across all ideas/projects" accent="var(--good)" />
        </div>

        <div className="section panel" style={{ padding: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Next actions</div>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            1) Import products via <b>Products</b> tab → "Scrape & import".<br />
            2) Add tasks inside an idea/project modal.<br />
            3) Update store ad spend/profits in the right sidebar.
          </div>
        </div>
      </div>
    );
  }

  function SummaryCard({ title, value, hint, accent }: { title: string; value: number; hint: string; accent: string }) {
    return (
      <div className="card" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.10)" }}>
        <div className="cardTitle">{title}</div>
        <div style={{ marginTop: 12, fontSize: 26, fontWeight: 950, color: accent }}>{value}</div>
        <div className="cardMeta" style={{ marginTop: 12 }}>
          <span>{hint}</span>
        </div>
      </div>
    );
  }

  function IdeasView({
    ideas,
    newIdea,
    setNewIdea,
    onAddIdea,
    onOpenIdea
  }: {
    ideas: Idea[];
    newIdea: { title: string; roi: string; readme: string };
    setNewIdea: (v: any) => void;
    onAddIdea: () => void;
    onOpenIdea: (id: string) => void;
  }) {
    return (
      <div className="stack">
        <div className="headerRow">
          <div>
            <h2 className="hTitle">Ideas & Projects</h2>
            <p className="hSub">Organize scraped opportunities, tasks, sources, and repos.</p>
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Add a new idea/project</div>
          <div className="formRow">
            <div>
              <label>Title</label>
              <input value={newIdea.title} onChange={(e) => setNewIdea((s: any) => ({ ...s, title: e.target.value }))} placeholder="e.g., memoparis.com" />
            </div>
            <div>
              <label>ROI</label>
              <input value={newIdea.roi} onChange={(e) => setNewIdea((s: any) => ({ ...s, roi: e.target.value }))} placeholder="pending / $5k/mo" />
            </div>
          </div>
          <div className="section">
            <label>README</label>
            <textarea value={newIdea.readme} onChange={(e) => setNewIdea((s: any) => ({ ...s, readme: e.target.value }))} placeholder="Paste notes here. You'll be able to edit later in the modal." />
          </div>
          <div className="section" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btnPrimary" onClick={onAddIdea}>
              Add idea
            </button>
          </div>
        </div>

        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 10 }}>Your ideas</div>
            <span className="pill">{ideas.length} total</span>
          </div>

          <div className="grid">
            {ideas.map((idea) => (
              <div key={idea.id} className="card" onClick={() => onOpenIdea(idea.id)}>
                <div className="cardTitle">{idea.title}</div>
                <div className="cardMeta">
                  <span className="pill">ROI: {idea.roi}</span>
                  <span className="pill">{idea.tasks.filter((t) => !t.done).length} open tasks</span>
                </div>
              </div>
            ))}
          </div>

          {ideas.length === 0 ? <div className="muted">No ideas yet. Add one above.</div> : null}
        </div>
      </div>
    );
  }

  function StoresSidebar({
    stores,
    selectedStore,
    onSelectStore,
    newStore,
    setNewStore,
    onAddStore,
    onUpsertStore,
    onDeleteStore,
    products
  }: {
    stores: Store[];
    selectedStore?: Store;
    onSelectStore: (id?: string) => void;
    newStore: { name: string; storefrontUrl?: string; status: StoreStatus };
    setNewStore: (v: any) => void;
    onAddStore: () => void;
    onUpsertStore: (patch: Partial<Store> & { id: string }) => void;
    onDeleteStore: (id: string) => void;
    products: Product[];
  }) {
    const [filter, setFilter] = useState<StoreStatus | "all">("all");

    const visible = useMemo(() => {
      if (filter === "all") return stores;
      return stores.filter((s) => s.status === filter);
    }, [stores, filter]);

    const storeProducts = useMemo(() => {
      if (!selectedStore) return [];
      return products.filter((p) => p.storeId === selectedStore.id);
    }, [products, selectedStore]);

    return (
      <div className="stack" style={{ width: "100%" }}>
        <div className="headerRow" style={{ marginBottom: 2 }}>
          <div>
            <h3 className="hTitle" style={{ fontSize: 14 }}>E-Commerce Stores</h3>
            <p className="hSub">Track status, ad spend, profits, and product grouping.</p>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Add store</div>
          <div className="stack">
            <div>
              <label>Name</label>
              <input value={newStore.name} onChange={(e) => setNewStore((s: any) => ({ ...s, name: e.target.value }))} placeholder="e.g., Memo Paris" />
            </div>
            <div>
              <label>Storefront URL (optional)</label>
              <input value={newStore.storefrontUrl ?? ""} onChange={(e) => setNewStore((s: any) => ({ ...s, storefrontUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <label>Status</label>
              <select value={newStore.status} onChange={(e) => setNewStore((s: any) => ({ ...s, status: e.target.value as StoreStatus }))}>
                {STORE_STATUSES.map((st) => (
                  <option key={st.key} value={st.key}>{st.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btnPrimary" onClick={onAddStore}>Add store</button>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>Stores</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className={`tabBtn ${filter === "all" ? "tabBtnActive" : ""}`} onClick={() => setFilter("all")}>All</button>
              <button className={`tabBtn ${filter === "active" ? "tabBtnActive" : ""}`} onClick={() => setFilter("active")}>Active</button>
            </div>
          </div>

          <div className="section list" style={{ marginTop: 10 }}>
            {visible.length === 0 ? <div className="muted">No stores match.</div> : null}
            {visible.map((st) => (
              <div
                key={st.id}
                className="miniCard"
                style={{ cursor: "pointer", borderColor: selectedStore?.id === st.id ? "rgba(124,92,255,0.45)" : "rgba(255,255,255,0.10)" }}
                onClick={() => onSelectStore(st.id)}
              >
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="miniCardName">{st.name}</div>
                  <span className="pill">{st.status}</span>
                </div>
                {st.storefrontUrl ? <div className="muted" style={{ marginTop: 6, wordBreak: "break-word", fontSize: 12 }}>{st.storefrontUrl}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Store details</div>
          {!selectedStore ? (
            <div className="muted">Select a store to edit.</div>
          ) : (
            <div className="stack">
              <div>
                <label>Status</label>
                <select value={selectedStore.status} onChange={(e) => onUpsertStore({ id: selectedStore.id, status: e.target.value as StoreStatus })}>
                  {STORE_STATUSES.map((st) => (
                    <option key={st.key} value={st.key}>{st.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label>Ad spend (monthly)</label>
                <input
                  value={selectedStore.adSpend ?? ""}
                  onChange={(e) => onUpsertStore({ id: selectedStore.id, adSpend: safeNumber(e.target.value) })}
                  placeholder="e.g., 12000"
                />
              </div>

              <div>
                <label>Profit (monthly)</label>
                <input
                  value={selectedStore.profit ?? ""}
                  onChange={(e) => onUpsertStore({ id: selectedStore.id, profit: safeNumber(e.target.value) })}
                  placeholder="e.g., 35000"
                />
              </div>

              <div>
                <label>Notes (optional)</label>
                <textarea value={selectedStore.notes ?? ""} onChange={(e) => onUpsertStore({ id: selectedStore.id, notes: e.target.value })} placeholder="Short strategy notes…" />
              </div>

              <div className="section">
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Products in this storefront</div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="pill">{storeProducts.length} products</span>
                  <button className="btn btnSmall" onClick={() => setMainTab("products")}>Open Products tab</button>
                </div>
              </div>

              <div className="section">
                <button
                  className="btn btnSmall btnDanger"
                  onClick={() => {
                    if (confirm(`Delete store "${selectedStore.name}"?`)) {
                      onDeleteStore(selectedStore.id);
                    }
                  }}
                >
                  Delete store
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function ProductsView({
    state,
    selectedStore,
    productsFiltered,
    scrapeImport,
    setScrapeImport,
    onImportScrape,
    productForm,
    setProductForm,
    onAddProduct,
    onDeleteProduct
  }: {
    state: DashboardState;
    selectedStore?: Store;
    productsFiltered: Product[];
    scrapeImport: { url: string; prompt: string };
    setScrapeImport: (v: any) => void;
    onImportScrape: () => Promise<void>;
    productForm: any;
    setProductForm: (v: any) => void;
    onAddProduct: () => void;
    onDeleteProduct: (id: string) => void;
  }) {
    const storeOptions = state.stores;

    return (
      <div className="stack">
        <div className="headerRow">
          <div>
            <h2 className="hTitle">Products</h2>
            <p className="hSub">Add scraped products, attach photos, and track landed cost.</p>
          </div>
          <div>
            <span className="pill">{selectedStore ? `Storefront: ${selectedStore.name}` : "All storefronts"}</span>
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Scrape & import products</div>
          <div className="formRow">
            <div>
              <label>URL</label>
              <input value={scrapeImport.url} onChange={(e) => setScrapeImport((s: any) => ({ ...s, url: e.target.value }))} />
            </div>
            <div>
              <label>Prompt (optional)</label>
              <input
                value={scrapeImport.prompt}
                onChange={(e) => setScrapeImport((s: any) => ({ ...s, prompt: e.target.value }))}
                placeholder="Use 'get more data, not less…' wording"
              />
            </div>
          </div>
          <div className="section" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btnPrimary" onClick={onImportScrape}>Scrape & import</button>
          </div>
          <div className="muted" style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45 }}>
            Imported products are stored in your Products list and grouped to the currently selected store.
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Add / update product</div>

          <div className="formRow">
            <div>
              <label>Name</label>
              <input value={productForm.name} onChange={(e) => setProductForm((s: any) => ({ ...s, name: e.target.value }))} placeholder="Product name" />
            </div>
            <div>
              <label>Storefront</label>
              <select
                value={productForm.storeId ?? ""}
                onChange={(e) => setProductForm((s: any) => ({ ...s, storeId: e.target.value || undefined }))}
              >
                <option value="">(optional) No store grouping</option>
                {storeOptions.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="formRow section">
            <div>
              <label>Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await fileToDataUrl(file);
                  setProductForm((s: any) => ({ ...s, photoDataUrl: dataUrl }));
                }}
              />
            </div>
            <div>
              <label>Retail price (from scrape)</label>
              <input value={productForm.retailPrice ?? ""} onChange={(e) => setProductForm((s: any) => ({ ...s, retailPrice: safeNumber(e.target.value) }))} placeholder="e.g., 75" />
            </div>
          </div>

          <div className="formRow section">
            <div>
              <label>COGS</label>
              <input value={productForm.cogs ?? ""} onChange={(e) => setProductForm((s: any) => ({ ...s, cogs: safeNumber(e.target.value) }))} placeholder="e.g., 20" />
            </div>
            <div>
              <label>Shipping est.</label>
              <input value={productForm.shippingEst ?? ""} onChange={(e) => setProductForm((s: any) => ({ ...s, shippingEst: safeNumber(e.target.value) }))} placeholder="e.g., 6" />
            </div>
          </div>

          <div className="formRow section">
            <div>
              <label>Landed cost</label>
              <input
                value={productForm.landedCost ?? ""}
                onChange={(e) => setProductForm((s: any) => ({ ...s, landedCost: safeNumber(e.target.value) }))}
                placeholder="COGS + Shipping"
              />
            </div>
            <div>
              <label>Currency</label>
              <input value={productForm.currency ?? "USD"} onChange={(e) => setProductForm((s: any) => ({ ...s, currency: e.target.value }))} placeholder="USD" />
            </div>
          </div>

          <div className="section stack">
            <label>Scraper details (optional JSON)</label>
            <textarea
              value={productForm.scrapedDetails ? JSON.stringify(productForm.scrapedDetails, null, 2) : ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) return setProductForm((s: any) => ({ ...s, scrapedDetails: undefined }));
                try {
                  const parsed = JSON.parse(raw);
                  setProductForm((s: any) => ({ ...s, scrapedDetails: parsed }));
                } catch {
                  // Keep typing without hard failing; only save on valid JSON.
                }
              }}
              placeholder='Paste scraper JSON (or leave blank). Example: { "materials": ["Vanilla"] }'
            />
          </div>

          <div className="section" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btnPrimary" onClick={onAddProduct}>Add product</button>
          </div>
        </div>

        <div className="section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900 }}>Products</div>
            <span className="pill">{productsFiltered.length} shown</span>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
            {productsFiltered.map((p) => (
              <div key={p.id} className="card" style={{ cursor: "default" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="cardTitle" style={{ lineHeight: 1.25 }}>{p.name}</div>
                  <button className="btn btnSmall btnDanger" onClick={() => onDeleteProduct(p.id)}>
                    Delete
                  </button>
                </div>

                <div className="cardMeta" style={{ marginTop: 10 }}>
                  {p.retailPrice != null ? <span className="pill">{p.currency ?? "USD"} {p.retailPrice}</span> : null}
                  {p.landedCost != null ? <span className="pill">Landed {p.landedCost}</span> : null}
                </div>

                <div className="section">
                  {p.photoDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="thumb" src={p.photoDataUrl} alt={p.name} />
                  ) : (
                    <div className="muted" style={{ fontSize: 12 }}>No photo</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {productsFiltered.length === 0 ? <div className="muted">No products yet. Import or add one above.</div> : null}
        </div>
      </div>
    );
  }

  function TechView({
    techProjects,
    techForm,
    setTechForm,
    onAddTech,
    onUpsert,
    onDelete
  }: {
    techProjects: TechProject[];
    techForm: { name: string; status: TechCompletion; linkedFrom?: Exclude<TechCompletion, "on_hold">; notes?: string };
    setTechForm: (v: any) => void;
    onAddTech: () => void;
    onUpsert: (patch: Partial<TechProject> & { id: string }) => void;
    onDelete: (id: string) => void;
  }) {
    const grouped = useMemo(() => {
      const m = new Map<TechCompletion, TechProject[]>();
      TECH_GROUPS.forEach((g) => m.set(g.key, []));
      for (const p of techProjects) {
        m.get(p.status)?.push(p);
      }
      return m;
    }, [techProjects]);

    return (
      <div className="stack">
        <div className="headerRow">
          <div>
            <h2 className="hTitle">Tech / SaaS projects</h2>
            <p className="hSub">Grouped by completion level. On-hold can link to any progress group.</p>
          </div>
        </div>

        <div className="panel" style={{ padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Add tech project</div>
          <div className="formRow">
            <div>
              <label>Name</label>
              <input value={techForm.name} onChange={(e) => setTechForm((s: any) => ({ ...s, name: e.target.value }))} placeholder="e.g., invoice generator SaaS" />
            </div>
            <div>
              <label>Status</label>
              <select value={techForm.status} onChange={(e) => setTechForm((s: any) => ({ ...s, status: e.target.value as TechCompletion }))}>
                {TECH_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {techForm.status === "on_hold" ? (
            <div className="section">
              <label>Linked from (progress group)</label>
              <select
                value={techForm.linkedFrom ?? ""}
                onChange={(e) => setTechForm((s: any) => ({ ...s, linkedFrom: e.target.value as any }))}
              >
                <option value="">(choose)</option>
                {TECH_GROUPS.filter((g) => g.key !== "on_hold").map((g) => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="section">
            <label>Notes (optional)</label>
            <textarea value={techForm.notes ?? ""} onChange={(e) => setTechForm((s: any) => ({ ...s, notes: e.target.value }))} placeholder="What’s the current situation? Any next step?" />
          </div>

          <div className="section" style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btnPrimary" onClick={onAddTech}>Add project</button>
          </div>
        </div>

        <div className="section">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Board</div>
          <div className="columns">
            {TECH_GROUPS.map((group) => (
              <div className="col" key={group.key}>
                <div className="colTitle">
                  {group.label} <span className="pill" style={{ marginLeft: 8 }}>{group.key === "on_hold" ? (group.key as any) : ""}</span>
                </div>
                <div className="list">
                  {(grouped.get(group.key) ?? []).map((p) => (
                    <div key={p.id} className="miniCard">
                      <div className="miniCardName">{p.name}</div>
                      {p.status === "on_hold" && p.linkedFrom ? (
                        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                          Linked from: {TECH_GROUPS.find((g) => g.key === p.linkedFrom)?.label ?? p.linkedFrom}
                        </div>
                      ) : null}
                      <div className="section" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                        <label style={{ margin: 0 }}>Move</label>
                        <select
                          value={p.status}
                          onChange={(e) => {
                            const nextStatus = e.target.value as TechCompletion;
                            onUpsert({ id: p.id, status: nextStatus, linkedFrom: nextStatus === "on_hold" ? (p.linkedFrom ?? "idea_validated") : undefined });
                          }}
                        >
                          {TECH_GROUPS.map((g) => (
                            <option key={g.key} value={g.key}>{g.label}</option>
                          ))}
                        </select>

                        {p.status === "on_hold" ? (
                          <select
                            value={p.linkedFrom ?? ""}
                            onChange={(e) => onUpsert({ id: p.id, linkedFrom: e.target.value as any })}
                          >
                            <option value="">(choose)</option>
                            {TECH_GROUPS.filter((g) => g.key !== "on_hold").map((g) => (
                              <option key={g.key} value={g.key}>{g.label}</option>
                            ))}
                          </select>
                        ) : null}

                        <div className="x">
                          <button className="btn btnSmall btnDanger" onClick={() => onDelete(p.id)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(grouped.get(group.key) ?? []).length === 0 ? <div className="muted" style={{ fontSize: 12 }}>Drop-in later.</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

