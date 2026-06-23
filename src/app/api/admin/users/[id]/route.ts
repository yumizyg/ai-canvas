import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "member"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  password: z.string().min(6).optional()
});

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return routeHandler(async () => {
    const admin = await requireAdmin();
    const body = updateUserSchema.parse(await request.json());
    if (context.params.id === admin.id && body.status === "disabled") {
      return Response.json({ message: "不能禁用当前登录的管理员账号" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: context.params.id },
      data: {
        name: body.name,
        role: body.role,
        status: body.status,
        passwordHash: body.password ? await bcrypt.hash(body.password, 12) : undefined
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true }
    });

    return { user };
  });
}
