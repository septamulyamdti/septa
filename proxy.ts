import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ==========================================
  // WHATSAPP WEBHOOK
  // BYPASS LOGIN / SUPABASE AUTH
  // ==========================================

  if (pathname === "/api/whatsapp/webhook") {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  // ==========================================
  // SUPABASE SERVER CLIENT
  // ==========================================

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // ==========================================
  // CEK USER LOGIN
  // ==========================================

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ==========================================
  // PUBLIC ROUTES
  // ==========================================

  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  // ==========================================
  // BELUM LOGIN
  // ==========================================

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("redirect", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // ==========================================
  // JIKA BELUM LOGIN DAN MEMBUKA LOGIN
  // ==========================================

  if (!user) {
    return response;
  }

  // ==========================================
  // AMBIL ROLE USER
  // ==========================================

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // ==========================================
  // PROFILE TIDAK DITEMUKAN
  // ==========================================

  if (error || !profile) {
    console.error(
      "User profile tidak ditemukan:",
      error
    );

    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  const role = profile.role;

  // ==========================================
  // SUDAH LOGIN TAPI MEMBUKA /LOGIN
  // ==========================================

  if (pathname === "/login") {
    // ADMIN → DASHBOARD
    if (role === "admin") {
      return NextResponse.redirect(
        new URL("/", request.url)
      );
    }

    // USER → CREATE ISSUE
    if (role === "user") {
      return NextResponse.redirect(
        new URL("/issues/create", request.url)
      );
    }

    // ROLE TIDAK DIKENAL
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // ==========================================
  // ROLE USER
  // HANYA BOLEH AKSES CREATE ISSUE
  // ==========================================

  if (role === "user") {
    const allowedUserRoute =
      pathname === "/issues/create" ||
      pathname.startsWith("/issues/create/");

    if (allowedUserRoute) {
      return response;
    }

    // Semua halaman lain diarahkan ke Create Issue
    return NextResponse.redirect(
      new URL("/issues/create", request.url)
    );
  }

  // ==========================================
  // ROLE ADMIN
  // BOLEH AKSES SEMUA HALAMAN
  // ==========================================

  if (role === "admin") {
    return response;
  }

  // ==========================================
  // ROLE TIDAK DIKENAL
  // ==========================================

  await supabase.auth.signOut();

  return NextResponse.redirect(
    new URL("/login", request.url)
  );
}

// ==========================================
// MATCHER
// ==========================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};