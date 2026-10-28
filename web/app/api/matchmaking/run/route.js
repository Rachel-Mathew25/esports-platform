import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function POST(request) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body = {};
  try {
    body = (await request.json()) || {};
  } catch {
    body = {};
  }

  let eloRange = 200;
  if (body.elo_range !== undefined) {
    eloRange = Number(body.elo_range);
    if (!Number.isInteger(eloRange) || eloRange < 0 || eloRange > 3000)
      return NextResponse.json({ error: "elo_range must be an integer 0-3000" }, { status: 400 });
  }

  let gameFilter = "";
  const params = [];
  if (body.game_id !== undefined) {
    const gameId = Number.parseInt(body.game_id, 10);
    if (!Number.isInteger(gameId) || gameId <= 0)
      return NextResponse.json({ error: "game_id must be a positive integer" }, { status: 400 });
    gameFilter = "AND q.game_id = ?";
    params.push(gameId);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT q.queue_id, q.player_id, q.game_id, g.title, g.team_size,
              COALESCE(s.elo_rating, 1000) AS elo
       FROM matchmaking_queue q
       JOIN games g ON g.game_id = q.game_id AND g.is_active = 1
       LEFT JOIN player_game_stats s ON s.player_id = q.player_id AND s.game_id = q.game_id
       WHERE q.status = 'waiting' ${gameFilter}
       ORDER BY q.game_id, elo DESC, q.queued_at
       FOR UPDATE OF q`,
      params
    );

    const byGame = new Map();
    for (const r of rows) {
      if (!byGame.has(r.game_id)) byGame.set(r.game_id, []);
      byGame.get(r.game_id).push(r);
    }

    const created = [];
    const matchedQueueIds = [];

    for (const list of byGame.values()) {
      const size = list[0].team_size * 2;
      let i = 0;
      while (i + size <= list.length) {
        const group = list.slice(i, i + size);
        if (group[0].elo - group[size - 1].elo > eloRange) {
          i += 1;
          continue;
        }
        const [m] = await conn.execute(
          "INSERT INTO matches (game_id, match_type, status, started_at) VALUES (?, 'ranked', 'in_progress', NOW())",
          [group[0].game_id]
        );
        const teams = { 1: [], 2: [] };
        for (let idx = 0; idx < group.length; idx++) {
          const p = group[idx];
          const team = idx % 4 === 0 || idx % 4 === 3 ? 1 : 2;
          await conn.execute(
            "INSERT INTO match_players (match_id, player_id, team_number, elo_before) VALUES (?, ?, ?, ?)",
            [m.insertId, p.player_id, team, p.elo]
          );
          teams[team].push({ player_id: p.player_id, elo: p.elo });
          matchedQueueIds.push(p.queue_id);
        }
        created.push({ match_id: m.insertId, game: group[0].title, team1: teams[1], team2: teams[2] });
        i += size;
      }
    }

    if (matchedQueueIds.length > 0)
      await conn.query("UPDATE matchmaking_queue SET status = 'matched' WHERE queue_id IN (?)", [
        matchedQueueIds,
      ]);

    await conn.commit();
    return NextResponse.json({
      elo_range: eloRange,
      matches_created: created.length,
      players_unmatched: rows.length - matchedQueueIds.length,
      matches: created,
    });
  } catch (err) {
    console.error("matchmaking error:", err);
    await conn.rollback();
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
