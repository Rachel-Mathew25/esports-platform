import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const [rows] = await pool.query(
    `SELECT m.match_id, g.title AS game_title, m.match_type, m.status, m.started_at,
            GROUP_CONCAT(CASE WHEN mp.team_number = 1 THEN p.display_name END
                         ORDER BY p.display_name SEPARATOR ', ') AS team1,
            GROUP_CONCAT(CASE WHEN mp.team_number = 2 THEN p.display_name END
                         ORDER BY p.display_name SEPARATOR ', ') AS team2
       FROM matches m
       JOIN games g ON g.game_id = m.game_id
       LEFT JOIN match_players mp ON mp.match_id = m.match_id
       LEFT JOIN players p ON p.player_id = mp.player_id
      WHERE m.status IN ('scheduled', 'in_progress')
      GROUP BY m.match_id, g.title, m.match_type, m.status, m.started_at
      ORDER BY m.match_id DESC`
  );
  return NextResponse.json(rows);
}
