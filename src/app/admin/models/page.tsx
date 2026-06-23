"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, EyeOff, Loader2, Save, Settings, Sparkles } from "lucide-react";

type AdminModel = {
  id: string;
  name: string;
  slug: string;
  type: "image" | "video";
  enabled: boolean;
  supportedSizes: string[];
};

type Provider = {
  id: string;
  name: string;
  slug: string;
  enabled: boolean;
  hasApiKey: boolean;
  models: AdminModel[];
};

const seedreamOptions = [
  { label: "Seedream 5.0 Pro", value: "doubao-seedream-5-0-pro-250908" },
  { label: "Seedream 4.5", value: "doubao-seedream-4-5" },
  { label: "Seedream 4.0", value: "doubao-seedream-4-0-250828" },
  { label: "兼容写法 seedream-4-0-250828", value: "seedream-4-0-250828" },
  { label: "展示名自动转换 Doubao-Seedream-4.0", value: "Doubao-Seedream-4.0" }
];
const seedanceOptions = [
  { label: "Seedance 1.5 Pro", value: "doubao-seedance-1-5-pro" },
  { label: "Seedance 1.0 Pro", value: "doubao-seedance-1-0-pro" }
];
const recommendedSeedreamModel = seedreamOptions[0].value;
const recommendedSeedanceModel = seedanceOptions[0].value;

export default function AdminModelsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState(recommendedSeedreamModel);
  const [videoApiKey, setVideoApiKey] = useState("");
  const [videoModelName, setVideoModelName] = useState(recommendedSeedanceModel);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("不要填写 Doubao-Seedream-4.0 这种展示名；请选择或填写火山方舟实际模型 ID。");

  async function load() {
    const response = await fetch("/api/admin/models");
    if (!response.ok) {
      setMessage("没有权限或登录已过期");
      return;
    }
    const json = await response.json();
    const nextProviders = json.providers ?? [];
    setProviders(nextProviders);
    const seedreamProvider = nextProviders.find((provider: Provider) => provider.slug === "volcengine-seedream");
    const seedreamModel = seedreamProvider?.models?.[0];
    if (seedreamModel) {
      setModelName(seedreamModel.slug);
      setEnabled(seedreamModel.enabled && seedreamProvider.enabled);
    }
    const seedanceProvider = nextProviders.find((provider: Provider) => provider.slug === "volcengine-seedance");
    const seedanceModel = seedanceProvider?.models?.[0];
    if (seedanceModel) {
      setVideoModelName(seedanceModel.slug);
      setVideoEnabled(seedanceModel.enabled && seedanceProvider.enabled);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveSeedream(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: "volcengine-seedream",
        apiKey: apiKey.trim() || undefined,
        modelName,
        enabled
      })
    });
    setSaving(false);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setMessage(json.message ?? "保存失败，请检查 API Key 和模型 ID");
      return;
    }
    setApiKey("");
    setMessage("Seedream 配置已保存。画布生成时会自动使用规范化后的模型 ID。");
    await load();
  }

  async function saveSeedance(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/admin/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preset: "volcengine-seedance",
        apiKey: videoApiKey.trim() || undefined,
        modelName: videoModelName,
        enabled: videoEnabled
      })
    });
    setSaving(false);
    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      setMessage(json.message ?? "保存失败，请检查 Seedance API Key 和模型 ID");
      return;
    }
    setVideoApiKey("");
    setMessage("Seedance 视频模型配置已保存。成员可以在画布中选择视频节点。");
    await load();
  }

  return (
    <main className="admin-shell">
      <aside className="admin-nav">
        <strong>管理员后台</strong>
        <Link href="/canvas"><ArrowLeft size={16} /> 返回画布</Link>
        <Link className="active" href="/admin/models"><Settings size={16} /> 模型 API 设置</Link>
        <Link href="/admin/dashboard"><Database size={16} /> 数据看板</Link>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <h1>模型 API 设置</h1>
            <p>{message}</p>
          </div>
        </header>

        <div className="admin-grid two">
          <form className="admin-card form-card quick-model-card" onSubmit={saveSeedream}>
            <div className="quick-model-title">
              <div className="brand-mark small">
                <Sparkles size={18} />
              </div>
              <div>
                <h2>火山引擎 Seedream 快速接入</h2>
                <p>只需要 API Key 和模型 ID。展示名会自动转换，推荐直接使用下面这个模型 ID。</p>
              </div>
            </div>

            <label>
              火山 API Key
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="粘贴火山方舟 API Key；已保存过可留空"
              />
            </label>
            <div className="field-help">
              <EyeOff size={14} />
              保存后不会回显。只有换 Key 时才需要重新填写。
            </div>

            <label>
              Seedream 模型 ID
              <select value={modelName} onChange={(event) => setModelName(event.target.value)}>
                {seedreamOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}：{option.value}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-help">
              最终传给火山的 model 会规范化为：<strong>{recommendedSeedreamModel}</strong>
            </div>

            <label className="check-row">
              <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
              启用后，成员可以在画布中选择 Seedream 生成图片
            </label>

            <div className="model-defaults">
              <strong>自动参数</strong>
              <span>接口地址：https://ark.cn-beijing.volces.com/api/v3/images/generations</span>
              <span>尺寸：画布选择 1K / 2K / 4K，默认 2K</span>
              <span>输出：url，系统自动下载并保存到素材库</span>
            </div>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              保存 Seedream 配置
            </button>
          </form>

          <form className="admin-card form-card quick-model-card" onSubmit={saveSeedance}>
            <div className="quick-model-title">
              <div className="brand-mark small">
                <Sparkles size={18} />
              </div>
              <div>
                <h2>火山引擎 Seedance 视频快速接入</h2>
                <p>只需要 API Key 和模型 ID。保存后，成员可以在画布中添加视频节点并选择 Seedance 模型。</p>
              </div>
            </div>

            <label>
              火山 API Key
              <input
                type="password"
                value={videoApiKey}
                onChange={(event) => setVideoApiKey(event.target.value)}
                placeholder="如果和 Seedream 共用同一个 Key，可以粘贴同一份"
              />
            </label>

            <label>
              Seedance 模型 ID
              <select value={videoModelName} onChange={(event) => setVideoModelName(event.target.value)}>
                {seedanceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}：{option.value}
                  </option>
                ))}
              </select>
            </label>

            <label className="check-row">
              <input type="checkbox" checked={videoEnabled} onChange={(event) => setVideoEnabled(event.target.checked)} />
              启用后，成员可以在画布中选择 Seedance 生成视频
            </label>

            <div className="model-defaults">
              <strong>自动参数</strong>
              <span>模型类型：video</span>
              <span>默认清晰度：1080p，可在画布节点中改为 720p</span>
              <span>默认时长：5 秒；视频真实生成接口将在下一步接入 worker</span>
            </div>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              保存 Seedance 配置
            </button>
          </form>

          <section className="admin-card">
            <h2>成员当前可用模型</h2>
            <div className="model-admin-list">
              {providers.map((provider) => (
                <div className="model-admin-provider" key={provider.id}>
                  <div className="provider-head">
                    <div>
                      <strong>{provider.name}</strong>
                      <span>{provider.enabled ? "启用" : "停用"} · {provider.hasApiKey ? "API Key 已保存" : "未保存 API Key"}</span>
                    </div>
                    {provider.hasApiKey ? <CheckCircle2 size={18} /> : <Settings size={18} />}
                  </div>
                  {provider.models.map((model) => (
                    <div className="model-readonly" key={model.id}>
                      <span>{model.name}</span>
                      <small>{model.slug} · {model.enabled ? "成员可用" : "已停用"} · {model.supportedSizes.join(" / ")}</small>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
