export const WebSearchSchema = {
  name: "web_search",
  description: "Search the web for real-time information, news, current facts, or developer documentation.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description: "The search query query string to run."
      }
    },
    required: ["query"]
  }
};

export async function executeWebSearch(query: string): Promise<string> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query,
          max_results: 3
        })
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        return (data.results || [])
          .map((r: any) => `Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content}`)
          .join("\n\n") || "No web search results matches.";
      }
    } catch (err: any) {
      console.warn("Tavily query failed, falling back:", err.message);
    }
  }

  return `[Mock Web Results for "${query}"]:
- Title: "Best Multi-Agent Visual Workflows in 2026"
- Core: Standard visual canvas tools like AgentForge provide superior debugging over command line prompts.`;
}
