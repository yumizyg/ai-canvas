"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Database, Loader2, Settings, UserPlus } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  status: "active" | "disabled";
  createdAt: string;
  _count?: { canvases: number; jobs: number; assets: number };
  usage?: Record<string, number>;
};

type Stats = {
  totals: { users: number; activeUsers: number; canvases: number; jobs: number; assets: number; enabledModels: number };
  jobsByStatus: Array<{ status: string; count: number }>;
  users: AdminUser[];
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState("查看成员使用情况，并创建或管理账号。");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "member" as "admin" | "member" });

  async function load() {
    const [statsResponse, usersResponse] = await Promise.all([fetch("/api/admin/stats"), fetch("/api/admin/users")]);
    if (!statsResponse.ok || !usersResponse.ok) {
      setMessage("没有权限或登录已过期");
      return;
    }
    const statsJson = await statsResponse.json();
    const usersJson = await usersResponse.json();
    setStats(statsJson);
    setUsers(usersJson.users ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const jobStatus = useMemo(() => stats?.jobsByStatus.map((row) => `${row.status}: ${row.count}`).join(" · ") || "暂无任务", [stats]);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setCreating(false);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setMessage(json.message ?? "创建账号失败");
      return;
    }
    setForm({ email: "", name: "", password: "", role: "member" });
    setMessage("账号已创建");
    await load();
  }

  async function updateUser(id: string, patch: Partial<Pick<AdminUser, "role" | "status" | "name">> & { password?: string }) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    setMessage(response.ok ? "账号已更新" : "账号更新失败");
    await load();
  }

  return (
    <main className="admin-shell">
      <aside className="admin-nav">
        <strong>管理员后台</strong>
        <Link href="/canvas"><ArrowLeft size={16} /> 返回画布</Link>
        <Link href="/admin/models"><Settings size={16} /> 模型 API 设置</Link>
        <Link className="active" href="/admin/dashboard"><Database size={16} /> 数据看板</Link>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <h1>数据看板</h1>
            <p>{message}</p>
          </div>
          <BarChart3 size={28} />
        </header>

        <section className="metric-grid">
          <div><strong>{stats?.totals.users ?? 0}</strong><span>账号总数</span></div>
          <div><strong>{stats?.totals.activeUsers ?? 0}</strong><span>启用账号</span></div>
          <div><strong>{stats?.totals.canvases ?? 0}</strong><span>画布数</span></div>
          <div><strong>{stats?.totals.jobs ?? 0}</strong><span>生成任务</span></div>
          <div><strong>{stats?.totals.assets ?? 0}</strong><span>素材数</span></div>
          <div><strong>{stats?.totals.enabledModels ?? 0}</strong><span>启用模型</span></div>
        </section>

        <div className="admin-card status-card">{jobStatus}</div>

        <div className="admin-grid two">
          <form className="admin-card form-card" onSubmit={createUser}>
            <h2>创建账号</h2>
            <label>邮箱<input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
            <label>姓名<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
            <label>初始密码<input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>
            <label>角色
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "admin" | "member" })}>
                <option value="member">用户账号</option>
                <option value="admin">管理员账号</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={creating}>
              {creating ? <Loader2 className="spin" size={16} /> : <UserPlus size={16} />}
              创建账号
            </button>
          </form>

          <section className="admin-card">
            <h2>用户使用情况</h2>
            <div className="user-table">
              {users.map((user) => (
                <div className="user-row" key={user.id}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div>{user.role === "admin" ? "管理员" : "用户"}</div>
                  <div>{user.status === "active" ? "启用" : "停用"}</div>
                  <div>画布 {user._count?.canvases ?? 0} · 任务 {user._count?.jobs ?? 0} · 素材 {user._count?.assets ?? 0}</div>
                  <div className="row-actions">
                    <button onClick={() => updateUser(user.id, { role: user.role === "admin" ? "member" : "admin" })}>切换角色</button>
                    <button onClick={() => updateUser(user.id, { status: user.status === "active" ? "disabled" : "active" })}>
                      {user.status === "active" ? "禁用" : "启用"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
