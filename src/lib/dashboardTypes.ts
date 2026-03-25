export type MainTab = "dashboard" | "ideas" | "products" | "tech";

export type TaskItem = {
  id: string;
  text: string;
  done: boolean;
};

export type Idea = {
  id: string;
  title: string; // hostname or project name
  roi: string;
  readme: string; // markdown-ish text
  sources: string[];
  codebaseUrl?: string;
  tasks: TaskItem[];
  createdAt: string; // ISO
};

export type StoreStatus = "active" | "inactive" | "deactivated";

export type Store = {
  id: string;
  name: string;
  storefrontUrl?: string;
  status: StoreStatus;
  notes?: string;
  adSpend?: number; // monthly estimate
  profit?: number; // monthly estimate
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  currency?: string;
  retailPrice?: number;

  // Your cost model
  cogs?: number;
  shippingEst?: number;
  landedCost?: number;

  // Media
  photoDataUrl?: string; // base64 in localStorage

  // Storefront grouping
  storeId?: string;

  // Scraper details (keep flexible)
  scrapedDetails?: Record<string, unknown>;
  sourceUrl?: string;
  createdAt: string;
};

export type TechCompletion =
  | "brainstorming"
  | "idea_validated"
  | "in_progress"
  | "finishing_touches"
  | "complete"
  | "on_hold";

export type TechProject = {
  id: string;
  name: string;
  status: TechCompletion;
  linkedFrom?: Exclude<TechCompletion, "on_hold">; // where it came from
  notes?: string;
  createdAt: string;
};

export type DashboardState = {
  version: 1;
  ideas: Idea[];
  stores: Store[];
  products: Product[];
  techProjects: TechProject[];
  ui: {
    selectedIdeaId?: string;
    selectedStoreId?: string;
    mainTab: MainTab;
  };
};

