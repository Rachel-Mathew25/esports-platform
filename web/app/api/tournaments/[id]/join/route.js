import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// POST /api/tournaments/[id]/join  (player only)
export async function POST(request, { params }) {
  const auth = await requireRole(request, ["player"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) <= 0)
    return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
  const tournamentId = Number(id);
  const playerId = Number(auth.session.id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Lock the tournament row so its status cannot change while we register.
    const [tournaments] = await conn.execute(
      "SELECT tournament_id, game_id, status FROM tournaments WHERE tournament_id = ? FOR UPDATE",
      [tournamentId]
    );
    if (tournaments.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tournament = tournaments[0];

    if (tournament.status !== "upcoming") {
      await conn.rollback();
      return NextResponse.json(
        { error: "Registration is closed: tournament is " + tournament.status },
        { status: 409 }
      );
    }

    const [existing] = await conn.execute(
      "SELECT player_id FROM tournament_participants WHERE tournament_id = ? AND player_id = ?",
      [tournamentId, playerId]
    );
    if (existing.length > 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Already registered" }, { status: 409 });
    }

    // Make sure the player has a rating row for this game (defaults fill the rest).
    await conn.execute(
      "INSERT IGNORE INTO player_game_stats (player_id, game_id) VALUES (?, ?)",
      [playerId, tournament.game_id]
    );

    await conn.execute(
      "INSERT INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)",
      [tournamentId, playerId]
    );

    await conn.commit();
    return NextResponse.json(
      { tournament_id: tournamentId, player_id: playerId, registered: true },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY")
      return NextResponse.json({ error: "Already registered" }, { status: 409 });
    if (err.code === "ER_NO_REFERENCED_ROW_2")
      return NextResponse.json({ error: "No player profile for this account" }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}