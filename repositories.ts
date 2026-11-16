export type Company = {
  slug: string;
  name: string;
  one_liner: string;
  batch: string;
  api: string;
  website: string;
  small_logo_thumb_url: string;
  stars_count?: number;
};

export type GitHubRepo = {
  html_url?: string;
  stargazers_count?: number;
  watchers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  network_count?: number;
  subscribers_count?: number;
};

export type Repository = {
  url?: string;
  github_repo?: GitHubRepo;
};

export type ParsedGitHubRepository = {
  owner: string;
  repo: string;
  htmlUrl: string;
};

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

const GITHUB_RESERVED_OWNERS = new Set([
  "about",
  "account",
  "admin",
  "apps",
  "blog",
  "codespaces",
  "collections",
  "contact",
  "copilot",
  "customer-stories",
  "dashboard",
  "education",
  "enterprise",
  "events",
  "explore",
  "features",
  "gist",
  "integrations",
  "issues",
  "join",
  "login",
  "marketplace",
  "new",
  "notifications",
  "open-source",
  "organizations",
  "orgs",
  "personal",
  "pricing",
  "pulls",
  "readme",
  "resources",
  "search",
  "security",
  "settings",
  "showcases",
  "site",
  "solutions",
  "sponsors",
  "stars",
  "support",
  "topics",
  "trending",
  "users",
  "watching",
]);

/**
 * Reports whether a company still needs its GitHub repository discovered.
 *
 * repositories.json keeps placeholder entries (`{}`) for companies whose
 * repository has not been found yet, so the presence of an entry does not mean
 * a repository is known. Discovery has to key on `url` rather than on the entry
 * itself, otherwise a placeholder is truthy and is never searched again.
 */
export function needsRepositoryDiscovery(
  repository: Repository | undefined,
): boolean {
  return !repository?.url;
}

/**
 * Extracts owner/repo from a GitHub URL, or undefined when the URL is not a
 * repository. Search results often include site pages such as
 * https://github.com/topics/...; treating those as repos causes a 404 lookup
 * and can hide a later, real repository in the same result list.
 */
export function parseGitHubRepositoryUrl(
  url: string,
): ParsedGitHubRepository | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  if (!GITHUB_HOSTS.has(parsed.hostname.toLowerCase())) {
    return undefined;
  }

  const [owner, repoWithGit] = parsed.pathname.split("/").filter(Boolean);
  if (!owner || !repoWithGit) {
    return undefined;
  }
  if (GITHUB_RESERVED_OWNERS.has(owner.toLowerCase())) {
    return undefined;
  }

  const repo = repoWithGit.replace(/\.git$/i, "");
  if (!repo) {
    return undefined;
  }

  return {
    owner,
    repo,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function selectGitHubRepositoryUrl(
  results: { url: string }[],
): string | undefined {
  for (const { url } of results) {
    const repository = parseGitHubRepositoryUrl(url);
    if (repository) {
      return repository.htmlUrl;
    }
  }
}

export function githubRepoApiUrl(repositoryUrl: string): string | undefined {
  const repository = parseGitHubRepositoryUrl(repositoryUrl);
  if (!repository) {
    return undefined;
  }
  return `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
}

export function formatRepoCell(repository: Repository | undefined): string {
  if (!repository?.url) {
    return "";
  }
  const parsed = parseGitHubRepositoryUrl(repository.url);
  if (!parsed) {
    return "";
  }
  return `[${parsed.owner}/${parsed.repo}](${parsed.htmlUrl})`;
}

export function formatStarsCell(repository: Repository | undefined): string {
  if (!repository?.url) {
    return "";
  }
  const parsed = parseGitHubRepositoryUrl(repository.url);
  const starCount = repository.github_repo?.stargazers_count;
  if (!parsed || starCount == null) {
    return "";
  }
  return `${
    starCount.toLocaleString("en-US")
  } <img alt="" src="https://api.star-history.com/svg?repos=${parsed.owner}/${parsed.repo}" height="32">`;
}

/**
 * Removes repository mappings for companies that are no longer present in the
 * YC OSS API response. This intentionally mutates `repositories`, because the
 * update script writes the pruned object back to repositories.json.
 */
export function pruneStaleRepositories(
  repositories: Record<string, Repository>,
  companies: Pick<Company, "slug">[],
): string[] {
  const activeSlugs = new Set(companies.map(({ slug }) => slug));
  const removedSlugs: string[] = [];

  for (const slug of Object.keys(repositories)) {
    if (!activeSlugs.has(slug)) {
      delete repositories[slug];
      removedSlugs.push(slug);
    }
  }

  return removedSlugs;
}
