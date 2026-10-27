import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { getMongo } from "@/lib/mongo";

export async function GET() {
  try {
    const [rows] = await pool.execute("SELECT COUNT(*) AS users FROM users");
    const db = await getMongo();
    const events = await db.collection("match_events").countDocuments();
    return NextResponse.json({ mysql: rows[0], mongo: { match_events: events } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
