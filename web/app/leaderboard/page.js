"use client";

import { useEffect, useMemo, useState } from "react";

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [game, setGame] = useState("");
  const [region, setRegion] = useState("");

  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load leaderboard");
        return r.json();
      })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const games = useMemo(
    () => [...new Set(rows.map((r) => r.game_title))].sort(),
    [rows]
  );
  const regions = useMemo(
    () => [...new Set(rows.map((r) => r.region))].sort(),
    [rows]
  );

  const visible = useMemo(() => {
    return rows
      .filter((r) => !game || r.game_title === game)
      .filter((r) => !region || r.region === region)
      .sort(
        (a, b) =>
          a.game_title.localeCompare(b.game_title) ||
          a.leaderboard_rank - b.leaderboard_rank
      );
  }, [rows, game, region]);

  async function onSearch(e) {
    e.preventDefault();
    setSearchError("");
    setResults(null);
    if (!q.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/players/search?q=" + encodeURIComponent(q.trim()));
      const data = await res.json().catch(() => null);
      if (res.status === 401) {
        setSearchError("Log in to search players.");
      } else if (!res.ok) {
        setSearchError((data && data.error) || "Search failed");
      } else {
        setResults(Array.isArray(data) ? data : []);
      }
    } catch {
      setSearchError("Could not reach the server");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Leaderboard</h1>
        <p>Top players by ELO rating, ranked within each game.</p>
      </div>

      <div className="row">
        <select value={game} onChange={(e) => setGame(e.target.value)}>
          <option value="">All games</option>
          {games.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <p>Loading...</p>
        ) : visible.length === 0 ? (
          <p>No players match these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Game</th>
                <th>Region</th>
                <th>ELO</th>
                <th>Tier</th>
                <th>W / L</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.game_title + "-" + r.player_id}>
                  <td>#{r.leaderboard_rank}</td>
                  <td>{r.display_name}</td>
                  <td>{r.game_title}</td>
                  <td>{r.region}</td>
                  <td>{r.elo_rating}</td>
                  <td>{r.rank_tier}</td>
                  <td>
                    {r.wins} / {r.losses}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div>
        <h2>Find a player</h2>
        <form className="row" onSubmit={onSearch}>
          <input
            placeholder="Search by display name"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
        {searchError && <div className="error" style={{ marginTop: "0.75rem" }}>{searchError}</div>}
        {results && (
          <div className="card table-wrap" style={{ marginTop: "0.75rem" }}>
            {results.length === 0 ? (
              <p>No players found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Region</th>
                    <th>Game</th>
                    <th>ELO</th>
                    <th>Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={r.player_id + "-" + r.game + "-" + i}>
                      <td>{r.display_name}</td>
                      <td>{r.region}</td>
                      <td>{r.game}</td>
                      <td>{r.elo_rating}</td>
                      <td>{r.rank_tier}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
