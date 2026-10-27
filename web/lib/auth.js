import { SignJWT, jwtVerify } from "jose";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(secret());
}

export async function getSession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export async function requireRole(request, roles) {
  const session = await getSession(request);
  if (!session) return { error: "Unauthorized", status: 401 };
  if (!roles.includes(session.role)) return { error: "Forbidden", status: 403 };
  return { session };
}
