import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, name: "管理员", passwordHash, role: "admin" },
    update: { passwordHash, role: "admin", status: "active" }
  });

  await prisma.user.upsert({
    where: { email: "user@example.com" },
    create: {
      email: "user@example.com",
      name: "普通用户",
      passwordHash: await bcrypt.hash("User123456!", 12),
      role: "member",
      status: "active"
    },
    update: { role: "member", status: "active" }
  });

  const mockProvider = await prisma.modelProvider.upsert({
    where: { slug: "mock" },
    create: { name: "Mock 本地演示", slug: "mock", enabled: true },
    update: { enabled: true }
  });

  await prisma.model.upsert({
    where: { slug: "mock-image" },
    create: {
      providerId: mockProvider.id,
      name: "Mock Image",
      slug: "mock-image",
      type: "image",
      enabled: true,
      supportedSizes: ["1024x1024", "768x1024", "1024x768"],
      defaultParams: { count: 1, seed: 42 }
    },
    update: {
      supportedSizes: ["1024x1024", "768x1024", "1024x768"],
      defaultParams: { count: 1, seed: 42 },
      enabled: true
    }
  });

  const aliyunProvider = await prisma.modelProvider.upsert({
    where: { slug: "aliyun-dashscope" },
    create: {
      name: "阿里云通义万相",
      slug: "aliyun-dashscope",
      enabled: Boolean(process.env.ALIYUN_DASHSCOPE_API_KEY),
      apiKeyEnv: "ALIYUN_DASHSCOPE_API_KEY"
    },
    update: {
      enabled: Boolean(process.env.ALIYUN_DASHSCOPE_API_KEY),
      apiKeyEnv: "ALIYUN_DASHSCOPE_API_KEY"
    }
  });

  await prisma.model.upsert({
    where: { slug: "wanx-v1" },
    create: {
      providerId: aliyunProvider.id,
      name: "通义万相",
      slug: "wanx-v1",
      type: "image",
      enabled: Boolean(process.env.ALIYUN_DASHSCOPE_API_KEY),
      supportedSizes: ["1024x1024", "768x1024", "1024x768"],
      defaultParams: { count: 1 }
    },
    update: {
      enabled: Boolean(process.env.ALIYUN_DASHSCOPE_API_KEY),
      supportedSizes: ["1024x1024", "768x1024", "1024x768"]
    }
  });

  await prisma.canvas.upsert({
    where: { id: "demo-canvas" },
    create: {
      id: "demo-canvas",
      title: "内部 AI 画布 Demo",
      ownerId: admin.id
    },
    update: {}
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
