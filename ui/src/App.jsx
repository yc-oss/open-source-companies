import { useState, useMemo } from "react";
import data from "./repositories_with_batch.json";

export default function App() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("stars");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Filter states
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedStarRanges, setSelectedStarRanges] = useState([]);
  const [selectedForkRanges, setSelectedForkRanges] = useState([]);
  const [selectedIssueRanges, setSelectedIssueRanges] = useState([]);
  
  // Range definitions
  const starRanges = [
    { label: "0-100", min: 0, max: 100 },
    { label: "100-1K", min: 100, max: 1000 },
    { label: "1K-10K", min: 1000, max: 10000 },
    { label: "10K-100K", min: 10000, max: 100000 },
    { label: "100K+", min: 100000, max: Infinity },
  ];
  
  const forkRanges = [
    { label: "0-100", min: 0, max: 100 },
    { label: "100-1K", min: 100, max: 1000 },
    { label: "1K-10K", min: 1000, max: 10000 },
    { label: "10K+", min: 10000, max: Infinity },
  ];
  
  const issueRanges = [
    { label: "0-100", min: 0, max: 100 },
    { label: "100-500", min: 100, max: 500 },
    { label: "500-1K", min: 500, max: 1000 },
    { label: "1K-5K", min: 1000, max: 5000 },
    { label: "5K+", min: 5000, max: Infinity },
  ];

  // Convert object → array
  const repos = useMemo(() => {
    return Object.entries(data).map(([name, value]) => ({
      name,
      ...value,
    }));
  }, []);

  // Parse batch to extract season and year
  const parseBatch = (batch) => {
    if (!batch) return { year: 0, season: 0 };
    
    const match = batch.match(/^(Winter|Spring|Summer|Fall|Autumn)\s+(\d+)$/i);
    if (!match) return { year: 0, season: 0 };
    
    const [, season, year] = match;
    const yearNum = parseInt(year, 10);
    
    let seasonNum = 0;
    const seasonLower = season.toLowerCase();
    if (seasonLower === "winter") seasonNum = 1;
    else if (seasonLower === "spring") seasonNum = 2;
    else if (seasonLower === "summer") seasonNum = 3;
    else if (seasonLower === "fall" || seasonLower === "autumn") seasonNum = 4;
    
    return { year: yearNum, season: seasonNum };
  };

  // Extract unique batches and sort them
  const sortedBatches = useMemo(() => {
    const uniqueBatches = [...new Set(repos.map((r) => r.batch).filter(Boolean))];
    return uniqueBatches.sort((a, b) => {
      const aVal = parseBatch(a);
      const bVal = parseBatch(b);
      
      if (aVal.year !== bVal.year) return aVal.year - bVal.year;
      return aVal.season - bVal.season;
    });
  }, [repos]);

  // Filtering + sorting
  const filtered = useMemo(() => {
    let result = repos;

    // search filter
    if (search) {
      result = result.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    // batch filter
    if (selectedBatches.length > 0) {
      result = result.filter((r) => selectedBatches.includes(r.batch));
    }

    // star ranges filter
    if (selectedStarRanges.length > 0) {
      result = result.filter((r) => {
        const stars = r.github_repo?.stargazers_count || 0;
        return selectedStarRanges.some(
          (range) => stars >= range.min && stars < range.max
        );
      });
    }

    // fork ranges filter
    if (selectedForkRanges.length > 0) {
      result = result.filter((r) => {
        const forks = r.github_repo?.forks_count || 0;
        return selectedForkRanges.some(
          (range) => forks >= range.min && forks < range.max
        );
      });
    }

    // issues ranges filter
    if (selectedIssueRanges.length > 0) {
      result = result.filter((r) => {
        const issues = r.github_repo?.open_issues_count || 0;
        return selectedIssueRanges.some(
          (range) => issues >= range.min && issues < range.max
        );
      });
    }

    // sorting
    const isAsc = sortOrder === "asc";
    
    if (sortBy === "stars") {
      result = [...result].sort(
        (a, b) => {
          const comparison = (b.github_repo?.stargazers_count || 0) -
            (a.github_repo?.stargazers_count || 0);
          return isAsc ? -comparison : comparison;
        }
      );
    } else if (sortBy === "forks") {
      result = [...result].sort(
        (a, b) => {
          const comparison = (b.github_repo?.forks_count || 0) -
            (a.github_repo?.forks_count || 0);
          return isAsc ? -comparison : comparison;
        }
      );
    } else if (sortBy === "issues") {
      result = [...result].sort(
        (a, b) => {
          const comparison = (b.github_repo?.open_issues_count || 0) -
            (a.github_repo?.open_issues_count || 0);
          return isAsc ? -comparison : comparison;
        }
      );
    } else if (sortBy === "batch") {
      result = [...result].sort((a, b) => {
        const aVal = parseBatch(a.batch);
        const bVal = parseBatch(b.batch);
        
        let comparison = 0;
        if (aVal.year !== bVal.year) comparison = aVal.year - bVal.year;
        else comparison = aVal.season - bVal.season;
        
        return isAsc ? -comparison : comparison;
      });
    }

    return result;
  }, [repos, search, selectedBatches, selectedStarRanges, selectedForkRanges, selectedIssueRanges, sortBy, sortOrder]);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Open Source Companies</h1>

      {/* Search */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px", width: "300px", fontSize: "14px" }}
        />
      </div>

      {/* Sorting Controls */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="stars">Sort by Stars</option>
          <option value="forks">Sort by Forks</option>
          <option value="issues">Sort by Issues</option>
          <option value="batch">Sort by Batch</option>
        </select>

        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {/* Filters Section */}
      <div style={{ marginBottom: "30px", padding: "15px", border: "1px solid #ddd", borderRadius: "4px" }}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>

        {/* Batch Filter */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ marginBottom: "8px" }}>Batch</h4>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {sortedBatches.map((batch) => (
              <label key={batch} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={selectedBatches.includes(batch)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedBatches([...selectedBatches, batch]);
                    } else {
                      setSelectedBatches(selectedBatches.filter(b => b !== batch));
                    }
                  }}
                />
                {batch}
              </label>
            ))}
          </div>
        </div>

        {/* Stars Filter */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ marginBottom: "8px" }}>Stars</h4>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {starRanges.map((range, idx) => (
              <label key={idx} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={selectedStarRanges.some(r => r.label === range.label)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStarRanges([...selectedStarRanges, range]);
                    } else {
                      setSelectedStarRanges(selectedStarRanges.filter(r => r.label !== range.label));
                    }
                  }}
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>

        {/* Forks Filter */}
        <div style={{ marginBottom: "20px" }}>
          <h4 style={{ marginBottom: "8px" }}>Forks</h4>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {forkRanges.map((range, idx) => (
              <label key={idx} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={selectedForkRanges.some(r => r.label === range.label)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedForkRanges([...selectedForkRanges, range]);
                    } else {
                      setSelectedForkRanges(selectedForkRanges.filter(r => r.label !== range.label));
                    }
                  }}
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>

        {/* Issues Filter */}
        <div>
          <h4 style={{ marginBottom: "8px" }}>Issues</h4>
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {issueRanges.map((range, idx) => (
              <label key={idx} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <input
                  type="checkbox"
                  checked={selectedIssueRanges.some(r => r.label === range.label)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIssueRanges([...selectedIssueRanges, range]);
                    } else {
                      setSelectedIssueRanges(selectedIssueRanges.filter(r => r.label !== range.label));
                    }
                  }}
                />
                {range.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: "10px" }}>
        Showing {filtered.length} / {repos.length}
      </p>

      {/* Table */}
      <table border="1" cellPadding="8" cellSpacing="0">
        <thead>
          <tr>
            <th>Name</th>
            <th>Batch</th>
            <th>Stars</th>
            <th>Forks</th>
            <th>Issues</th>
            <th>Repo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((repo) => (
            <tr key={repo.name}>
              <td>{repo.name}</td>
              <td>{repo.batch || "-"}</td>
              <td>{repo.github_repo?.stargazers_count ?? "-"}</td>
              <td>{repo.github_repo?.forks_count ?? "-"}</td>
              <td>{repo.github_repo?.open_issues_count ?? "-"}</td>
              <td>
                <a href={repo.url} target="_blank">
                  Link
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginTop: "10px" }}>
        Showing {filtered.length} / {repos.length}
      </p>
    </div>
  );
}
