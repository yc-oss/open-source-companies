import {
  formatStarsCell,
  githubRepoApiUrl,
  needsRepositoryDiscovery,
  parseGitHubRepositoryUrl,
  pruneStaleRepositories,
  type Repository,
  selectGitHubRepositoryUrl,
} from "./repositories.ts";

Deno.test("needsRepositoryDiscovery searches placeholder entries", () => {
  if (!needsRepositoryDiscovery(undefined)) {
    throw new Error("Expected a company with no entry to be searched");
  }
  if (!needsRepositoryDiscovery({})) {
    throw new Error("Expected a placeholder entry to be searched");
  }
  if (!needsRepositoryDiscovery({ github_repo: { stargazers_count: 0 } })) {
    throw new Error("Expected an entry without a url to be searched");
  }
  if (needsRepositoryDiscovery({ url: "https://github.com/example/active" })) {
    throw new Error("Expected an already mapped entry to be left alone");
  }
});

Deno.test("parseGitHubRepositoryUrl rejects GitHub site pages from search results", () => {
  if (parseGitHubRepositoryUrl("https://github.com/topics/llm-optimization")) {
    throw new Error(
      "Expected /topics/ pages not to be treated as repositories",
    );
  }
  if (
    parseGitHubRepositoryUrl("https://github.com/orgs/example/repositories")
  ) {
    throw new Error("Expected /orgs/ pages not to be treated as repositories");
  }
  if (parseGitHubRepositoryUrl("https://github.com/features/actions")) {
    throw new Error(
      "Expected /features/ pages not to be treated as repositories",
    );
  }
  if (parseGitHubRepositoryUrl("https://github.com/sponsors/example")) {
    throw new Error(
      "Expected /sponsors/ pages not to be treated as repositories",
    );
  }
  if (parseGitHubRepositoryUrl("https://example.com/owner/repo")) {
    throw new Error("Expected non-GitHub hosts to be ignored");
  }
  if (parseGitHubRepositoryUrl("not a url")) {
    throw new Error("Expected invalid URLs not to throw");
  }
});

Deno.test("parseGitHubRepositoryUrl extracts canonical owner/repo URLs", () => {
  const blobUrl = parseGitHubRepositoryUrl(
    "https://github.com/example/repository/blob/main/README.md",
  );
  if (blobUrl?.htmlUrl !== "https://github.com/example/repository") {
    throw new Error(
      `Expected blob URLs to canonicalize; got ${blobUrl?.htmlUrl}`,
    );
  }

  const gitSuffix = parseGitHubRepositoryUrl(
    "https://www.github.com/example/repository.git",
  );
  if (gitSuffix?.htmlUrl !== "https://github.com/example/repository") {
    throw new Error(
      `Expected .git suffix to be stripped; got ${gitSuffix?.htmlUrl}`,
    );
  }

  const trailingSlash = parseGitHubRepositoryUrl(
    "https://github.com/example/repository/",
  );
  if (trailingSlash?.htmlUrl !== "https://github.com/example/repository") {
    throw new Error(
      `Expected trailing slashes to be ignored; got ${trailingSlash?.htmlUrl}`,
    );
  }
});

Deno.test("selectGitHubRepositoryUrl skips non-repo GitHub pages", () => {
  const selected = selectGitHubRepositoryUrl([
    { url: "https://orchestra.ai" },
    { url: "https://github.com/topics/llm-optimization" },
    { url: "not a url" },
    { url: "https://github.com/orchestra-ai/orchestra" },
  ]);
  if (selected !== "https://github.com/orchestra-ai/orchestra") {
    throw new Error(`Expected the first real repository; got ${selected}`);
  }
});

Deno.test("githubRepoApiUrl uses owner/repo rather than extra path segments", () => {
  const apiUrl = githubRepoApiUrl(
    "https://github.com/example/repository/tree/main",
  );
  if (apiUrl !== "https://api.github.com/repos/example/repository") {
    throw new Error(`Unexpected API URL: ${apiUrl}`);
  }
  if (githubRepoApiUrl("https://github.com/topics/llm-optimization")) {
    throw new Error("Expected topic pages not to produce an API URL");
  }
});

Deno.test("formatStarsCell renders zero star counts", () => {
  const cell = formatStarsCell({
    url: "https://github.com/example/repository",
    github_repo: { stargazers_count: 0 },
  });
  if (!cell.startsWith("0 ")) {
    throw new Error(`Expected a visible 0 star count; got ${cell}`);
  }

  const missing = formatStarsCell({
    url: "https://github.com/example/repository",
  });
  if (missing !== "") {
    throw new Error("Expected missing star counts to stay empty");
  }
});

Deno.test("pruneStaleRepositories removes mappings absent from company API list", () => {
  const repositories: Record<string, Repository> = {
    active: { url: "https://github.com/example/active" },
    orphaned: { url: "https://github.com/example/orphaned" },
    stale: { url: "https://github.com/example/stale" },
  };

  const removedSlugs = pruneStaleRepositories(repositories, [
    { slug: "active" },
  ]);

  const sortedRemovedSlugs = [...removedSlugs].sort();
  if (sortedRemovedSlugs.join(",") !== "orphaned,stale") {
    throw new Error(
      `Expected orphaned,stale; got ${sortedRemovedSlugs.join(",")}`,
    );
  }
  if (!("active" in repositories)) {
    throw new Error("Expected active mapping to remain");
  }
  if ("orphaned" in repositories || "stale" in repositories) {
    throw new Error("Expected stale mappings to be removed");
  }
});
