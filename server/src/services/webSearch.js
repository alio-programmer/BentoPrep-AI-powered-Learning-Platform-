// Web search service using Tavily Search API for AI agent context augmentation.

const TAVILY_API_URL = 'https://api.tavily.com/search';

/**
 * Perform a web search using Tavily API.
 * @param {string} query Search query string
 * @param {object} options Search options: maxResults (default 3), searchDepth ('basic'|'advanced')
 * @returns {Promise<{ results: Array<{ title: string, url: string, content: string }>, query: string, error?: string }>}
 */
export async function searchWeb(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return { results: [], query, error: 'TAVILY_API_KEY is not configured on server' };
  }

  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) {
    return { results: [], query: '' };
  }

  const maxResults = Math.min(Math.max(Number(options.maxResults) || 3, 1), 8);
  const searchDepth = options.searchDepth === 'advanced' ? 'advanced' : 'basic';

  try {
    const res = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: cleanQuery,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.warn(`[webSearch] Tavily API returned status ${res.status}: ${errText}`);
      return { results: [], query: cleanQuery, error: `Tavily API error: ${res.status}` };
    }

    const data = await res.json();
    const rawResults = Array.isArray(data.results) ? data.results : [];
    const results = rawResults.map((r) => ({
      title: String(r.title || '').trim(),
      url: String(r.url || '').trim(),
      content: String(r.content || '').trim().slice(0, 1000),
    })).filter((r) => r.title && r.url);

    return { results, query: cleanQuery };
  } catch (err) {
    console.warn(`[webSearch] Search failed for query "${cleanQuery}":`, err.message);
    return { results: [], query: cleanQuery, error: err.message };
  }
}

/**
 * Format search results into context string suitable for injection into an LLM prompt.
 * @param {Array<{ title: string, url: string, content: string }>|{ results: Array }} searchData
 * @returns {string} Formatted context block
 */
export function formatSearchContext(searchData) {
  const items = Array.isArray(searchData) ? searchData : (searchData?.results || []);
  if (!items.length) return '';

  const blocks = items.map((item, idx) => {
    return `[Source ${idx + 1}] ${item.title} (${item.url})\n${item.content}`;
  });

  return `[Web Search Context for Up-to-Date Reference]:\n${blocks.join('\n\n')}`;
}

/**
 * Format source citations in markdown format.
 * @param {Array<{ title: string, url: string }>} items
 * @returns {string} Markdown formatted citations list
 */
export function formatSourcesMarkdown(items) {
  const list = Array.isArray(items) ? items : (items?.results || []);
  if (!list.length) return '';

  const links = list
    .filter((s) => s.url && s.title)
    .map((s) => `- [${s.title}](${s.url})`)
    .join('\n');

  return `\n\n---\n**🌐 Sources & References:**\n${links}`;
}
