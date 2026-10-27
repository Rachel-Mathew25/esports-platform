import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/mysql";

export async function POST(request) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const { username, email, password } = body;
  const displayName = (body.display_name || username || "").trim();
  const region = (body.region || "Global").trim();

  if (!username || username.length < 3 || username.length > 30)
    return NextResponse.json({ error: "Username must be 3-30 characters" }, { status: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (!password || password.length < 8)
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  if (displayName.length < 2 || displayName.length > 40)
    return NextResponse.json({ error: "Display name must be 2-40 characters" }, { status: 400 });
  if (region.length < 1 || region.length > 30)
    return NextResponse.json({ error: "Region must be 1-30 characters" }, { status: 400 });

  const conn = await pool.getConnection();
  try {
    const hash = await bcrypt.hash(password, 10);
    await conn.beginTransaction();
    const [result] = await conn.execute(
      "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'player')",
      [username, email, hash]
    );
    await conn.execute(
      "INSERT INTO players (player_id, display_name, region) VALUES (?, ?, ?)",
      [result.insertId, displayName, region]
    );
    await conn.commit();
    return NextResponse.json(
      { user_id: result.insertId, player_id: result.insertId, username, display_name: displayName },
      { status: 201 }
    );
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY")
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}
