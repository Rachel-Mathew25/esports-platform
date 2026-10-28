"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);
  const [games, setGames] = useState([]);

  const [eloRange, setEloRange] = useState("200");
  const [mmGame, setMmGame] = useState("");
  const [mmResult, setMmResult] = useState(null);
  const [mmBusy, setMmBusy] = useState(false);

  const [matches, setMatches] = useState([]);
  const [settleMsg, setSettleMsg] = useState(null);

  const [kills, setKills] = useState([]);
  const [killsMatch, setKillsMatch] = useState("");
  const [killsError, setKillsError] = useState("");

  const [ev, setEv] = useState({
    match_id: "",
    player_id: "",
    type: "kill",
    weapon: "",
    headshot: false,
  });
  const [evMsg, setEvMsg] = useState(null);

  const loadMatches = useCallback(async () => {
    const res = await fetch("/api/matches");
    if (res.ok) setMatches(await res.json());
  }, []);

  const loadKills = useCallback(async (matchId) => {
    setKillsError("");
    const qs = matchId ? "?match_id=" + encodeURIComponent(matchId) : "";
    const res = await fetch("/api/analytics/kills" + qs);
    const data = await res.json().catch(() => ({}));
    if (res.ok) setKills(data.results || []);
    else setKillsError(data.error || "Failed to load analytics");
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) {
          router.push("/login");
          return;
        }
        if (u.role !== "admin" && u.role !== "staff") {
          setAllowed(false);
          return;
        }
        setAllowed(true);
        loadMatches();
        loadKills("");
        fetch("/api/games")
          .then((r) => (r.ok ? r.json() : []))
          .then(setGames)
          .catch(() => {});
      })
      .catch(() => setAllowed(false));
  }, [router, loadMatches, loadKills]);

  async function runMatchmaking(e) {
    e.preventDefault();
    setMmBusy(true);
    setMmResult(null);
    const body = { elo_range: Number(eloRange) };
    if (mmGame) body.game_id = Number(mmGame);
    try {
      const res = await fetch("/api/matchmaking/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      setMmResult({ ok: res.ok, data });
      if (res.ok) await loadMatches();
    } catch {
      setMmResult({ ok: false, data: { error: "Could not reach the server" } });
    } finally {
      setMmBusy(false);
    }
  }

  async function settle(matchId, winningTeam) {
    setSettleMsg(null);
    const res = await fetch("/api/matches/" + matchId + "/settle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ winning_team: winningTeam }),
    });
    const data = await res.json().catch(() => ({}));
    setSettleMsg({
      ok: res.ok,
      text: res.ok
        ? "Match " + matchId + " settled. " + (data.message || "")
        : data.error || "Settle failed",
    });
    await loadMatches();
  }

  async function recordEvent(e) {
    e.preventDefault();
    setEvMsg(null);
    const body = {
      player_id: Number(ev.player_id),
      type: ev.type,
    };
    if (ev.weapon.trim()) body.weapon = ev.weapon.trim();
    if (ev.headshot) body.meta = { headshot: true };
    const res = await fetch("/api/matches/" + Number(ev.match_id) + "/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setEvMsg({
      ok: res.ok,
      text: res.ok ? data.message || "Event recorded" : data.error || "Failed",
    });
    if (res.ok) await loadKills(killsMatch);
  }

  function setE(field) {
    return (e) =>
      setEv({
        ...ev,
        [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      });
  }

  if (allowed === null) return <p>Loading...</p>;
  if (allowed === false)
    return <div className="error">This page is for admin and staff accounts.</div>;

  return (
    <div className="stack">
      <div>
        <h1>Admin console</h1>
        <p>Run matchmaking, settle matches, and record in-game events.</p>
      </div>

      <div>
        <h2>Run matchmaking</h2>
        <form className="card row" onSubmit={runMatchmaking}>
          <label className="nav-user">
            ELO range
            <input
              type="number"
              min="0"
              max="3000"
              value={eloRange}
              onChange={(e) => setEloRange(e.target.value)}
              style={{ width: 100, marginLeft: 8 }}
            />
          </label>
          <select value={mmGame} onChange={(e) => setMmGame(e.target.value)}>
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.game_id} value={g.game_id}>
                {g.title}
              </option>
            ))}
          </select>
          <button className="btn" type="submit" disabled={mmBusy}>
            {mmBusy ? "Running..." : "Run matchmaking"}
          </button>
        </form>
        {mmResult && (
          <div className="card" style={{ marginTop: "0.75rem" }}>
            <div className={mmResult.ok ? "success" : "error"}>
              {mmResult.ok ? "Matchmaking finished" : mmResult.data.error || "Failed"}
            </div>
            <pre style={{ color: "var(--muted)", fontSize: "0.8rem", overflowX: "auto", marginTop: 8 }}>
              {JSON.stringify(mmResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div>
        <h2>Open matches</h2>
        {settleMsg && (
          <div className={settleMsg.ok ? "success" : "error"} style={{ marginBottom: 8 }}>
            {settleMsg.text}
          </div>
        )}
        <div className="card table-wrap">
          {matches.length === 0 ? (
            <p>No open matches. Run matchmaking to create one.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Game</th>
                  <th>Team 1</th>
                  <th>Team 2</th>
                  <th>Settle</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.match_id}>
                    <td>#{m.match_id}</td>
                    <td>{m.game_title}</td>
                    <td>{m.team1 || "-"}</td>
                    <td>{m.team2 || "-"}</td>
                    <td>
                      <div className="row">
                        <button className="btn" onClick={() => settle(m.match_id, 1)}>
                          Team 1 wins
                        </button>
                        <button className="btn" onClick={() => settle(m.match_id, 2)}>
                          Team 2 wins
                        </button>
                        <button className="btn btn-secondary" onClick={() => settle(m.match_id, null)}>
                          Draw
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div>
        <h2>Record match event (MongoDB)</h2>
        <form className="card row" onSubmit={recordEvent}>
          <input
            type="number"
            placeholder="Match id"
            value={ev.match_id}
            onChange={setE("match_id")}
            required
            style={{ width: 110 }}
          />
          <input
            type="number"
            placeholder="Player id"
            value={ev.player_id}
            onChange={setE("player_id")}
            required
            style={{ width: 110 }}
          />
          <select value={ev.type} onChange={setE("type")}>
            <option value="kill">kill</option>
            <option value="death">death</option>
            <option value="assist">assist</option>
          </select>
          <input placeholder="Weapon (optional)" value={ev.weapon} onChange={setE("weapon")} />
          <label className="nav-user">
            <input type="checkbox" checked={ev.headshot} onChange={setE("headshot")} /> headshot
          </label>
          <button className="btn" type="submit">
            Record
          </button>
        </form>
        {evMsg && (
          <div className={evMsg.ok ? "success" : "error"} style={{ marginTop: 8 }}>
            {evMsg.text}
          </div>
        )}
      </div>

      <div>
        <h2>Kills analytics (MongoDB aggregation)</h2>
        <form
          className="row"
          style={{ marginBottom: "0.75rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            loadKills(killsMatch);
          }}
        >
          <input
            type="number"
            placeholder="Match id (blank = all)"
            value={killsMatch}
            onChange={(e) => setKillsMatch(e.target.value)}
          />
          <button className="btn btn-secondary" type="submit">
            Refresh
          </button>
        </form>
        {killsError && <div className="error">{killsError}</div>}
        <div className="card table-wrap">
          {kills.length === 0 ? (
            <p>No events recorded.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Kills</th>
                  <th>Headshots</th>
                  <th>HS %</th>
                  <th>Matches</th>
                </tr>
              </thead>
              <tbody>
                {kills.map((k) => (
                  <tr key={k.player_id}>
                    <td>{k.display_name}</td>
                    <td>{k.kills}</td>
                    <td>{k.headshots}</td>
                    <td>{k.headshot_pct}%</td>
                    <td>{k.matches_played}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
