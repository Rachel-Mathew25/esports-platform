import { NextResponse } from "next/server";
import { pool } from "@/lib/mysql";
import { requireRole } from "@/lib/auth";

const STATUSES = ["upcoming", "ongoing", "completed", "cancelled"];

function isValidDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// GET /api/tournaments?status=&game_id=  (public)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const gameIdParam = searchParams.get("game_id");

  // Fixed SQL fragments chosen by our code; user values are always bound.
  let where = "";
  const params = [];

  if (status !== null && status !== "") {
    if (!STATUSES.includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    where += " AND t.status = ?";
    params.push(status);
  }
  if (gameIdParam !== null && gameIdParam !== "") {
    const gameId = Number(gameIdParam);
    if (!Number.isInteger(gameId) || gameId <= 0)
      return NextResponse.json({ error: "game_id must be a positive integer" }, { status: 400 });
    where += " AND t.game_id = ?";
    params.push(gameId);
  }

  try {
    const [rows] = await pool.execute(
      "SELECT t.tournament_id, t.name, t.game_id, g.title AS game, " +
        "DATE_FORMAT(t.start_date, '%Y-%m-%d') AS start_date, " +
        "DATE_FORMAT(t.end_date, '%Y-%m-%d') AS end_date, " +
        "t.status, COUNT(tp.player_id) AS participants " +
        "FROM tournaments t " +
        "JOIN games g ON g.game_id = t.game_id " +
        "LEFT JOIN tournament_participants tp ON tp.tournament_id = t.tournament_id " +
        "WHERE 1 = 1" + where + " " +
        "GROUP BY t.tournament_id, t.name, t.game_id, g.title, t.start_date, t.end_date, t.status " +
        "ORDER BY t.start_date DESC, t.tournament_id DESC",
      params
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tournaments  (admin, staff)
export async function POST(request) {
  const auth = await requireRole(request, ["admin", "staff"]);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const gameId = Number(body?.game_id);
  const startDate = body?.start_date;
  const endDate = body?.end_date ?? null;

  if (name.length < 3 || name.length > 100)
    return NextResponse.json({ error: "name must be 3 to 100 characters" }, { status: 400 });
  if (!Number.isInteger(gameId) || gameId <= 0)
    return NextResponse.json({ error: "game_id must be a positive integer" }, { status: 400 });
  if (!isValidDate(startDate))
    return NextResponse.json({ error: "start_date must be a valid date (YYYY-MM-DD)" }, { status: 400 });
  if (endDate !== null) {
    if (!isValidDate(endDate))
      return NextResponse.json({ error: "end_date must be a valid date (YYYY-MM-DD)" }, { status: 400 });
    if (endDate < startDate)
      return NextResponse.json({ error: "end_date cannot be before start_date" }, { status: 400 });
  }

  try {
    const [games] = await pool.execute(
      "SELECT game_id FROM games WHERE game_id = ? AND is_active = 1",
      [gameId]
    );
    if (games.length === 0)
      return NextResponse.json({ error: "Game not found or inactive" }, { status: 404 });

    const [result] = await pool.execute(
      "INSERT INTO tournaments (game_id, name, start_date, end_date, status, created_by) " +
        "VALUES (?, ?, ?, ?, 'upcoming', ?)",
      [gameId, name, startDate, endDate, Number(auth.session.id)]
    );
    return NextResponse.json(
      {
        tournament_id: result.insertId,
        game_id: gameId,
        name,
        start_date: startDate,
        end_date: endDate,
        status: "upcoming",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}