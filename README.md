# marcus-opportunist-vault

## One-Click E-com Empire Builder for Cursor

**Scrape → Clone → Deploy → Profit** in <20 mins. No tab-switching.

### 🎯 What It Does
- `@scraper` target site → extracts products/colors/theme 
- Auto-generates Next.js + Shopify/Vercel site
- Populates **real products** (AliExpress scrape)
- Deploys live store + domain connect
- Tracks all ideas in `vault.md`

# MCP's Suggested

- 1. **Firecrawl MCP** (Web Scraper) [.cursor/mcp.json]
   "scrape-site": {
     "command": "npx", "args": ["firecrawl-mcp"],
     "env": {"FIRECRAWL_API_KEY": "your-key"}
   }
   → Prompt: "@firecrawl scrape https://target-ecom.com → extract colors/products → generate Shopify theme"

2. **Supabase MCP** (Your DB)
   → One-prompt RLS tables, Vercel deploys for Vespera portals.

3. **Vercel/Railway MCP** 
   → "Build Next.js clone → deploy → connect domain" in 1 chat.

4. **Custom E-com MCP** (Your Killer)
   ```json
   {
     "ecom-clone": {
       "command": "node",
       "args": ["./mcp/ecom-agent.js"],
       "inputs": ["url", "products", "shipping"]
     }
   }

### ⚡ Quickstart (2 mins)
```bash
npx create-cursor-opportunist@latest my-vault
cd

marcus-opportunist-vault/
├── README.md                 # Paste full README above [code_file:1]
├── .cursor/
│   └── mcp.json              # MCP config
├── vault.md                  # Your ideas vault
├── workflow_agent.md         # Build steps
├── system_prompt.md          # Cursor agent brain
├── .env.example              # Keys template
├── package.json              # npm deps
└── scripts/
    ├── scraper.js           # Firecrawl logic
    └── deploy.js            # Vercel/Shopify

### 📤 GitHub Setup (One-Time)
```bash
# After cloning/creating files
git init
git add .
git commit -m "v1.0 Opportunist Vault"
git remote add origin https://github.com/YOURNAME/marcus-opportunist-vault.git
git push -u origin main


**Full Flow**:
1. Create empty GitHub repo **first** (marcus-opportunist-vault)
2. Local folder → paste all files above
3. Terminal in folder → run push commands
4. Repo live → `git clone` anywhere

**Pro Tip**: GitHub Codespaces → "Open in Cursor" → **zero local setup**.

**Do this now** → repo URL ready for cursor.directory submission.[1]

