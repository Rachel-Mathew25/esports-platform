import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function POST(request) {
  const auth = await requireRole(request, ["player"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const gameId = Number.parseInt(body?.game_id, 10);
  if (!Number.isInteger(gameId) || gameId <= 0)
    return NextResponse.json({ error: "game_id is required" }, { status: 400 });

  const playerId = Number(auth.session.id);

  try {
    const [games] = await pool.execute(
      "SELECT game_id, title FROM games WHERE game_id = ? AND is_active = 1",
      [gameId]
    );
    if (games.length === 0)
      return NextResponse.json({ error: "Game not found or inactive" }, { status: 404 });

    const [waiting] = await pool.execute(
      "SELECT queue_id FROM matchmaking_queue WHERE player_id = ? AND game_id = ? AND status = 'waiting'",
      [playerId, gameId]
    );
    if (waiting.length > 0)
      return NextResponse.json({ error: "Already waiting in this queue" }, { status: 409 });

    const [result] = await pool.execute(
      "INSERT INTO matchmaking_queue (player_id, game_id) VALUES (?, ?)",
      [playerId, gameId]
    );
    return NextResponse.json(
      { queue_id: result.insertId, player_id: playerId, game: games[0].title, status: "waiting" },
      { status: 201 }
    );
  } catch (err) {
    if (err.code === "ER_NO_REFERENCED_ROW_2")
      return NextResponse.json({ error: "No player profile for this account" }, { status: 400 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
