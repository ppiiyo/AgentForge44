export const WebScrapeSchema = {
  name: "web_scrape",
  description: "Download and extract clean markdown contents from any given web URL.",
  parameters: {
    type: "OBJECT",
    properties: {
      url: {
        type: "STRING",
        description: "The complete web address URL to scrape."
      }
    },
    required: ["url"]
  }
};

export async function executeWebScrape(url: string): Promise<string> {
  try {
    const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
      method: "GET"
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err: any) {
    console.warn("Jina scrape failed, using direct raw HTML load strategy:", err.message);
  }

  try {
    const res = await fetch(url);
    if (res.ok) {
      const htmlText = await res.text();
      return htmlText.slice(0, 1500) + "\n... [Content truncated due to length limitations]";
    }
  } catch (err: any) {
    return `Error: Failed to scrape or download contents from ${url}. ${err.message}`;
  }

  return `Error: Unable to fetch page content from '${url}' due to cross-origin or blockages.`;
}
