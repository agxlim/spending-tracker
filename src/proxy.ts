import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

const PUBLIC_PATHS = ["/login", "/auth/"];

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));

  const redirect = (to: string) => {
    const redirectResponse = NextResponse.redirect(new URL(to, request.url));
    // Keep any refreshed session cookies.
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  };

  if (!user && !isPublic) return redirect("/login");
  if (user && pathname === "/login") return redirect("/");
  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and PWA files.
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
