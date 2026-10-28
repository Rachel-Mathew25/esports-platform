import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getSession } from "@/lib/auth";

export async function GET(request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  const terms = q.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  if (terms.length === 0)
    return NextResponse.json({ error: "Query parameter q is required" }, { status: 400 });

  const booleanQuery = terms.map((t) => `+${t}*`).join(" ");

  try {
    const [rows] = await pool.execute(
      `SELECT p.player_id, p.display_name, p.region, g.title AS game, s.elo_rating, s.rank_tier
       FROM players p
       LEFT JOIN player_game_stats s ON s.player_id = p.player_id
       LEFT JOIN games g ON g.game_id = s.game_id
       WHERE MATCH(p.display_name) AGAINST (? IN BOOLEAN MODE)
       ORDER BY s.elo_rating DESC
       LIMIT 20`,
      [booleanQuery]
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
