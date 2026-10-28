import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";

export async function GET() {
  const [rows] = await pool.query(
    "SELECT game_id, title, genre, team_size FROM games WHERE is_active = 1 ORDER BY title"
  );
  return NextResponse.json(rows);
}
