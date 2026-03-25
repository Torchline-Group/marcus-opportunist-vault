export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1>Marcus Opportunist Vault</h1>
      <p>Use the API to trigger Firecrawl scraping.</p>
      <ul>
        <li>
          <code>POST /api/scrape</code> with JSON: <code>{"{ url, prompt?, writeVault? }"}</code>
        </li>
        <li>
          <code>GET /api/health</code>
        </li>
      </ul>
    </main>
  );
}

