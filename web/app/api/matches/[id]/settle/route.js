import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function POST(request, { params }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const matchId = Number.parseInt(id, 10);
  if (!Number.isInteger(matchId) || matchId <= 0)
    return NextResponse.json({ error: "Invalid match id" }, { status: 400 });

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body || !("winning_team" in body))
    return NextResponse.json(
      { error: "winning_team is required (1, 2, or null for a draw)" },
      { status: 400 }
    );

  const winningTeam = body.winning_team;
  if (![1, 2, null].includes(winningTeam))
    return NextResponse.json(
      { error: "winning_team must be 1, 2, or null" },
      { status: 400 }
    );

  try {
    await pool.query("CALL sp_settle_match(?, ?)", [matchId, winningTeam]);
    const [results] = await pool.query(
      `SELECT h.player_id, p.display_name, h.old_elo, h.new_elo, h.elo_change
       FROM elo_history h
       JOIN players p ON p.player_id = h.player_id
       WHERE h.match_id = ?
       ORDER BY h.elo_change DESC`,
      [matchId]
    );
    return NextResponse.json({ message: "Match settled", match_id: matchId, results });
  } catch (err) {
    if (err.errno === 1644) {
      const msg = err.sqlMessage || err.message;
      const status = /not found/i.test(msg) ? 404 : /already/i.test(msg) ? 409 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
