import { pruneStaleRepositories, type Repository } from "./repositories.ts";

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
