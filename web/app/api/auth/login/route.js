import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/mysql";
import { signToken } from "@/lib/auth";

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });

  const [rows] = await pool.execute(
    "SELECT user_id, username, password_hash, role, is_active FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];
  if (!user || !user.is_active || !(await bcrypt.compare(password, user.password_hash)))
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  await pool.execute("UPDATE users SET last_login = NOW() WHERE user_id = ?", [user.user_id]);

  const token = await signToken({ id: user.user_id, username: user.username, role: user.role });
  const res = NextResponse.json({ user_id: user.user_id, username: user.username, role: user.role });
  res.cookies.set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 2,
    path: "/",
  });
  return res;
}
