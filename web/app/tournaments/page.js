"use client";

import { useCallback, useEffect, useState } from "react";

const STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];

export default function TournamentsPage() {
  const [user, setUser] = useState(null);
  const [games, setGames] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [loadError, setLoadError] = useState("");
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    game_id: "",
    name: "",
    start_date: "",
    end_date: "",
  });
  const [creating, setCreating] = useState(false);

  const loadTournaments = useCallback(async () => {
    setLoadError("");
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (gameFilter) params.set("game_id", gameFilter);
    const qs = params.toString();
    const res = await fetch("/api/tournaments" + (qs ? "?" + qs : ""));
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setTournaments(data);
    else setLoadError((data && data.error) || "Failed to load tournaments");
  }, [statusFilter, gameFilter]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
    fetch("/api/games")
      .then((r) => (r.ok ? r.json() : []))
      .then(setGames)
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  async function createTournament(e) {
    e.preventDefault();
    setMsg(null);
    setCreating(true);
    const body = {
      game_id: Number(form.game_id),
      name: form.name,
      start_date: form.start_date,
    };
    if (form.end_date) body.end_date = form.end_date;
    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: "Tournament created: " + data.name });
        setForm({ game_id: "", name: "", start_date: "", end_date: "" });
        loadTournaments();
      } else {
        setMsg({ ok: false, text: data.error || "Could not create tournament" });
      }
    } catch {
      setMsg({ ok: false, text: "Network error" });
    }
    setCreating(false);
  }

  async function join(id) {
    setMsg(null);
    try {
      const res = await fetch("/api/tournaments/" + id + "/join", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg({ ok: true, text: "You joined the tournament." });
        loadTournaments();
      } else {
        setMsg({ ok: false, text: data.error || "Could not join" });
      }
    } catch {
      setMsg({ ok: false, text: "Network error" });
    }
  }

  const canCreate = user && (user.role === "admin" || user.role === "staff");
  const isPlayer = user && user.role === "player";

  return (
    <div className="stack">
      <h1>Tournaments</h1>

      {msg && <p className={msg.ok ? "success" : "error"}>{msg.text}</p>}

      {canCreate && (
        <div className="card">
          <h2>Create tournament</h2>
          <form className="form" onSubmit={createTournament}>
            <select
              value={form.game_id}
              onChange={(e) => setForm({ ...form, game_id: e.target.value })}
              required
            >
              <option value="">Select game</option>
              {games.map((g) => (
                <option key={g.game_id} value={g.game_id}>
                  {g.title}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Tournament name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              minLength={3}
              maxLength={100}
              required
            />
            <label>
              Start date
              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                required
              />
            </label>
            <label>
              End date (optional)
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </label>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create tournament"}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="row">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
          >
            <option value="">All games</option>
            {games.map((g) => (
              <option key={g.game_id} value={g.game_id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>

        {loadError && <p className="error">{loadError}</p>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Game</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th>Players</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.length === 0 ? (
                <tr>
                  <td colSpan={7}>No tournaments found.</td>
                </tr>
              ) : (
                tournaments.map((t) => (
                  <tr key={t.tournament_id}>
                    <td>{t.name}</td>
                    <td>{t.game}</td>
                    <td>{t.start_date}</td>
                    <td>{t.end_date || "-"}</td>
                    <td>{t.status}</td>
                    <td>{t.participants}</td>
                    <td>
                      {isPlayer && t.status === "upcoming" && (
                        <button
                          className="btn"
                          onClick={() => join(t.tournament_id)}
                        >
                          Join
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!user && (
          <p>
            <a href="/login">Log in</a> as a player to join a tournament.
          </p>
        )}
      </div>
    </div>
  );
}