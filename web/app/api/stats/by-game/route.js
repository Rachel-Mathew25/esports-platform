import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";

export async function GET() {
  try {
    const [rows] = await pool.execute(
      `SELECT game_title,
              COUNT(*) AS players,
              ROUND(AVG(elo_rating)) AS avg_elo,
              MAX(elo_rating) AS top_elo,
              SUM(matches_played) AS total_matches
       FROM v_leaderboard
       GROUP BY game_title
       HAVING COUNT(*) >= 1
       ORDER BY avg_elo DESC`
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("stats by-game error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
