import { auth } from "@/lib/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/api/auth",
    "/api/health",
    "/shared",
    "/mind",
    "/offline",
  ];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|icons|audio|sw.js|manifest|sitemap|robots|icon.svg|opengraph).*)",
  ],
};
