import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireRole(request, ["player"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const playerId = Number(auth.session.id);

  const [players] = await pool.query(
    "SELECT player_id, display_name, region, country, date_joined FROM players WHERE player_id = ?",
    [playerId]
  );
  if (players.length === 0) {
    return NextResponse.json({ error: "Player profile not found" }, { status: 404 });
  }

  const [stats] = await pool.query(
    `SELECT g.game_id, g.title AS game_title, s.elo_rating, s.rank_tier,
            s.matches_played, s.wins, s.losses, s.draws, s.last_played_at
       FROM player_game_stats s
       JOIN games g ON g.game_id = s.game_id
      WHERE s.player_id = ?
      ORDER BY s.elo_rating DESC`,
    [playerId]
  );

  const [history] = await pool.query(
    `SELECT h.history_id, h.match_id, g.title AS game_title,
            h.old_elo, h.new_elo, h.elo_change
       FROM elo_history h
       JOIN games g ON g.game_id = h.game_id
      WHERE h.player_id = ?
      ORDER BY h.history_id DESC
      LIMIT 20`,
    [playerId]
  );

  const [queue] = await pool.query(
    `SELECT q.queue_id, g.title AS game_title, q.queued_at
       FROM matchmaking_queue q
       JOIN games g ON g.game_id = q.game_id
      WHERE q.player_id = ? AND q.status = 'waiting'`,
    [playerId]
  );

  return NextResponse.json({ player: players[0], stats, history, waiting_in: queue });
}
