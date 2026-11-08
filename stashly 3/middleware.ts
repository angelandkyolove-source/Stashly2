import { NextResponse, type NextRequest } from "next/server";

// 匿名ユーザーIDを発行（コレクションは端末ごとの専用）
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get("uid")) {
    res.cookies.set("uid", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 5,
      path: "/",
    });
  }
  return res;
}

export const config = { matcher: ["/((?!_next|uploads|favicon.ico).*)"] };
