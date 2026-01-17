import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requireEnv } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-ps-user-id");

  const pendingCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          cookies.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const protectedPaths = [
    "/chat/c/",
    "/api/trpc/",
    "/api/learn/",
    // "/api/trpc/message", // Add this when message router is ready
  ];
  
  // Protect all tRPC conversation routes
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (user) {
    requestHeaders.set("x-ps-user-id", user.id);
  }

  const applyCookies = (res: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) =>
      res.cookies.set(name, value, options)
    );
    return res;
  };

  if (isProtected && !user) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return applyCookies(
        NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      )
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    url.searchParams.set("unauthorized", "true");
    url.searchParams.set("returnUrl", request.nextUrl.pathname);
    return applyCookies(NextResponse.redirect(url));
  }

  return applyCookies(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  );
}

export const config = {
  matcher: [
    "/chat/c/:path*",
    "/api/trpc/:path*",
    "/api/learn/:path*",
  ],
};
