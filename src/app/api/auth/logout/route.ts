import { clearSession } from "@/lib/auth";
import { routeHandler } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  return routeHandler(async () => {
    clearSession();
    return { ok: true };
  });
}
