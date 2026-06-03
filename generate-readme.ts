import _repositories from "./repositories.json" with { type: "json" };
import {
  type Company,
  type GitHubRepo,
  pruneStaleRepositories,
  type Repository,
} from "./repositories.ts";

const companiesResponse = await fetch(
  "https://yc-oss.github.io/api/tags/open-source.json",
);
if (!companiesResponse.ok) {
  throw new Error(
    `Failed to fetch YC OSS companies: ${companiesResponse.status}`,
  );
}
const companies = await companiesResponse.json() as Company[];
const repositories = _repositories as Record<string, Repository>;

for (const slug of pruneStaleRepositories(repositories, companies)) {
  console.warn(
    `Removing stale repository entry for ${slug}; company is no longer in YC OSS API.`,
  );
}

const githubToken = Deno.env.get("GITHUB_TOKEN");
const serperToken = Deno.env.get("SERPER_TOKEN");

const readme = await Deno.readTextFile("README.md");
let text = `<!--start generated readme-->\n`;
text +=
  `| Logo | Company | Batch | API | Website | Repo | Stars |\n| --------------- | ------------ | ------------ | ------------ | ------------ | ------------ | ------------ |\n`;
for (const company of companies) {
  let repository = repositories[company.slug];

  // Try and find the GitHub repository for this company.
  if (!repository && githubToken && serperToken) {
    console.log(`Searching for ${company.name} on GitHub via Google`);
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": serperToken,
      },
      body: JSON.stringify({
        q: `site:github.com ${company.name} ${company.one_liner}`,
      }),
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(
        `Serper search failed for ${company.slug}: ${res.status}`,
      );
    }

    const json = (await res.json()) as { organic?: { link: string }[] };
    // Find the first GitHub repository https://github.com/{owner}/{github_repo}
    const result = json.organic?.find((result) =>
      result.link.includes("github.com")
    );
    if (result) {
      console.log(`Found ${result.link}`);
      const parts = new URL(result.link).pathname.split("/");
      if (parts.length >= 3) {
        repositories[company.slug] = {
          url: `https://github.com/${parts[1]}/${parts[2]}`,
        };
        console.log(
          `Added ${repositories[company.slug].url} to repositories.json`,
        );
        repository = repositories[company.slug];
      } else console.log(`Parts ${parts} for URL ${result.link}`);
    }
  }

  // Find counts for repository if it exists.
  if (repository?.url && githubToken) {
    const githubApiUrl = `https://api.github.com/repos${
      new URL(repository.url).pathname
    }`;
    console.log(`Fetching GitHub repo details for ${githubApiUrl}`);
    const res = await fetch(githubApiUrl, {
      headers: { Authorization: `Bearer ${githubToken}` },
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 404) {
        console.warn(
          `GitHub repo not found for ${company.slug} (${repository.url}); removing stale repository entry.`,
        );
        delete repositories[company.slug];
        continue;
      }
      throw new Error(
        `GitHub repo lookup failed for ${company.slug} (${repository.url}): ${res.status} ${body}`,
      );
    }

    const json = await res.json() as GitHubRepo;
    repositories[company.slug] = {
      ...repository,
      url: json.html_url ?? repository.url,
      github_repo: {
        stargazers_count: json.stargazers_count,
        watchers_count: json.watchers_count,
        forks_count: json.forks_count,
        open_issues_count: json.open_issues_count,
        network_count: json.network_count,
        subscribers_count: json.subscribers_count,
      },
    };
    repository = repositories[company.slug];
  }

  company.stars_count = repository?.url
    ? repository.github_repo?.stargazers_count ?? 0
    : 0;
}

for (
  const company of companies.sort((a, b) => {
    if (a.stars_count === b.stars_count) return a.name.localeCompare(b.name);
    return (b.stars_count ?? 0) - (a.stars_count ?? 0);
  })
) {
  const repository = repositories[company.slug];
  text +=
    `| <img alt="" src="${company.small_logo_thumb_url}" height="32"> | ${company.name} | ${company.batch} | [API](${company.api}) | [Website](${company.website}) | ${
      repository?.url
        ? `[${
          new URL(repository.url).pathname.replace("/", "")
        }](${repository.url})`
        : ""
    } | ${
      repository?.github_repo?.stargazers_count && repository.url
        ? `${
          repository.github_repo.stargazers_count.toLocaleString("en-US")
        } <img alt="" src="https://api.star-history.com/svg?repos=${
          new URL(repository.url).pathname.replace("/", "")
        }" height="32">`
        : ""
    } \n`;
}
text += `<!--end generated readme-->\n`;

const newReadme = readme.split("<!--start generated readme-->")[0] +
  text +
  readme.split("<!--end generated readme-->")[1];

await Deno.writeTextFile("README.md", newReadme);
await Deno.writeTextFile(
  "repositories.json",
  JSON.stringify(repositories, null, 2) + "\n",
);

export {};
