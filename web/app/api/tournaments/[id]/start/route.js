import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

// POST /api/tournaments/[id]/start  (admin, staff)
export async function POST(request, { params }) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) <= 0)
    return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
  const tournamentId = Number(id);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      "SELECT status FROM tournaments WHERE tournament_id = ? FOR UPDATE",
      [tournamentId]
    );
    if (rows.length === 0) {
      await conn.rollback();
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (rows[0].status !== "upcoming") {
      await conn.rollback();
      return NextResponse.json(
        { error: "Cannot start: tournament is " + rows[0].status },
        { status: 409 }
      );
    }

    const [counts] = await conn.execute(
      "SELECT COUNT(*) AS n FROM tournament_participants WHERE tournament_id = ?",
      [tournamentId]
    );
    if (Number(counts[0].n) < 2) {
      await conn.rollback();
      return NextResponse.json(
        { error: "At least 2 participants are required" },
        { status: 409 }
      );
    }

    await conn.query("CALL sp_seed_tournament(?)", [tournamentId]);
    await conn.execute(
      "UPDATE tournaments SET status = 'ongoing' WHERE tournament_id = ?",
      [tournamentId]
    );

    await conn.commit();
    return NextResponse.json({ tournament_id: tournamentId, status: "ongoing" });
  } catch (err) {
    await conn.rollback();
    if (err.sqlState === "45000")
      return NextResponse.json({ error: "Cannot start tournament" }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}