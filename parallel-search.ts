const PARALLEL_SEARCH_MCP_URL = "https://search.parallel.ai/mcp";
const MCP_PROTOCOL_VERSION = "2025-06-18";

export type ParallelSearchResult = {
  url: string;
  title?: string | null;
  publish_date?: string | null;
  excerpts: string[];
};

type ParallelSearchResponse = {
  search_id: string;
  results: ParallelSearchResult[];
  session_id: string;
};

type McpResponse = {
  error?: { message?: string };
  result?: {
    content?: { type: string; text?: string }[];
    structuredContent?: ParallelSearchResponse;
    isError?: boolean;
  };
};

type Fetcher = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export async function searchWithParallel(
  {
    objective,
    searchQueries,
    sessionId = crypto.randomUUID(),
  }: {
    objective: string;
    searchQueries: string[];
    sessionId?: string;
  },
  fetcher: Fetcher = fetch,
): Promise<ParallelSearchResult[]> {
  const response = await fetcher(PARALLEL_SEARCH_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "web_search",
        arguments: {
          objective,
          search_queries: searchQueries,
          session_id: sessionId,
        },
      },
    }),
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Parallel MCP search failed: ${response.status} ${responseText}`,
    );
  }

  let mcpResponse: McpResponse;
  try {
    mcpResponse = JSON.parse(responseText) as McpResponse;
  } catch {
    throw new Error("Parallel MCP search returned invalid JSON");
  }

  if (mcpResponse.error) {
    throw new Error(
      `Parallel MCP search failed: ${
        mcpResponse.error.message ?? "Unknown error"
      }`,
    );
  }
  if (!mcpResponse.result) {
    throw new Error("Parallel MCP search returned no result");
  }

  const textContent = mcpResponse.result.content?.find(({ type }) =>
    type === "text"
  )?.text;
  if (mcpResponse.result.isError) {
    throw new Error(
      `Parallel MCP search failed: ${textContent ?? "Unknown tool error"}`,
    );
  }

  let searchResponse = mcpResponse.result.structuredContent;
  if (!searchResponse && textContent) {
    try {
      searchResponse = JSON.parse(textContent) as ParallelSearchResponse;
    } catch {
      throw new Error("Parallel MCP search returned invalid tool content");
    }
  }
  if (!searchResponse) {
    throw new Error("Parallel MCP search returned no search response");
  }

  return searchResponse.results;
}
