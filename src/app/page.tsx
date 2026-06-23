"use client";

import { useEffect, useState } from "react";
import { KeyRound, Shield, Sparkles } from "lucide-react";

type SessionUser = { id: string; email: string; name: string; role: "admin" | "member" };

export default function LoginPage() {
  const [login, setLogin] = useState({ email: "admin@example.com", password: "ChangeMe123!" });
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then((res) => res.json())
      .then((data: { user: SessionUser | null }) => {
        if (data.user) window.location.href = "/canvas";
      })
      .catch(() => undefined)
      .finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login)
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.message ?? "登录失败");
      return;
    }
    window.location.href = "/canvas";
  }

  return (
    <main className="login-shell">
      <form className="login-panel" action="/api/auth/login?redirect=/canvas" method="post" onSubmit={submit}>
        <div className="brand-mark">
          <Sparkles size={24} />
        </div>
        <h1>企业 AI 画布</h1>
        <p>管理员可进入模型 API 设置和数据看板，普通用户只能进入画布工作台。</p>
        <label>
          账号邮箱
          <input name="email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
        </label>
        <label>
          密码
          <input name="password" type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
        </label>
        {error ? <div className="form-error">{error}</div> : null}
        <button className="primary-button" type="submit">
          <KeyRound size={16} />
          登录
        </button>
        <div className="login-note">
          <Shield size={15} />
          账号由管理员在数据看板中创建和管理。
        </div>
      </form>
    </main>
  );
}
