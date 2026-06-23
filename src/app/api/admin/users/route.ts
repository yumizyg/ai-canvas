import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(["admin", "member"]).default("member")
});

export async function GET() {
  return routeHandler(async () => {
    await requireAdmin();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        _count: { select: { canvases: true, jobs: true, assets: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return { users };
  });
}

export async function POST(request: Request) {
  return routeHandler(async () => {
    await requireAdmin();
    const body = userSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        passwordHash,
        role: body.role,
        status: "active"
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true }
    });
    return { user };
  });
}
