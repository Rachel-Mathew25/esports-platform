import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// GET /api/tournaments/mine  (player only): ids of tournaments the player joined
export async function GET(request) {
  const auth = await requireRole(request, ["player"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const [rows] = await pool.execute(
      "SELECT tournament_id FROM tournament_participants WHERE player_id = ?",
      [Number(auth.session.id)]
    );
    return NextResponse.json(rows.map((r) => r.tournament_id));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}