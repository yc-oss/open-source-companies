import json
import re


# -------- Step 1: Normalize GitHub URLs --------
def normalize_github_url(url):
    if not url:
        return None

    url = url.strip().lower()

    # remove protocol
    url = re.sub(r"https?://", "", url)

    # keep only github.com/org/repo
    if "github.com/" in url:
        url = url.split("github.com/")[-1]
        url = "github.com/" + url

    # remove query params
    url = url.split("?")[0]

    # remove trailing slash
    url = url.rstrip("/")

    # keep only github.com/org/repo
    parts = url.split("/")
    if len(parts) >= 3:
        url = "/".join(parts[:3])

    return url


# -------- Step 2: Normalize company names --------
def normalize_name(name):
    return name.lower().strip().replace(" ", "-")


# -------- Step 3: Extract mappings from markdown --------
def extract_mappings(md_file):
    repo_to_batch = {}
    name_to_batch = {}

    with open(md_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    for line in lines:
        if not line.strip().startswith("|"):
            continue
        if "Company" in line or "---" in line:
            continue

        cols = [c.strip() for c in line.split("|")]

        if len(cols) < 7:
            continue

        company = cols[2]
        batch = cols[3]
        repo_col = cols[6]

        # store name mapping
        if company:
            name_key = normalize_name(company)
            name_to_batch[name_key] = batch

        # extract GitHub URL
        match = re.search(r"\((https://github\.com/[^\)]+)\)", repo_col)
        if match:
            repo_url = normalize_github_url(match.group(1))
            repo_to_batch[repo_url] = batch

    return repo_to_batch, name_to_batch


# -------- Step 4: Merge --------
def add_batches_to_repos(repo_file, md_file, output_file):
    with open(repo_file, "r", encoding="utf-8") as f:
        repos = json.load(f)

    repo_to_batch, name_to_batch = extract_mappings(md_file)

    matched_url = 0
    matched_name = 0
    missed = 0

    for key, value in repos.items():
        repo_url = normalize_github_url(value.get("url"))

        # ---- Primary: URL match ----
        if repo_url in repo_to_batch:
            value["batch"] = repo_to_batch[repo_url]
            matched_url += 1
            continue

        # ---- Fallback: Name match ----
        name_key = normalize_name(key)

        if name_key in name_to_batch:
            value["batch"] = name_to_batch[name_key]
            matched_name += 1
            continue

        # ---- Miss ----
        value["batch"] = None
        missed += 1
        print(f"MISS → key: {key}, url: {repo_url}")

    # write output
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(repos, f, indent=2)

    print("\n--- Summary ---")
    print(f"URL matched   : {matched_url}")
    print(f"Name matched  : {matched_name}")
    print(f"Missed        : {missed}")
    print(f"Total         : {len(repos)}")
    print(f"Output written to {output_file}")


# -------- Run --------
if __name__ == "__main__":
    add_batches_to_repos(
        "repositories.json",
        "companies.md",
        "repositories_with_batch.json"
    )
