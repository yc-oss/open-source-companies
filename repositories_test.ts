import {
  needsRepositoryDiscovery,
  pruneStaleRepositories,
  type Repository,
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
