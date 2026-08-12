import { cookies } from "next/headers";

// Change this PIN to whatever you want (4-6 digits)
export const APP_PIN = "100822";

const AUTH_COOKIE = "shop_auth";

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE)?.value === "authenticated";
}

export async function login(pin: string): Promise<boolean> {
  if (pin !== APP_PIN) return false;

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "authenticated", {
    httpOnly: true,
    secure: false, // false for localhost
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return true;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
}
