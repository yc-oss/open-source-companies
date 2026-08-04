import { searchWithParallel } from "./parallel-search.ts";

Deno.test("searchWithParallel sends an anonymous MCP tool call", async () => {
  const results = await searchWithParallel(
    {
      objective: "Find the official repository for Example Company.",
      searchQueries: ["Example Company GitHub repository"],
      sessionId: "test-session",
    },
    (input, init) => {
      if (input !== "https://search.parallel.ai/mcp") {
        throw new Error(`Unexpected endpoint: ${input}`);
      }
      if (init?.method !== "POST") {
        throw new Error(`Expected POST; got ${init?.method}`);
      }

      const headers = new Headers(init.headers);
      if (headers.has("Authorization")) {
        throw new Error("Expected an unauthenticated request");
      }
      if (headers.get("MCP-Protocol-Version") !== "2025-06-18") {
        throw new Error("Expected the negotiated MCP protocol version");
      }

      const body = JSON.parse(String(init.body));
      if (body.method !== "tools/call" || body.params.name !== "web_search") {
        throw new Error("Expected a web_search MCP tool call");
      }
      if (body.params.arguments.session_id !== "test-session") {
        throw new Error("Expected the supplied session ID");
      }

      return Promise.resolve(
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [],
            structuredContent: {
              search_id: "search_test",
              results: [{
                url: "https://github.com/example/repository",
                title: "Example repository",
                publish_date: null,
                excerpts: ["Example excerpt"],
              }],
              session_id: "test-session",
            },
            isError: false,
          },
        }),
      );
    },
  );

  if (results[0]?.url !== "https://github.com/example/repository") {
    throw new Error(`Unexpected search results: ${JSON.stringify(results)}`);
  }
});

Deno.test("searchWithParallel reads the MCP text fallback", async () => {
  const searchResponse = {
    search_id: "search_test",
    results: [{
      url: "https://github.com/example/fallback",
      excerpts: ["Fallback excerpt"],
    }],
    session_id: "test-session",
  };

  const results = await searchWithParallel(
    {
      objective: "Find a repository.",
      searchQueries: ["Example repository"],
      sessionId: "test-session",
    },
    () =>
      Promise.resolve(
        Response.json({
          jsonrpc: "2.0",
          id: 1,
          result: {
            content: [{ type: "text", text: JSON.stringify(searchResponse) }],
            isError: false,
          },
        }),
      ),
  );

  if (results[0]?.url !== "https://github.com/example/fallback") {
    throw new Error(`Unexpected fallback results: ${JSON.stringify(results)}`);
  }
});

Deno.test("searchWithParallel reports MCP tool errors", async () => {
  try {
    await searchWithParallel(
      {
        objective: "Find a repository.",
        searchQueries: ["Example repository"],
      },
      () =>
        Promise.resolve(
          Response.json({
            jsonrpc: "2.0",
            id: 1,
            result: {
              content: [{ type: "text", text: "Rate limit exceeded" }],
              isError: true,
            },
          }),
        ),
    );
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Rate limit")) {
      throw error;
    }
    return;
  }

  throw new Error("Expected the MCP tool error to be surfaced");
});
