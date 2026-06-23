# Enterprise AI Canvas

企业内部 AI 画布生成平台。项目面向设计、运营、产品等团队，把图片生成、视频生成、提示词传参、参考图复用和素材下载整合到一个可视化画布里，让成员不用理解复杂 API，也能通过节点和连线完成 AIGC 素材生产。

默认部署路径支持作为个人简历站的子页面使用：

```text
https://www.yumiprogram.online/ai-canvas
```

## 项目亮点

- 画布化 AIGC 工作流：基于 React Flow 实现提示词节点、生图节点、视频节点、素材节点、输出节点和节点连线。
- 管理员统一配置模型：成员只选择模型和参数，不接触 API Key，适合企业内部权限管理。
- 火山引擎模型接入：支持 Seedream 图片生成和 Seedance 视频生成，并内置模型 ID 规范化。
- 异步任务队列：使用 Redis + BullMQ + Worker 处理长耗时生成任务，避免浏览器请求超时。
- 参考图传参：上游图片可以通过连线传给下游图片/视频节点，Worker 会将本地素材转成可提交给模型的输入。
- 可部署工程化：Docker Compose 一键启动 Next.js、PostgreSQL、Redis 和 Worker。
- 子路径部署：支持挂到已有简历网站 `/ai-canvas` 下，不接管主域名首页。

## 技术栈

| 模块 | 技术 | 选择原因 |
| --- | --- | --- |
| 前端框架 | Next.js + React | 页面、API、构建和部署都在一个项目里，适合快速做 MVP 和内部工具 |
| 类型系统 | TypeScript | 降低模型参数、节点数据、任务状态等复杂字段写错的风险 |
| 画布交互 | React Flow / XYFlow | 自带节点、连线、缩放、拖拽能力，适合做 Lovart / ComfyUI 类画布 |
| UI 图标 | lucide-react | 轻量、统一，适合工具型界面 |
| 数据库 | PostgreSQL + Prisma | 保存用户、模型、画布、节点、连线、任务和素材元数据 |
| 队列 | Redis + BullMQ | 处理图片/视频生成这种长耗时任务，支持排队、重试和状态追踪 |
| 后台任务 | Worker | 独立调用模型 API、下载结果、写入数据库，避免阻塞网页服务 |
| AI 模型 | 火山引擎 Seedream / Seedance | 支持图片和视频生成，适合中文场景和国内服务器部署 |
| 部署 | Docker Compose | 一条命令启动 app、worker、postgres、redis，降低服务器环境差异 |

## 架构说明

```text
浏览器画布
  |
  | 操作节点、连线、提交生成
  v
Next.js App / API
  |
  | 登录鉴权、保存画布、创建任务
  v
PostgreSQL <----> Redis / BullMQ
  |                  |
  |                  | 后台取任务
  v                  v
素材元数据        Worker
                     |
                     | 调用模型 API
                     v
          Seedream 图片生成 / Seedance 视频生成
                     |
                     | 下载结果
                     v
              storage/assets
```

核心设计思路：

- 前端只负责产品交互：用户在画布里拖节点、连线、选择比例、输入提示词。
- API 负责业务规则：鉴权、权限判断、画布保存、任务创建。
- Worker 负责耗时工作：调用模型、轮询视频任务、下载图片/视频、更新任务状态。
- 数据库保存结构化数据：用户、模型、画布、节点、连线、任务、素材。
- 本地磁盘保存大文件：图片和视频文件不直接塞进数据库。

## 功能范围

### 成员端

- 登录后进入画布页面
- 创建提示词节点、图片生成节点、视频生成节点、素材节点、输出节点
- 设置图片比例、分辨率、宽高、负面词、Seed、生成数量等参数
- 通过连线把提示词和参考图传给下游节点
- 查看任务状态：排队中、生成中、成功、失败
- 预览和下载生成图片/视频
- 保存画布并刷新恢复

### 管理员端

- 配置火山引擎 Seedream 图片模型
- 配置火山引擎 Seedance 视频模型
- 管理成员账号
- 查看数据看板，包括用户、画布、任务和使用情况
- 管理员可访问 `/admin/models` 和 `/admin/dashboard`

## 数据模型

主要表结构：

- `users`：用户、密码哈希、角色、状态
- `model_providers`：模型供应商、API Key、启用状态
- `models`：模型名称、类型、尺寸、默认参数
- `canvases`：画布项目
- `canvas_nodes`：节点类型、位置、尺寸、配置和结果
- `canvas_edges`：节点连线和端口信息
- `generation_jobs`：生成任务、参数快照、状态、错误信息
- `assets`：图片/视频文件路径、尺寸、来源任务

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 准备环境变量

```bash
cp .env.example .env
```

至少需要配置：

```text
DATABASE_URL="postgresql://canvas:canvas@localhost:5432/canvas?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="replace-with-a-long-random-secret"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="ChangeMe123!"
ASSET_STORAGE_DIR="./storage/assets"
```

火山引擎 API Key 推荐在管理员页面保存；如需环境变量方式，可使用：

```text
VOLCENGINE_API_KEY="your-volcengine-ark-api-key"
```

### 3. 启动数据库和 Redis

推荐使用 Docker Desktop：

```bash
npm run docker:up
```

如果你已经有自己的 PostgreSQL 和 Redis，也可以直接修改 `.env` 后跳过这一步。

### 4. 初始化数据库

```bash
npm run prisma:migrate
npm run seed
```

### 5. 启动开发服务

```bash
npm run dev
```

再开一个终端启动 Worker：

```bash
npm run worker
```

默认访问：

```text
http://localhost:3000
```

## 常用命令

```bash
npm run dev              # 启动 Next.js 开发服务
npm run worker           # 启动生成任务 Worker
npm run build            # 生产构建
npm test                 # 运行单元测试
npm run prisma:migrate   # 本地数据库迁移
npm run prisma:deploy    # 生产数据库迁移
npm run seed             # 创建初始管理员和默认数据
npm run verify:local     # 本地生产环境自检
```

## 生产部署

项目已准备好阿里云轻量服务器部署方案，详见：

[docs/aliyun-deploy.md](docs/aliyun-deploy.md)

核心方式：

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

该生产配置默认：

- AI Canvas 运行在 `127.0.0.1:3000`
- 外部通过现有 Nginx / Caddy 将 `/ai-canvas` 反向代理到本服务
- PostgreSQL 和素材文件使用 Docker volume 持久化
- 不会接管 `www.yumiprogram.online` 的首页

## 简历项目表达

这个项目体现的是一个完整 AI 产品从 0 到 1 的闭环：

- 产品思维：把企业 AIGC 素材生产流程抽象成节点、参数、任务、素材和权限。
- AI 能力：接入 Seedream / Seedance，处理提示词、参考图、模型 ID、尺寸参数和视频任务轮询。
- 工程能力：完成前端画布、后端 API、数据库、任务队列、权限系统、Docker 部署和版本回退。

## License

Internal project / portfolio demo. Please review model provider terms and company data policy before production use.
