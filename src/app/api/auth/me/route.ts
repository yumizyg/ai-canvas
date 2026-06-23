import { getSession } from "@/lib/auth";
import { routeHandler } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return routeHandler(async () => {
    return { user: await getSession() };
  });
}
