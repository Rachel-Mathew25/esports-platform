"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/players/me");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (res.status === 403) {
        setError(
          "This page is for player accounts. Admin and staff accounts have no player profile."
        );
        return;
      }
      if (!res.ok) {
        setError("Failed to load your profile");
        return;
      }
      setData(await res.json());
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    fetch("/api/games")
      .then((r) => (r.ok ? r.json() : []))
      .then((g) => {
        setGames(g);
        if (g.length) setGameId(String(g[0].game_id));
      })
      .catch(() => {});
  }, [load]);

  async function joinQueue(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch("/api/queue/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: Number(gameId) }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsgOk(true);
        setMsg(body.message || "Joined the queue");
        await load();
      } else {
        setMsgOk(false);
        setMsg(body.error || "Could not join the queue");
      }
    } catch {
      setMsgOk(false);
      setMsg("Could not reach the server");
    } finally {
      setBusy(false);
    }
  }

  async function cancelWait(queueId) {
    setMsg("");
    try {
      const res = await fetch("/api/queue/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue_id: queueId }),
      });
      const body = await res.json().catch(() => ({}));
      setMsgOk(res.ok);
      setMsg(res.ok ? body.message || "Left the queue" : body.error || "Could not leave the queue");
      if (res.ok) await load();
    } catch {
      setMsgOk(false);
      setMsg("Could not reach the server");
    }
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <div className="error">{error}</div>;
  if (!data) return null;

  const { player, stats, history, waiting_in } = data;

  return (
    <div className="stack">
      <div>
        <h1>{player.display_name}</h1>
        <p>
          {player.region}
          {player.country ? " / " + player.country : ""} - joined{" "}
          {new Date(player.date_joined).toLocaleDateString()}
        </p>
      </div>

      <div>
        <h2>Your ratings</h2>
        {stats.length === 0 ? (
          <p>No ratings yet. Join a queue to get your first one.</p>
        ) : (
          <div className="grid">
            {stats.map((s) => (
              <div className="card" key={s.game_id}>
                <p>{s.game_title}</p>
                <h1>{s.elo_rating}</h1>
                <p>
                  {s.rank_tier} - {s.wins}W / {s.losses}L
                  {s.draws ? " / " + s.draws + "D" : ""} ({s.matches_played} played)
                </p>
                <p>Last played {fmt(s.last_played_at)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2>Matchmaking queue</h2>
        <div className="card stack">
          <form className="row" onSubmit={joinQueue}>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
              {games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  {g.title}
                </option>
              ))}
            </select>
            <button className="btn" type="submit" disabled={busy || !gameId}>
              {busy ? "Joining..." : "Join queue"}
            </button>
          </form>
          {msg && <div className={msgOk ? "success" : "error"}>{msg}</div>}
          {waiting_in.length === 0 ? (
            <p>You are not waiting in any queue.</p>
          ) : (
            <ul style={{ paddingLeft: "1.25rem", color: "var(--muted)" }}>
              {waiting_in.map((w) => (
                <li key={w.queue_id} style={{ marginBottom: 6 }}>
                  Waiting for {w.game_title} since {fmt(w.queued_at)}{" "}
                  <button className="btn btn-secondary" type="button" onClick={() => cancelWait(w.queue_id)}>
                    Leave queue
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2>ELO history</h2>
        <div className="card table-wrap">
          {history.length === 0 ? (
            <p>No rated matches yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Game</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.history_id}>
                    <td>#{h.match_id}</td>
                    <td>{h.game_title}</td>
                    <td>{h.old_elo}</td>
                    <td>{h.new_elo}</td>
                    <td className={h.elo_change >= 0 ? "pos" : "neg"}>
                      {h.elo_change > 0 ? "+" : ""}
                      {h.elo_change}
                    </td>
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
