"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  NodeResizer,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps
} from "@xyflow/react";
import {
  Boxes,
  Check,
  Copy,
  Download,
  Link2,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  LogOut,
  Play,
  Plus,
  Save,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import { clsx } from "clsx";
import { resolveGenerationInputs, validateConnection, type CanvasNodeData } from "@/lib/canvas";
import { appPath } from "@/lib/app-path";

type SessionUser = { id: string; email: string; name: string; role: "admin" | "member" };
type ModelOption = {
  id: string;
  name: string;
  slug: string;
  type: "image" | "video";
  supportedSizes: string[];
  defaultParams: Record<string, unknown>;
  provider: { name: string; slug: string };
};
type CanvasSummary = { id: string; title: string; updatedAt: string };
type JobLine = { id: string; nodeId: string; status: string; label: string; error?: string };
type CanvasFlowNode = Node<CanvasNodeData>;
type NodeKind = "prompt" | "imageGen" | "videoGen" | "asset" | "output";
type ContextMenuState = { type: "pane" | "node" | "edge"; x: number; y: number; nodeId?: string; edgeId?: string };

const fallbackImageSizes = ["1024x1024", "1024x768", "768x1024"];
const nodeDimensions: Record<NodeKind, { width: number; height: number }> = {
  prompt: { width: 260, height: 150 },
  imageGen: { width: 280, height: 320 },
  videoGen: { width: 300, height: 320 },
  asset: { width: 260, height: 260 },
  output: { width: 300, height: 320 }
};
const aspectRatios = [
  { label: "21:9", w: 21, h: 9 },
  { label: "16:9", w: 16, h: 9 },
  { label: "3:2", w: 3, h: 2 },
  { label: "4:3", w: 4, h: 3 },
  { label: "1:1", w: 1, h: 1 },
  { label: "3:4", w: 3, h: 4 },
  { label: "2:3", w: 2, h: 3 },
  { label: "9:16", w: 9, h: 16 }
];
const resolutionOptions = [
  { label: "标准 1K", value: "1K", longEdge: 1024 },
  { label: "高清 2K", value: "2K", longEdge: 1664 },
  { label: "超清 4K", value: "4K", longEdge: 2496 }
];

function getNodeDimensions(type?: string | null) {
  return nodeDimensions[(type as NodeKind) || "imageGen"] ?? nodeDimensions.imageGen;
}

function withNodeDefaults(node: CanvasFlowNode): CanvasFlowNode {
  const defaults = getNodeDimensions(node.type);
  return {
    ...node,
    width: node.width ?? defaults.width,
    height: node.height ?? defaults.height
  };
}

function deriveSize(aspectRatio = "1:1", resolution = "1K") {
  const ratio = aspectRatios.find((item) => item.label === aspectRatio) ?? aspectRatios[4];
  const resolutionOption = resolutionOptions.find((item) => item.value === resolution) ?? resolutionOptions[0];
  const longEdge = resolutionOption.longEdge;
  const landscape = ratio.w >= ratio.h;
  const width = landscape ? longEdge : Math.round((longEdge * ratio.w) / ratio.h);
  const height = landscape ? Math.round((longEdge * ratio.h) / ratio.w) : longEdge;
  const evenWidth = Math.max(64, Math.round(width / 2) * 2);
  const evenHeight = Math.max(64, Math.round(height / 2) * 2);
  const minPixels = 921600;
  if (evenWidth * evenHeight >= minPixels) {
    return { width: evenWidth, height: evenHeight, size: `${evenWidth}x${evenHeight}` };
  }
  const scale = Math.sqrt(minPixels / (evenWidth * evenHeight));
  const scaledWidth = Math.max(64, Math.ceil((evenWidth * scale) / 2) * 2);
  const scaledHeight = Math.max(64, Math.ceil((evenHeight * scale) / 2) * 2);
  return { width: scaledWidth, height: scaledHeight, size: `${scaledWidth}x${scaledHeight}` };
}

function isVideoAsset(data: CanvasNodeData) {
  return data.assetMimeType?.startsWith("video/") || /\.(mp4|webm|mov)(\?|$)/i.test(data.assetUrl ?? "");
}

const initialNodes: CanvasFlowNode[] = [
  {
    id: "prompt-1",
    type: "prompt",
    position: { x: 40, y: 120 },
    width: nodeDimensions.prompt.width,
    height: nodeDimensions.prompt.height,
    data: { label: "品牌主视觉提示词", prompt: "现代企业内部 AI 创意工具界面，干净，高级，适合团队协作" }
  },
  {
    id: "gen-1",
    type: "imageGen",
    position: { x: 390, y: 90 },
    width: nodeDimensions.imageGen.width,
    height: nodeDimensions.imageGen.height,
    data: { label: "生图节点", size: "1024x1024", aspectRatio: "1:1", resolution: "1K", width: 1024, height: 1024, count: 1 }
  },
  {
    id: "output-1",
    type: "output",
    position: { x: 760, y: 155 },
    width: nodeDimensions.output.width,
    height: nodeDimensions.output.height,
    data: { label: "最终素材" }
  }
];

const initialEdges: Edge[] = [
  { id: "prompt-1-gen-1", source: "prompt-1", target: "gen-1", sourceHandle: "text", targetHandle: "prompt" },
  { id: "gen-1-output-1", source: "gen-1", target: "output-1", sourceHandle: "image", targetHandle: "asset" }
];

function PromptNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div className={clsx("canvas-node prompt-node", selected && "selected")}>
      <NodeResizer minWidth={210} minHeight={120} isVisible={selected} />
      <div className="node-head">
        <Sparkles size={16} />
        <span>{data.label || "提示词"}</span>
      </div>
      <p>{data.prompt || "输入提示词后连到生图节点"}</p>
      <div className="node-port-label right">文本输出</div>
      <Handle type="source" position={Position.Right} id="text" />
    </div>
  );
}

function ImageGenNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const running = data.jobStatus === "queued" || data.jobStatus === "running";
  return (
    <div className={clsx("canvas-node gen-node", selected && "selected")}>
      <NodeResizer minWidth={240} minHeight={260} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: 48 }} />
      <Handle type="target" position={Position.Left} id="reference" style={{ top: 104 }} />
      <div className="node-port-label left prompt-port">提示词输入</div>
      <div className="node-port-label left reference-port">参考图输入</div>
      <div className="node-head">
        {running ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
        <span>{data.label || "生图节点"}</span>
      </div>
      <div className="preview">
        {data.assetUrl ? <img src={data.assetUrl} alt="生成结果" /> : running ? <Loader2 className="spin" size={34} /> : <Sparkles size={36} />}
        {data.assetUrl ? (
          <a className="node-download nodrag" href={data.assetUrl} download title="下载图片">
            <Download size={14} />
          </a>
        ) : null}
      </div>
      <div className="node-meta">
        <span>{data.aspectRatio || "1:1"} · {data.resolution || data.size || "1024x1024"}</span>
        <span>{data.jobStatus || "ready"}</span>
      </div>
      {data.resolvedPrompt ? <p className="node-resolved">已接收提示词：{data.resolvedPrompt.slice(0, 42)}</p> : null}
      {data.error ? <div className="node-error">{data.error}</div> : null}
      <div className="node-port-label right">图片输出</div>
      <Handle type="source" position={Position.Right} id="image" />
    </div>
  );
}

function VideoGenNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  const running = data.jobStatus === "queued" || data.jobStatus === "running";
  return (
    <div className={clsx("canvas-node gen-node video-node", selected && "selected")}>
      <NodeResizer minWidth={250} minHeight={260} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: 48 }} />
      <Handle type="target" position={Position.Left} id="reference" style={{ top: 104 }} />
      <div className="node-port-label left prompt-port">提示词输入</div>
      <div className="node-port-label left reference-port">首帧/参考图</div>
      <div className="node-head">
        <Video size={16} />
        <span>{data.label || "视频节点"}</span>
      </div>
      <div className="preview video-preview">
        {data.assetUrl ? <video src={data.assetUrl} controls /> : running ? <Loader2 className="spin" size={34} /> : <Video size={38} />}
        {data.assetUrl ? (
          <a className="node-download nodrag" href={data.assetUrl} download title="????">
            <Download size={14} />
          </a>
        ) : null}
      </div>
      <div className="node-meta">
        <span>{data.aspectRatio || "16:9"} · {data.resolution || data.size || "1080p"}</span>
        <span>{data.jobStatus || `${data.duration ?? 5}s`}</span>
      </div>
      {data.resolvedPrompt ? <p className="node-resolved">已接收提示词：{data.resolvedPrompt.slice(0, 42)}</p> : <p>配置 Seedance 1.0/1.5 Pro。视频生成接口待接入。</p>}
      <div className="node-port-label right">视频输出</div>
      <Handle type="source" position={Position.Right} id="video" />
    </div>
  );
}

function AssetNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div className={clsx("canvas-node asset-node", selected && "selected")}>
      <NodeResizer minWidth={220} minHeight={220} isVisible={selected} />
      <div className="node-head">
        <ImageIcon size={16} />
        <span>{data.label || "素材"}</span>
      </div>
      <div className="preview">
        {data.assetUrl ? <img src={data.assetUrl} alt="素材" /> : <Upload size={34} />}
        {data.assetUrl ? (
          <a className="node-download nodrag" href={data.assetUrl} download title="下载图片">
            <Download size={14} />
          </a>
        ) : null}
      </div>
      <div className="node-port-label right">图片输出</div>
      <Handle type="source" position={Position.Right} id="image" />
    </div>
  );
}

function OutputNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div className={clsx("canvas-node output-node", selected && "selected")}>
      <NodeResizer minWidth={250} minHeight={250} isVisible={selected} />
      <Handle type="target" position={Position.Left} id="asset" />
      <div className="node-head">
        <Check size={16} />
        <span>{data.label || "输出"}</span>
      </div>
      <div className="preview output-preview">
        {data.assetUrl ? <img src={data.assetUrl} alt="输出素材" /> : <Check size={34} />}
        {data.assetUrl ? (
          <a className="node-download nodrag" href={data.assetUrl} download title="下载图片">
            <Download size={14} />
          </a>
        ) : null}
      </div>
      <div className="node-meta">
        <span>{data.aspectRatio || data.size || "待接收图片"}</span>
        <span>{data.width && data.height ? `${data.width}x${data.height}` : "output"}</span>
      </div>
      {data.resolvedPrompt ? <p className="node-resolved">提示词：{data.resolvedPrompt.slice(0, 46)}</p> : <p>把最终图像素材汇总到这里。</p>}
      <div className="node-port-label left output-port">图片输入</div>
    </div>
  );
}

const nodeTypes = {
  prompt: PromptNode,
  imageGen: ImageGenNode,
  videoGen: VideoGenNode,
  asset: AssetNode,
  output: OutputNode
};

export default function HomePage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [login, setLogin] = useState({ email: "admin@example.com", password: "ChangeMe123!" });
  const [loginError, setLoginError] = useState("");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [canvases, setCanvases] = useState<CanvasSummary[]>([]);
  const [activeCanvas, setActiveCanvas] = useState<CanvasSummary | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasFlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("gen-1");
  const [jobs, setJobs] = useState<JobLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState("准备就绪");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const modelTypeForSelectedNode = selectedNode?.type === "videoGen" ? "video" : "image";
  const selectableModels = useMemo(
    () => models.filter((model) => model.type === modelTypeForSelectedNode),
    [models, modelTypeForSelectedNode]
  );
  const selectedModel = useMemo(
    () => selectableModels.find((model) => model.id === selectedNode?.data.modelId) ?? selectableModels[0],
    [selectableModels, selectedNode?.data.modelId]
  );
  const selectedGenerationInputs = useMemo(() => {
    if (!selectedNode || (selectedNode.type !== "imageGen" && selectedNode.type !== "videoGen")) return null;
    return resolveGenerationInputs(nodes, edges, selectedNode.id);
  }, [edges, nodes, selectedNode]);
  const sizeOptions = useMemo(() => {
    const raw = selectedModel?.supportedSizes;
    return Array.isArray(raw) && raw.length ? raw : fallbackImageSizes;
  }, [selectedModel]);

  const loadCanvas = useCallback(
    async (canvas: CanvasSummary) => {
      setActiveCanvas(canvas);
      const response = await fetch(appPath(`/api/canvases/${canvas.id}`));
      const json = await response.json();
      if (json.canvas?.nodes?.length) {
        setNodes(json.canvas.nodes.map(withNodeDefaults));
        setEdges(json.canvas.edges ?? []);
      } else {
        setNodes(initialNodes.map(withNodeDefaults));
        setEdges(initialEdges);
      }
      setSelectedNodeId(json.canvas?.nodes?.[0]?.id ?? "gen-1");
    },
    [setEdges, setNodes]
  );

  const loadWorkspace = useCallback(async () => {
    const [modelsResponse, canvasesResponse] = await Promise.all([fetch(appPath("/api/models")), fetch(appPath("/api/canvases"))]);
    if (!modelsResponse.ok || !canvasesResponse.ok) return;
    const modelsJson = (await modelsResponse.json()) as { models: ModelOption[] };
    const canvasesJson = (await canvasesResponse.json()) as { canvases: CanvasSummary[] };
    setModels(modelsJson.models);
    setCanvases(canvasesJson.canvases);

    let canvas = canvasesJson.canvases[0];
    if (!canvas) {
      const created = await fetch(appPath("/api/canvases"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "内部 AI 画布" })
      }).then((res) => res.json() as Promise<{ canvas: CanvasSummary }>);
      canvas = created.canvas;
      setCanvases([canvas]);
    }
    await loadCanvas(canvas);
  }, [loadCanvas]);

  useEffect(() => {
    fetch(appPath("/api/auth/me"))
      .then((res) => res.json())
      .then((data: { user: SessionUser | null }) => {
        setUser(data.user);
        if (data.user) void loadWorkspace();
      });
  }, [loadWorkspace]);

  useEffect(() => {
    if (!models[0]) return;
    const firstImageModel = models.find((model) => model.type === "image");
    const firstVideoModel = models.find((model) => model.type === "video");
    setNodes((current) =>
      current.map((node) => {
        if (node.type === "imageGen" && !node.data.modelId && firstImageModel) {
          return {
            ...withNodeDefaults(node),
            data: {
              ...node.data,
              modelId: firstImageModel.id,
              size: node.data.size ?? "1024x1024",
              aspectRatio: node.data.aspectRatio ?? "1:1",
              resolution: node.data.resolution ?? firstImageModel.supportedSizes[0] ?? "1K",
              width: node.data.width ?? 1024,
              height: node.data.height ?? 1024
            }
          };
        }
        if (node.type === "videoGen" && !node.data.modelId && firstVideoModel) {
          return {
            ...withNodeDefaults(node),
            data: {
              ...node.data,
              modelId: firstVideoModel.id,
              aspectRatio: node.data.aspectRatio ?? "16:9",
              resolution: node.data.resolution ?? firstVideoModel.supportedSizes[0] ?? "1080p",
              size: node.data.size ?? firstVideoModel.supportedSizes[0] ?? "1080p",
              duration: node.data.duration ?? 5,
              fps: node.data.fps ?? 24
            }
          };
        }
        return node;
      })
    );
  }, [models, setNodes]);

  const persistCanvas = useCallback(
    async (nextNodes = nodes, nextEdges = edges) => {
      if (!activeCanvas) return false;
      setSaving(true);
      const response = await fetch(appPath(`/api/canvases/${activeCanvas.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: activeCanvas.title, nodes: nextNodes, edges: nextEdges })
      });
      setSaving(false);
      setToast(response.ok ? "画布已保存" : "保存失败");
      return response.ok;
    },
    [activeCanvas, edges, nodes]
  );

  useEffect(() => {
    setNodes((current) => {
      let changed = false;
      const next = current.map((node) => {
        if (node.type !== "output") return node;
        const incoming = edges.find((edge) => edge.target === node.id && edge.targetHandle === "asset");
        const source = current.find((item) => item.id === incoming?.source);
        const patch: CanvasNodeData = source?.data.assetUrl
          ? {
              assetId: source.data.assetId,
              assetUrl: source.data.assetUrl,
              assetMimeType: source.data.assetMimeType,
              resolvedPrompt: source.data.resolvedPrompt ?? source.data.prompt,
              size: source.data.size,
              aspectRatio: source.data.aspectRatio,
              resolution: source.data.resolution,
              width: source.data.width,
              height: source.data.height
            }
          : { assetId: undefined, assetUrl: undefined, assetMimeType: undefined, resolvedPrompt: undefined };
        const isDifferent = Object.entries(patch).some(([key, value]) => node.data[key as keyof CanvasNodeData] !== value);
        if (!isDifferent) return node;
        changed = true;
        return { ...node, data: { ...node.data, ...patch } };
      });
      return changed ? next : current;
    });
  }, [edges, nodes, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = nodes.find((node) => node.id === connection.source);
      const target = nodes.find((node) => node.id === connection.target);
      if (!source || !target || !validateConnection(source.type ?? "", target.type ?? "", connection.targetHandle)) {
        setToast("这两个端口类型不匹配");
        return;
      }
      setEdges((current) => {
        const allowMultiple = connection.targetHandle === "prompt";
        const withoutSameTarget = allowMultiple
          ? current
          : current.filter((edge) => !(edge.target === connection.target && edge.targetHandle === connection.targetHandle));
        return addEdge({ ...connection, id: `${connection.source}-${connection.target}-${connection.targetHandle}` }, withoutSameTarget);
      });
    },
    [nodes, setEdges]
  );

  const addNode = (type: NodeKind) => {
    const id = `${type}-${Date.now()}`;
    const derivedSize = deriveSize("1:1", "1K");
    const dimensions = getNodeDimensions(type);
    const firstImageModel = models.find((model) => model.type === "image");
    const firstVideoModel = models.find((model) => model.type === "video");
    const baseData: CanvasNodeData =
      type === "imageGen"
        ? {
            label: "生图节点",
            modelId: firstImageModel?.id,
            size: derivedSize.size,
            aspectRatio: "1:1",
            resolution: firstImageModel?.supportedSizes[0] ?? "1K",
            width: derivedSize.width,
            height: derivedSize.height,
            count: 1
          }
        : type === "videoGen"
          ? {
              label: "视频节点",
              modelId: firstVideoModel?.id,
              size: firstVideoModel?.supportedSizes[0] ?? "1080p",
              aspectRatio: "16:9",
              resolution: firstVideoModel?.supportedSizes[0] ?? "1080p",
              duration: 5,
              fps: 24,
              count: 1
            }
        : type === "prompt"
          ? { label: "提示词", prompt: "写下新的创意方向" }
          : type === "asset"
            ? { label: "素材" }
            : { label: "输出" };
    const node: CanvasFlowNode = {
      id,
      type,
      position: { x: 180 + nodes.length * 32, y: 140 + nodes.length * 24 },
      width: dimensions.width,
      height: dimensions.height,
      data: baseData
    };
    setNodes((current) => [...current, node]);
    setSelectedNodeId(id);
    setContextMenu(null);
    setToast("已添加节点");
  };

  const updateSelectedData = (patch: CanvasNodeData) => {
    if (!selectedNode) return;
    setNodes((current) => current.map((node) => (node.id === selectedNode.id ? { ...node, data: { ...node.data, ...patch } } : node)));
  };

  const updateSelectedVisualSize = (patch: Pick<CanvasNodeData, "aspectRatio" | "resolution" | "width" | "height">) => {
    if (!selectedNode) return;
    const nextAspect = patch.aspectRatio ?? selectedNode.data.aspectRatio ?? "1:1";
    const nextResolution = patch.resolution ?? selectedNode.data.resolution ?? "1K";
    if (patch.width || patch.height) {
      const width = patch.width ?? selectedNode.data.width ?? deriveSize(nextAspect, nextResolution).width;
      const height = patch.height ?? selectedNode.data.height ?? deriveSize(nextAspect, nextResolution).height;
      updateSelectedData({ ...patch, width, height, size: `${width}x${height}` });
      return;
    }
    const nextSize = deriveSize(nextAspect, nextResolution);
    updateSelectedData({ ...patch, aspectRatio: nextAspect, resolution: nextResolution, ...nextSize });
  };

  const connectNearestPrompt = () => {
    if (!selectedNode || (selectedNode.type !== "imageGen" && selectedNode.type !== "videoGen")) return;
    const promptNode = nodes
      .filter((node) => node.type === "prompt")
      .sort((a, b) => Math.abs(a.position.x - selectedNode.position.x) - Math.abs(b.position.x - selectedNode.position.x))[0];
    if (!promptNode) {
      setToast("请先添加提示词节点");
      return;
    }
    setEdges((current) => {
      const id = `${promptNode.id}-${selectedNode.id}-prompt`;
      if (current.some((edge) => edge.id === id)) return current;
      return addEdge({ id, source: promptNode.id, target: selectedNode.id, sourceHandle: "text", targetHandle: "prompt" }, current);
    });
    setToast("已连接提示词到当前生图节点");
  };

  const duplicateSelected = () => {
    if (!selectedNode) return;
    const copyId = `${selectedNode.type}-${Date.now()}`;
    const copy: CanvasFlowNode = {
      ...selectedNode,
      id: copyId,
      selected: false,
      position: { x: selectedNode.position.x + 42, y: selectedNode.position.y + 42 },
      data: { ...selectedNode.data, label: `${selectedNode.data.label ?? "节点"} 副本` }
    };
    setNodes((current) => [...current, copy]);
    setSelectedNodeId(copyId);
    setToast("已复制节点");
  };

  const deleteSelected = () => {
    if (!selectedNode) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNodeId(null);
    setContextMenu(null);
    setToast("已删除节点");
  };

  const deleteEdge = (edgeId?: string) => {
    if (!edgeId) return;
    setEdges((current) => current.filter((edge) => edge.id !== edgeId));
    setContextMenu(null);
    setToast("已删除连线");
  };

  const deleteNodeById = (nodeId?: string) => {
    if (!nodeId) return;
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    setContextMenu(null);
    setToast("已删除节点");
  };

  const duplicateNodeById = (nodeId?: string) => {
    const source = nodes.find((node) => node.id === nodeId);
    if (!source) return;
    const copyId = `${source.type}-${Date.now()}`;
    const copy: CanvasFlowNode = {
      ...source,
      id: copyId,
      selected: false,
      position: { x: source.position.x + 42, y: source.position.y + 42 },
      data: { ...source.data, label: `${source.data.label ?? "节点"} 副本` }
    };
    setNodes((current) => [...current, copy]);
    setSelectedNodeId(copyId);
    setContextMenu(null);
    setToast("已复制节点");
  };

  const connectNodeToFirstOutput = (nodeId?: string) => {
    const source = nodes.find((node) => node.id === nodeId);
    const output = nodes.find((node) => node.type === "output");
    if (!source || !output || !validateConnection(source.type ?? "", output.type ?? "", "asset")) return;
    setEdges((current) => {
      const next = current.filter((edge) => !(edge.target === output.id && edge.targetHandle === "asset"));
      return addEdge({ id: `${source.id}-${output.id}-asset`, source: source.id, target: output.id, sourceHandle: source.type === "videoGen" ? "video" : "image", targetHandle: "asset" }, next);
    });
    setContextMenu(null);
    setToast("已连接到输出节点");
  };

  const downloadAsset = async (assetUrl?: string, label = "asset") => {
    if (!assetUrl) return;
    const response = await fetch(assetUrl);
    if (!response.ok) {
      setToast("下载失败");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const extension = blob.type.includes("svg") ? "svg" : blob.type.includes("jpeg") ? "jpg" : "png";
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label || "asset"}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setContextMenu(null);
    setToast("图片已开始下载");
  };

  const resetCanvas = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedNodeId("gen-1");
    setJobs([]);
    setToast("画布已重置");
  };

  const uploadAsset = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(appPath("/api/assets/upload"), { method: "POST", body: formData });
    const json = await response.json();
    if (!response.ok || !json.asset) {
      setToast(json.message ?? "上传失败");
      return;
    }
    if (selectedNode?.type === "asset") {
      updateSelectedData({ assetId: json.asset.id, assetUrl: `${appPath(json.asset.url)}?t=${Date.now()}` });
    } else {
      const id = `asset-${Date.now()}`;
      setNodes((current) => [
        ...current,
        {
          id,
          type: "asset",
          position: { x: 220 + current.length * 20, y: 180 + current.length * 18 },
          width: nodeDimensions.asset.width,
          height: nodeDimensions.asset.height,
          data: { label: file.name, assetId: json.asset.id, assetUrl: `${appPath(json.asset.url)}?t=${Date.now()}` }
        }
      ]);
      setSelectedNodeId(id);
    }
    setToast("素材已上传");
  };

  const runGeneration = async () => {
    if (!activeCanvas || !selectedNode || (selectedNode.type !== "imageGen" && selectedNode.type !== "videoGen")) return;
    const isVideo = selectedNode.type === "videoGen";
    const fallbackModel = selectableModels[0];
    const modelId = selectedNode.data.modelId ?? fallbackModel?.id;
    if (!modelId) {
      setToast("没有可用模型");
      return;
    }
    setGenerating(true);
    const inputs = resolveGenerationInputs(nodes, edges, selectedNode.id);
    const effectivePrompt = inputs.prompt || selectedNode.data.prompt || "企业内部创意素材";
    const effectiveAspect = selectedNode.data.aspectRatio ?? (isVideo ? "16:9" : "1:1");
    const effectiveResolution = selectedNode.data.resolution ?? fallbackModel?.supportedSizes?.[0] ?? (isVideo ? "1080p" : "1K");
    const visualSize = isVideo ? undefined : deriveSize(effectiveAspect, effectiveResolution);
    const effectiveWidth = isVideo ? selectedNode.data.width : selectedNode.data.width ?? visualSize?.width ?? 1024;
    const effectiveHeight = isVideo ? selectedNode.data.height : selectedNode.data.height ?? visualSize?.height ?? 1024;
    const effectiveSize = isVideo ? effectiveResolution : `${effectiveWidth}x${effectiveHeight}`;
    const preparedNodes = nodes.map((node) =>
      node.id === selectedNode.id
        ? {
            ...node,
            data: {
              ...node.data,
              size: effectiveSize,
              aspectRatio: effectiveAspect,
              resolution: effectiveResolution,
              width: effectiveWidth,
              height: effectiveHeight,
              resolvedPrompt: effectivePrompt,
              referenceAssetId: inputs.referenceAssetId,
              jobStatus: "queued",
              error: undefined
            }
          }
        : node
    );
    setNodes(preparedNodes);
    await persistCanvas(preparedNodes, edges);
    const payload = {
      canvasId: activeCanvas.id,
      nodeId: selectedNode.id,
      modelId,
      prompt: effectivePrompt,
      negativePrompt: selectedNode.data.negativePrompt,
      size: effectiveSize,
      aspectRatio: effectiveAspect,
      resolution: effectiveResolution,
      width: effectiveWidth,
      height: effectiveHeight,
      duration: isVideo ? selectedNode.data.duration ?? 5 : undefined,
      fps: isVideo ? selectedNode.data.fps ?? 24 : undefined,
      seed: selectedNode.data.seed,
      count: selectedNode.data.count ?? 1,
      referenceAssetId: inputs.referenceAssetId,
      referenceAssetUrl: inputs.referenceAssetUrl
    };

    const response = await fetch(appPath("/api/generations"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const json = (await response.json()) as { job?: { id: string; status: string }; message?: string };
    setGenerating(false);

    if (!response.ok || !json.job) {
      const error = json.message ?? "提交失败";
      updateSelectedData({ jobStatus: "failed", error });
      setJobs((current) => [{ id: crypto.randomUUID(), nodeId: selectedNode.id, status: "failed", label: "提交失败", error }, ...current]);
      setToast(error);
      return;
    }

    updateSelectedData({ jobId: json.job.id, jobStatus: "queued" });
    setJobs((current) => [{ id: json.job!.id, nodeId: selectedNode.id, status: "queued", label: selectedNode.data.label || "生图节点" }, ...current]);
    setToast("生成任务已提交");
  };

  useEffect(() => {
    const running = jobs.filter((job) => ["queued", "running"].includes(job.status));
    if (!running.length) return;
    const timer = window.setInterval(async () => {
      for (const job of running) {
        const response = await fetch(appPath(`/api/generations/${job.id}`));
        if (!response.ok) continue;
        const json = (await response.json()) as {
          job: { id: string; status: string; error?: string; asset?: { id: string; url: string; mimeType?: string; width?: number; height?: number } | null };
        };
        setJobs((current) => current.map((item) => (item.id === job.id ? { ...item, status: json.job.status, error: json.job.error } : item)));
        setNodes((current) =>
          current.map((node) =>
            node.id === job.nodeId
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    assetId: json.job.asset?.id ?? node.data.assetId,
                    assetUrl: json.job.asset ? `${appPath(json.job.asset.url)}?t=${Date.now()}` : node.data.assetUrl,
                    assetMimeType: json.job.asset?.mimeType ?? node.data.assetMimeType,
                    width: json.job.asset?.width ?? node.data.width,
                    height: json.job.asset?.height ?? node.data.height,
                    jobStatus: json.job.status,
                    error: json.job.error
                  }
                }
              : node
          )
        );
        if (json.job.status === "succeeded") setToast("生成完成");
        if (json.job.status === "failed") setToast(json.job.error ?? "生成失败");
      }
    }, 1200);
    return () => window.clearInterval(timer);
  }, [jobs, setNodes]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    const response = await fetch(appPath("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(login)
    });
    const json = await response.json();
    if (!response.ok) {
      setLoginError(json.message ?? "登录失败");
      return;
    }
    setUser(json.user);
    await loadWorkspace();
  }

  async function logout() {
    await fetch(appPath("/api/auth/logout"), { method: "POST" });
    setUser(null);
  }

  if (!user) {
    return (
      <main className="login-shell">
        <form className="login-panel" onSubmit={handleLogin}>
          <div className="brand-mark">
            <Sparkles size={24} />
          </div>
          <h1>企业 AI 画布</h1>
          <p>内部生图工作台，支持节点画布、模型选择、素材上传和连线传参。</p>
          <label>
            邮箱
            <input value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} />
          </label>
          <label>
            密码
            <input type="password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} />
          </label>
          {loginError ? <div className="form-error">{loginError}</div> : null}
          <button className="primary-button" type="submit">
            <KeyRound size={16} />
            登录工作台
          </button>
        </form>
      </main>
    );
  }

  const contextNode = contextMenu?.nodeId ? nodes.find((node) => node.id === contextMenu.nodeId) : null;

  return (
    <main className="app-shell">
      <aside className="left-rail">
        <div className="app-title">
          <Sparkles size={18} />
          <strong>AI Canvas</strong>
        </div>
        <section>
          <h2>节点</h2>
          <button onClick={() => addNode("prompt")}>提示词</button>
          <button onClick={() => addNode("imageGen")}>生图</button>
          <button onClick={() => addNode("videoGen")}>视频</button>
          <button onClick={() => addNode("asset")}>素材</button>
          <button onClick={() => addNode("output")}>输出</button>
        </section>
        <section>
          <h2>模型</h2>
          {models.map((model) => (
            <div className="model-chip" key={model.id}>
              <Sparkles size={14} />
              <span>{model.name}</span>
              <small>{model.provider.name}</small>
            </div>
          ))}
        </section>
        <section>
          <h2>画布</h2>
          {canvases.map((canvas) => (
            <button className={clsx("canvas-switch", activeCanvas?.id === canvas.id && "active")} key={canvas.id} onClick={() => void loadCanvas(canvas)}>
              <Layers size={15} />
              {canvas.title}
            </button>
          ))}
        </section>
      </aside>

      <section className="canvas-stage">
        <header className="topbar">
          <div>
            <strong>{activeCanvas?.title ?? "内部 AI 画布"}</strong>
            <span>{user.name} · {user.role === "admin" ? "管理员" : "成员"} · {toast}</span>
          </div>
          <div className="topbar-actions">
            {user.role === "admin" ? (
              <>
                <Link className="topbar-link" href="/admin/models">
                  <Settings size={16} />
                  模型 API
                </Link>
                <Link className="topbar-link" href="/admin/dashboard">
                  <Layers size={16} />
                  数据看板
                </Link>
              </>
            ) : null}
            <button onClick={() => void persistCanvas()} disabled={saving}>
              {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
              保存
            </button>
            <button onClick={duplicateSelected} disabled={!selectedNode}>
              <Copy size={16} />
              复制
            </button>
            <button onClick={deleteSelected} disabled={!selectedNode}>
              <Trash2 size={16} />
              删除
            </button>
            <button onClick={resetCanvas}>
              <Boxes size={16} />
              重置
            </button>
            <button onClick={logout}>
              <LogOut size={16} />
              退出
            </button>
          </div>
        </header>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id);
            setContextMenu(null);
          }}
          onNodeContextMenu={(event, node) => {
            event.preventDefault();
            setSelectedNodeId(node.id);
            setContextMenu({ type: "node", nodeId: node.id, x: event.clientX, y: event.clientY });
          }}
          onEdgeContextMenu={(event, edge) => {
            event.preventDefault();
            setContextMenu({ type: "edge", edgeId: edge.id, x: event.clientX, y: event.clientY });
          }}
          onPaneContextMenu={(event) => {
            event.preventDefault();
            setContextMenu({ type: "pane", x: event.clientX, y: event.clientY });
          }}
          onPaneClick={() => {
            setSelectedNodeId(null);
            setContextMenu(null);
          }}
          fitView
        >
          <Background color="#d3d8e1" gap={24} />
          <Controls />
          <MiniMap pannable zoomable />
          <Panel position="top-center">
            <div className="floating-tools">
              <button onClick={() => addNode("prompt")}>提示词</button>
              <button onClick={() => addNode("imageGen")}>生图</button>
              <button onClick={() => addNode("videoGen")}>视频</button>
              <button onClick={() => uploadInputRef.current?.click()}>上传素材</button>
              <button onClick={runGeneration} disabled={(selectedNode?.type !== "imageGen" && selectedNode?.type !== "videoGen") || generating}>
                {generating ? "提交中" : "生成"}
              </button>
            </div>
          </Panel>
          <Panel position="bottom-center">
            <div className="job-strip">
              {jobs.length ? (
                jobs.slice(0, 5).map((job) => (
                  <span key={job.id} className={clsx("job-pill", job.status)} title={job.error}>
                    {["queued", "running"].includes(job.status) ? <Loader2 className="spin" size={14} /> : <Check size={14} />}
                    {job.label}: {job.status}
                  </span>
                ))
              ) : (
                <span className="job-pill idle">任务状态会显示在这里</span>
              )}
            </div>
          </Panel>
        </ReactFlow>
        {contextMenu ? (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => undefined}>
            {contextMenu.type === "pane" ? (
              <>
                <button onClick={() => addNode("prompt")}>
                  <Sparkles size={14} />
                  新增提示词
                </button>
                <button onClick={() => addNode("imageGen")}>
                  <Sparkles size={14} />
                  新增生图节点
                </button>
                <button onClick={() => addNode("videoGen")}>
                  <Video size={14} />
                  新增视频节点
                </button>
                <button onClick={() => addNode("asset")}>
                  <ImageIcon size={14} />
                  新增素材节点
                </button>
                <button onClick={() => addNode("output")}>
                  <Check size={14} />
                  新增输出节点
                </button>
              </>
            ) : null}
            {contextMenu.type === "node" ? (
              <>
                <button onClick={() => duplicateNodeById(contextMenu.nodeId)}>
                  <Copy size={14} />
                  复制节点
                </button>
                {contextNode?.type === "asset" || contextNode?.type === "imageGen" || contextNode?.type === "videoGen" ? (
                  <button onClick={() => connectNodeToFirstOutput(contextMenu.nodeId)}>
                    <Link2 size={14} />
                    接到输出节点
                  </button>
                ) : null}
                {contextNode?.data.assetUrl ? (
                  <button onClick={() => void downloadAsset(contextNode.data.assetUrl, contextNode.data.label ?? "asset")}>
                    <Download size={14} />
                    下载图片
                  </button>
                ) : null}
                <button className="danger-menu-item" onClick={() => deleteNodeById(contextMenu.nodeId)}>
                  <Trash2 size={14} />
                  删除节点
                </button>
              </>
            ) : null}
            {contextMenu.type === "edge" ? (
              <button className="danger-menu-item" onClick={() => deleteEdge(contextMenu.edgeId)}>
                <Trash2 size={14} />
                删除连线
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside className="right-panel">
        <div className="panel-title">
          <Settings size={17} />
          <strong>属性编辑</strong>
        </div>
        <input
          ref={uploadInputRef}
          className="hidden-input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadAsset(file);
            event.currentTarget.value = "";
          }}
        />
        {selectedNode ? (
          <div className="property-stack">
            <label>
              节点名称
              <input value={selectedNode.data.label ?? ""} onChange={(event) => updateSelectedData({ label: event.target.value })} />
            </label>
            {(selectedNode.type === "prompt" || selectedNode.type === "imageGen" || selectedNode.type === "videoGen") && (
              <label>
                提示词
                <textarea value={selectedNode.data.prompt ?? ""} onChange={(event) => updateSelectedData({ prompt: event.target.value })} />
              </label>
            )}
            {selectedNode.type === "prompt" ? (
              <div className="inspector-note">
                <strong>传参方式</strong>
                <span>从提示词节点右侧“文本输出”拖线到生图节点左侧“提示词输入”。连接后，生成时会把这个提示词传给下游生图节点。</span>
              </div>
            ) : null}
            {selectedNode.type === "asset" && (
              <button className="secondary-button" onClick={() => uploadInputRef.current?.click()}>
                <Upload size={16} />
                上传或替换素材
              </button>
            )}
            {selectedNode.type === "videoGen" && (
              <>
                <label>
                  Seedance 模型
                  <select
                    value={selectedNode.data.modelId ?? selectableModels[0]?.id ?? ""}
                    onChange={(event) => {
                      const nextModel = selectableModels.find((model) => model.id === event.target.value);
                      updateSelectedData({
                        modelId: event.target.value,
                        resolution: nextModel?.supportedSizes?.[0] ?? "1080p",
                        size: nextModel?.supportedSizes?.[0] ?? "1080p"
                      });
                    }}
                  >
                    {selectableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.provider.name} · {model.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="inspector-section">
                  <div className="section-title">视频画面</div>
                  <div className="size-grid compact">
                    {["16:9", "9:16", "1:1"].map((ratio) => (
                      <button
                        className={clsx("size-option", (selectedNode.data.aspectRatio ?? "16:9") === ratio && "active")}
                        key={ratio}
                        type="button"
                        onClick={() => updateSelectedData({ aspectRatio: ratio })}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                  <div className="resolution-toggle">
                    {["1080p", "720p"].map((resolution) => (
                      <button
                        className={clsx((selectedNode.data.resolution ?? "1080p") === resolution && "active")}
                        key={resolution}
                        type="button"
                        onClick={() => updateSelectedData({ resolution, size: resolution })}
                      >
                        {resolution}
                      </button>
                    ))}
                  </div>
                  <div className="inline-fields">
                    <label>
                      时长 秒
                      <input
                        type="number"
                        min={3}
                        max={15}
                        value={selectedNode.data.duration ?? 5}
                        onChange={(event) => updateSelectedData({ duration: Number(event.target.value) || 5 })}
                      />
                    </label>
                    <label>
                      FPS
                      <input
                        type="number"
                        min={12}
                        max={30}
                        value={selectedNode.data.fps ?? 24}
                        onChange={(event) => updateSelectedData({ fps: Number(event.target.value) || 24 })}
                      />
                    </label>
                  </div>
                </div>

                <div className="inspector-section">
                  <div className="section-title">输入预览</div>
                  <div className="resolved-box">
                    <strong>实际提示词</strong>
                    <p>{selectedGenerationInputs?.prompt || selectedNode.data.prompt || "还没有提示词输入"}</p>
                    <strong>参考图 / 首帧</strong>
                    <p>{selectedGenerationInputs?.referenceAssetId ? "已连接参考图" : "未连接参考图"}</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={connectNearestPrompt}>
                    <Link2 size={16} />
                    连接最近提示词
                  </button>
                </div>

                <button className="primary-button" onClick={runGeneration} disabled={generating}>
                  {generating ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                  生成视频
                </button>
              </>
            )}
            {selectedNode.type === "imageGen" && (
              <>
                <label>
                  模型
                  <select
                    value={selectedNode.data.modelId ?? selectableModels[0]?.id ?? ""}
                    onChange={(event) => {
                      const nextModel = models.find((model) => model.id === event.target.value);
                      const nextResolution = nextModel?.supportedSizes?.[0] ?? selectedNode.data.resolution ?? "1K";
                      const nextSize = deriveSize(selectedNode.data.aspectRatio ?? "1:1", nextResolution);
                      updateSelectedData({ modelId: event.target.value, resolution: nextResolution, ...nextSize });
                    }}
                  >
                    {selectableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.provider.name} · {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="inspector-section size-picker">
                  <div className="section-title">选择比例</div>
                  <div className="ratio-grid">
                    {aspectRatios.map((ratio) => (
                      <button
                        className={clsx("ratio-option", (selectedNode.data.aspectRatio ?? "1:1") === ratio.label && "active")}
                        key={ratio.label}
                        type="button"
                        onClick={() => updateSelectedVisualSize({ aspectRatio: ratio.label })}
                      >
                        <span className="ratio-icon" style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }} />
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                  <div className="section-title">选择分辨率</div>
                  <div className="resolution-toggle">
                    {resolutionOptions
                      .filter((option) => !sizeOptions.length || sizeOptions.includes(option.value) || option.value === "1K" || option.value === "2K")
                      .map((option) => (
                        <button
                          className={clsx((selectedNode.data.resolution ?? sizeOptions[0] ?? "1K") === option.value && "active")}
                          key={option.value}
                          type="button"
                          onClick={() => updateSelectedVisualSize({ resolution: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                  </div>
                  <div className="section-title">尺寸</div>
                  <div className="dimension-row">
                    <label>
                      W
                      <input
                        type="number"
                        min={64}
                        value={selectedNode.data.width ?? deriveSize(selectedNode.data.aspectRatio ?? "1:1", selectedNode.data.resolution ?? "1K").width}
                        onChange={(event) => updateSelectedVisualSize({ width: Number(event.target.value) || 64 })}
                      />
                    </label>
                    <span className="dimension-link">
                      <Link2 size={16} />
                    </span>
                    <label>
                      H
                      <input
                        type="number"
                        min={64}
                        value={selectedNode.data.height ?? deriveSize(selectedNode.data.aspectRatio ?? "1:1", selectedNode.data.resolution ?? "1K").height}
                        onChange={(event) => updateSelectedVisualSize({ height: Number(event.target.value) || 64 })}
                      />
                    </label>
                    <span className="dimension-unit">PX</span>
                  </div>
                  <div className="field-help">Seedream 会按 1K/2K/4K 提交，画布同时保存比例和目标宽高；Mock 模型会直接按 W/H 生成预览。</div>
                </div>
                <div className="inspector-section">
                  <div className="section-title">输入预览</div>
                  <div className="resolved-box">
                    <strong>实际提示词</strong>
                    <p>{selectedGenerationInputs?.prompt || selectedNode.data.prompt || "还没有提示词输入"}</p>
                    <strong>参考图</strong>
                    <p>{selectedGenerationInputs?.referenceAssetId ? "已连接参考图" : "未连接参考图"}</p>
                  </div>
                  <button className="secondary-button" type="button" onClick={connectNearestPrompt}>
                    <Link2 size={16} />
                    连接最近提示词
                  </button>
                </div>
                <label>
                  负面词
                  <textarea value={selectedNode.data.negativePrompt ?? ""} onChange={(event) => updateSelectedData({ negativePrompt: event.target.value })} />
                </label>
                <div className="inline-fields">
                  <label>
                    Seed
                    <input
                      type="number"
                      value={selectedNode.data.seed ?? ""}
                      onChange={(event) => updateSelectedData({ seed: event.target.value ? Number(event.target.value) : undefined })}
                    />
                  </label>
                  <label>
                    数量
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={selectedNode.data.count ?? 1}
                      onChange={(event) => updateSelectedData({ count: Number(event.target.value) })}
                    />
                  </label>
                </div>
                <button className="primary-button" onClick={runGeneration} disabled={generating}>
                  {generating ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                  生成素材
                </button>
              </>
            )}
            <div className="panel-actions">
              <button onClick={duplicateSelected}>
                <Copy size={16} />
                复制节点
              </button>
              <button onClick={deleteSelected}>
                <Trash2 size={16} />
                删除节点
              </button>
            </div>
            {selectedNode.data.assetUrl ? (
              <div className="asset-inspector-card">
                <img className="asset-inspector" src={selectedNode.data.assetUrl} alt="节点素材" />
                <div className="asset-inspector-meta">
                  <span>{selectedNode.data.width && selectedNode.data.height ? `${selectedNode.data.width}x${selectedNode.data.height}` : selectedNode.data.size ?? "图片素材"}</span>
                  <button className="secondary-button" onClick={() => void downloadAsset(selectedNode.data.assetUrl, selectedNode.data.label ?? "asset")}>
                    <Download size={16} />
                    下载图片
                  </button>
                </div>
                {selectedNode.type === "output" && selectedNode.data.resolvedPrompt ? (
                  <div className="resolved-box">
                    <strong>来源提示词</strong>
                    <p>{selectedNode.data.resolvedPrompt}</p>
                    <strong>生成参数</strong>
                    <p>
                      {selectedNode.data.aspectRatio ?? "未记录比例"} · {selectedNode.data.resolution ?? "未记录分辨率"} ·{" "}
                      {selectedNode.data.width && selectedNode.data.height ? `${selectedNode.data.width}x${selectedNode.data.height}` : selectedNode.data.size}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedNode.data.error ? <div className="form-error">{selectedNode.data.error}</div> : null}
          </div>
        ) : (
          <div className="empty-inspector">
            <Plus size={18} />
            选择一个节点开始编辑
          </div>
        )}
      </aside>
    </main>
  );
}
