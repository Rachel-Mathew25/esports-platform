import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const game = searchParams.get("game");
  const region = searchParams.get("region");
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 200);

  const where = [];
  const params = [];
  if (game) { where.push("game_title = ?"); params.push(game); }
  if (region) { where.push("region = ?"); params.push(region); }

  const sql =
    "SELECT * FROM v_leaderboard" +
    (where.length ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY game_title, leaderboard_rank LIMIT ?";
  params.push(limit);

  try {
    const [rows] = await pool.query(sql, params);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
