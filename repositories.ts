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
