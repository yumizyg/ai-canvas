import { z } from "zod";
import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { routeHandler } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  return routeHandler(async () => {
    const contentType = request.headers.get("content-type") ?? "";
    const isFormRequest = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
    const rawBody = isFormRequest ? Object.fromEntries((await request.formData()).entries()) : await request.json();
    const body = loginSchema.parse(rawBody);
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || user.status !== "active" || !(await verifyPassword(body.password, user.passwordHash))) {
      if (isFormRequest) {
        return NextResponse.redirect(new URL("/?error=login", request.url), { status: 303 });
      }
      return Response.json({ message: "邮箱或密码不正确" }, { status: 401 });
    }

    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    if (isFormRequest) {
      const redirectTo = new URL(request.url).searchParams.get("redirect") ?? "/canvas";
      const protocol = request.headers.get("x-forwarded-proto") ?? "http";
      const host = request.headers.get("host") ?? "127.0.0.1:3000";
      return NextResponse.redirect(new URL(redirectTo, `${protocol}://${host}`), { status: 303 });
    }

    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  });
}
