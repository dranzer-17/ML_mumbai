"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { getApiUrl } from "@/lib/api";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  GitBranch,
  CheckCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCcw,
  FileText,
  Link as LinkIcon,
  Upload,
  ArrowLeft,
  Download,
  History,
  X,
  Edit3,
  Save,
  Plus,
  Minus,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface PastWorkflow {
  workflow_id: number;
  content_source: string;
  created_at: string;
}

type InputMode = "text" | "pdf" | "url";

// Node color palette
const NODE_COLORS = [
  { bg: '#fef08a', border: '#facc15', text: '#713f12' }, // yellow
  { bg: '#86efac', border: '#4ade80', text: '#14532d' }, // green
  { bg: '#93c5fd', border: '#3b82f6', text: '#1e3a8a' }, // blue
  { bg: '#fda4af', border: '#f43f5e', text: '#881337' }, // rose
  { bg: '#c4b5fd', border: '#8b5cf6', text: '#4c1d95' }, // purple
  { bg: '#fed7aa', border: '#fb923c', text: '#7c2d12' }, // orange
  { bg: '#a5f3fc', border: '#06b6d4', text: '#164e63' }, // cyan
  { bg: '#fbbf24', border: '#f59e0b', text: '#78350f' }, // amber
];

export default function WorkflowPage() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState<"input" | "preview">("input");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Input Data
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // Workflow Data
  const [mermaidCode, setMermaidCode] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [contentSource, setContentSource] = useState("text");
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  
  // React Flow State
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // History Data
  const [pastWorkflows, setPastWorkflows] = useState<PastWorkflow[]>([]);
  const [showPastWorkflows, setShowPastWorkflows] = useState(false);
  const [loadingPastWorkflows, setLoadingPastWorkflows] = useState(false);

  // Parse Mermaid code to React Flow format
  const parseMermaidToFlow = (mermaidCode: string) => {
    const lines = mermaidCode.split('\n').filter(line => line.trim() && !line.trim().startsWith('flowchart'));
    const nodeMap = new Map<string, { label: string; isDiamond: boolean }>();
    const nodeOrder: string[] = []; // Track order of nodes as they appear
    const edgeList: { source: string; target: string; label?: string }[] = [];

    // Parse nodes and edges
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // FIRST: Extract all node definitions from the entire line (both square and diamond)
      // Match diamond nodes: A{{text}}
      const diamondMatches = [...trimmedLine.matchAll(/([A-Z]+)\{\{([^}]+)\}\}/g)];
      diamondMatches.forEach(match => {
        const id = match[1];
        const label = match[2].trim();
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { label, isDiamond: true });
          nodeOrder.push(id);
        }
      });
      
      // Match square bracket nodes: A[text]
      const squareMatches = [...trimmedLine.matchAll(/([A-Z]+)\[([^\]]+)\]/g)];
      squareMatches.forEach(match => {
        const id = match[1];
        const label = match[2].trim();
        if (!nodeMap.has(id)) {
          nodeMap.set(id, { label, isDiamond: false });
          nodeOrder.push(id);
        }
      });

      // SECOND: Parse ALL types of connections
      // Try multiple patterns to catch all connection formats
      
      // Pattern 1: A[...] -->|label| B[...] (with label and full brackets)
      let connectionMatch = trimmedLine.match(/([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*\|([^\|]+)\|\s*([A-Z]+)[\[{]+/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[3].trim(),
          label: connectionMatch[2].trim()
        });
        return;
      }
      
      // Pattern 2: A[...] --> B[...] (with full brackets on both sides)
      connectionMatch = trimmedLine.match(/([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*([A-Z]+)[\[{]+/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim()
        });
        return;
      }
      
      // Pattern 3: A --> B[...] (source without brackets, target with brackets)
      connectionMatch = trimmedLine.match(/([A-Z]+)\s+-->\s+([A-Z]+)[\[{]/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim()
        });
        return;
      }
      
      // Pattern 4: A --> B (simple, no brackets at all)
      connectionMatch = trimmedLine.match(/([A-Z]+)\s*-->\s*([A-Z]+)/);
      if (connectionMatch) {
        edgeList.push({
          source: connectionMatch[1].trim(),
          target: connectionMatch[2].trim()
        });
      }
    });

    // FALLBACK: If no edges were parsed, create sequential connections based on node order
    if (edgeList.length === 0 && nodeOrder.length > 1) {
      console.log('No edges found, creating sequential connections');
      for (let i = 0; i < nodeOrder.length - 1; i++) {
        edgeList.push({
          source: nodeOrder[i],
          target: nodeOrder[i + 1]
        });
      }
    }

    console.log('=== PARSING DEBUG ===');
    console.log('Raw mermaid code:', mermaidCode);
    console.log('Parsed nodes:', Array.from(nodeMap.entries()));
    console.log('Node order:', nodeOrder);
    console.log('Parsed edges:', edgeList);
    console.log('===================');

    // Convert to React Flow nodes
    const flowNodes: Node[] = [];
    let colorIndex = 0;
    nodeMap.forEach((data, id) => {
      const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
      colorIndex++;
      
      if (data.isDiamond) {
        // Diamond node (decision) - using clip-path instead of rotation
        flowNodes.push({
          id,
          type: 'default',
          data: { 
            label: (
              <div style={{ 
                width: '100%', 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {data.label}
              </div>
            ) 
          },
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: color.bg,
            border: `4px solid ${color.border}`,
            borderRadius: '0',
            padding: '0',
            fontWeight: 'bold',
            color: color.text,
            fontSize: '13px',
            boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.9)',
            clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
            width: 150,
            height: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }
        });
      } else {
        // Rectangle node
        flowNodes.push({
          id,
          type: 'default',
          data: { label: data.label },
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            background: color.bg,
            border: `4px solid ${color.border}`,
            borderRadius: '8px',
            padding: '16px 20px',
            fontWeight: 'bold',
            color: color.text,
            fontSize: '14px',
            boxShadow: '6px 6px 0px 0px rgba(0,0,0,0.9)',
            minWidth: 200,
            textAlign: 'center',
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }
        });
      }
    });

    // Convert to React Flow edges with animated style
    const flowEdges: Edge[] = edgeList.map((edge, idx) => ({
      id: `e${idx}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: '#000', 
        strokeWidth: 3,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#000',
        width: 20,
        height: 20,
      },
      labelStyle: {
        fill: '#000',
        fontWeight: 'bold',
        fontSize: 12,
      },
      labelBgStyle: {
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2,
        fillOpacity: 1
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 3
    }));

    // Apply hierarchical layout
    const layoutNodes = applyHierarchicalLayout(flowNodes, flowEdges);
    
    return { nodes: layoutNodes, edges: flowEdges };
  };

  // Simple hierarchical layout algorithm
  const applyHierarchicalLayout = (nodes: Node[], edges: Edge[]) => {
    const levels = new Map<string, number>();
    const visited = new Set<string>();
    
    // Find root nodes (nodes with no incoming edges)
    const incomingCount = new Map<string, number>();
    nodes.forEach(n => incomingCount.set(n.id, 0));
    edges.forEach(e => {
      incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });
    
    // Get all root nodes and sort them alphabetically (A, B, C...)
    let roots = nodes.filter(n => incomingCount.get(n.id) === 0);
    roots.sort((a, b) => a.id.localeCompare(b.id));
    
    if (roots.length === 0 && nodes.length > 0) {
      // If no roots found, use first node alphabetically
      const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));
      roots = [sortedNodes[0]];
    }
    
    console.log('Root nodes:', roots.map(r => r.id));
    console.log('All edges:', edges);
    
    // BFS to assign levels - start from the FIRST root only
    const queue = [{ id: roots[0].id, level: 0 }];
    
    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      levels.set(id, level);
      
      // Add children to queue
      edges.forEach(e => {
        if (e.source === id && !visited.has(e.target)) {
          queue.push({ id: e.target, level: level + 1 });
        }
      });
    }
    
    console.log('Node levels:', Object.fromEntries(levels));
    
    // Handle any remaining disconnected nodes
    nodes.forEach(node => {
      if (!levels.has(node.id)) {
        levels.set(node.id, 0);
      }
    });
    
    // Group nodes by level
    const levelGroups = new Map<number, string[]>();
    levels.forEach((level, id) => {
      if (!levelGroups.has(level)) levelGroups.set(level, []);
      levelGroups.get(level)!.push(id);
    });
    
    // Sort nodes within each level alphabetically
    levelGroups.forEach(nodeIds => nodeIds.sort());
    
    console.log('Level groups:', Object.fromEntries(levelGroups));
    
    // Position nodes VERTICALLY
    const horizontalSpacing = 300;
    const verticalSpacing = 200;
    const centerX = 600; // Center of canvas
    
    return nodes.map(node => {
      const level = levels.get(node.id) || 0;
      const nodesInLevel = levelGroups.get(level) || [];
      const indexInLevel = nodesInLevel.indexOf(node.id);
      
      // Calculate x position to center nodes at each level
      const totalWidth = (nodesInLevel.length - 1) * horizontalSpacing;
      const startX = centerX - (totalWidth / 2);
      
      return {
        ...node,
        position: {
          x: startX + (indexInLevel * horizontalSpacing),
          y: 80 + (level * verticalSpacing) // VERTICAL positioning by level
        }
      };
    });
  };

  // Update React Flow when mermaid code changes
  useEffect(() => {
    if (mermaidCode && step === "preview") {
      try {
        const { nodes: parsedNodes, edges: parsedEdges } = parseMermaidToFlow(isEditing ? editedCode : mermaidCode);
        setNodes(parsedNodes);
        setEdges(parsedEdges);
      } catch (error) {
        console.error("Failed to parse Mermaid code:", error);
        toast.error("Failed to parse workflow diagram");
      }
    }
  }, [mermaidCode, editedCode, isEditing, step]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // === RESET FUNCTIONS ===
  const resetAll = () => {
    setStep("input");
    setTextInput("");
    setUrlInput("");
    setPdfFile(null);
    setMermaidCode("");
    setOriginalContent("");
    setIsEditing(false);
    setEditedCode("");
  };

  // === INPUT HANDLERS ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  // === GENERATE WORKFLOW ===
  const generateWorkflow = async () => {
    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();

      if (inputMode === "text") {
        formData.append("text", textInput);
      } else if (inputMode === "url") {
        formData.append("url", urlInput);
      } else if (inputMode === "pdf" && pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const res = await axios.post(
        getApiUrl("api/workflow/generate"),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setMermaidCode(res.data.mermaid_code);
      setEditedCode(res.data.mermaid_code);
      setOriginalContent(res.data.original_content);
      setContentSource(res.data.content_source);
      setIsGenerating(false);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate workflow. Please try again.";
      
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || "";
        
        if (status === 429) {
          errorMessage = "API quota exceeded. Please try again later.";
        } else if (status === 400) {
          errorMessage = detail || "Invalid input. Please check your content.";
        } else if (status === 500) {
          errorMessage = detail || "Server error. Please try again later.";
        } else {
          errorMessage = detail || errorMessage;
        }
      }
      
      alert(errorMessage);
      setIsGenerating(false);
    }
  };

  // === SAVE WORKFLOW ===
  const saveWorkflow = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to save workflows");
        return;
      }

      const saveRequest = {
        mermaid_code: isEditing ? editedCode : mermaidCode,
        original_content: originalContent,
        content_source: contentSource
      };

      await axios.post(
        getApiUrl("api/workflow/save"),
        saveRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      toast.success("Workflow saved successfully!");
    } catch (err: any) {
      console.error("Failed to save workflow:", err);
      toast.error("Failed to save workflow");
    }
  };

  // === EDIT WORKFLOW ===
  const toggleEditMode = () => {
    if (isEditing) {
      // Apply changes
      setMermaidCode(editedCode);
      toast.success("Changes applied!");
    }
    setIsEditing(!isEditing);
  };

  // === FETCH PAST WORKFLOWS ===
  const fetchPastWorkflows = async () => {
    if (pastWorkflows.length > 0) {
      setShowPastWorkflows(true);
      return;
    }

    setLoadingPastWorkflows(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to view past workflows");
        return;
      }

      const res = await axios.get(
        getApiUrl("api/workflow/history"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      setPastWorkflows(res.data.workflows || []);
      setShowPastWorkflows(true);
    } catch (err: any) {
      console.error("Failed to fetch past workflows:", err);
      alert("Failed to load workflow history");
    } finally {
      setLoadingPastWorkflows(false);
    }
  };

  const loadPastWorkflow = async (workflow_id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        getApiUrl(`api/workflow/history/${workflow_id}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const wf = res.data.workflow;
      setMermaidCode(wf.mermaid_code);
      setEditedCode(wf.mermaid_code);
      setOriginalContent(wf.original_content || "");
      setContentSource(wf.content_source);
      setShowPastWorkflows(false);
      setStep("preview");
    } catch (err: any) {
      console.error("Failed to load workflow:", err);
      alert("Failed to load workflow");
    }
  };

  // === RENDER INPUT STEP ===
  const renderInputStep = () => (
    <>
      <div className="flex items-center gap-3 mb-6">
        <GitBranch className="fill-black" size={40} />
        <h1 className="text-4xl font-black uppercase">Generate Workflow</h1>
      </div>
      <p className="text-lg font-bold mb-6">
        Create visual workflow diagrams from your content
      </p>

      {/* Input Mode Selection */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setInputMode("text")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border-4 border-black font-black uppercase transition-all ${
            inputMode === "text"
              ? "bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "bg-white hover:bg-gray-100"
          }`}
        >
          <FileText size={20} />
          Text
        </button>
        <button
          onClick={() => setInputMode("pdf")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border-4 border-black font-black uppercase transition-all ${
            inputMode === "pdf"
              ? "bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "bg-white hover:bg-gray-100"
          }`}
        >
          <Upload size={20} />
          PDF
        </button>
        <button
          onClick={() => setInputMode("url")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 border-4 border-black font-black uppercase transition-all ${
            inputMode === "url"
              ? "bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : "bg-white hover:bg-gray-100"
          }`}
        >
          <LinkIcon size={20} />
          URL
        </button>
      </div>

      {/* Input Fields */}
      {inputMode === "text" && (
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Paste your content here (minimum 100 characters)..."
          className="w-full h-64 p-4 border-4 border-black font-bold text-lg focus:outline-none focus:ring-4 focus:ring-yellow-300"
        />
      )}

      {inputMode === "pdf" && (
        <div className="border-4 border-dashed border-black p-8 text-center bg-gray-50">
          <Upload className="mx-auto mb-4" size={48} />
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="inline-block bg-black text-white px-6 py-3 font-black uppercase border-4 border-black hover:bg-gray-800">
              {pdfFile ? pdfFile.name : "Choose PDF File"}
            </span>
          </label>
        </div>
      )}

      {inputMode === "url" && (
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="https://example.com/article"
          className="w-full p-4 border-4 border-black font-bold text-lg focus:outline-none focus:ring-4 focus:ring-yellow-300"
        />
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={generateWorkflow}
          disabled={isGenerating}
          className="flex-1 bg-yellow-300 border-4 border-black px-6 py-4 font-black uppercase text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <GitBranch size={24} />
              Generate Workflow
            </>
          )}
        </button>
        
        <button
          onClick={fetchPastWorkflows}
          disabled={loadingPastWorkflows}
          className="bg-blue-300 border-4 border-black px-6 py-4 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <History size={24} />
          {loadingPastWorkflows ? "Loading..." : "History"}
        </button>
      </div>
    </>
  );

  // === RENDER PREVIEW STEP ===
  const renderPreviewStep = () => (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="fill-green-500" size={40} />
          <h2 className="text-3xl font-black uppercase">Workflow Generated!</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleEditMode}
            className={`px-4 py-2 border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 ${
              isEditing ? "bg-green-300" : "bg-blue-300"
            }`}
          >
            {isEditing ? <><Save size={16} /> Apply</> : <><Edit3 size={16} /> Edit Code</>}
          </button>
        </div>
      </div>

      {/* Workflow Display */}
      {isEditing ? (
        <div className="mb-6">
          <label className="block text-sm font-black uppercase mb-2">Edit Mermaid Code:</label>
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="w-full h-96 p-4 border-4 border-black font-mono text-sm focus:outline-none focus:ring-4 focus:ring-yellow-300"
          />
        </div>
      ) : (
        <div className="border-4 border-black bg-gray-50 mb-6" style={{ height: '700px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
            attributionPosition="bottom-right"
            minZoom={0.2}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { strokeWidth: 3, stroke: '#000' }
            }}
            connectionLineStyle={{ strokeWidth: 3, stroke: '#000' }}
            proOptions={{ hideAttribution: true }}
          >
            <Background 
              color="#000" 
              gap={20} 
              size={2}
              style={{ opacity: 0.1 }}
            />
            <Controls 
              className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white"
              showInteractive={false}
            />
            <MiniMap 
              nodeColor={(node) => {
                const style = node.style as any;
                return style?.background || '#fef08a';
              }}
              className="border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              maskColor="rgba(0,0,0,0.1)"
            />
            <Panel position="top-right" className="flex gap-2">
              <div className="bg-yellow-200 border-4 border-black px-4 py-2 font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                🖱️ DRAG NODES • 🔍 ZOOM • 👆 PAN
              </div>
            </Panel>
          </ReactFlow>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={resetAll}
          className="bg-gray-200 border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
        >
          <RefreshCcw size={20} />
          Start Over
        </button>
        
        <button
          onClick={saveWorkflow}
          className="flex-1 bg-green-300 border-4 border-black px-6 py-3 font-black uppercase text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle size={24} />
          Save Workflow
        </button>
      </div>
    </>
  );

  // === RENDER PAST WORKFLOWS PANEL ===
  const renderPastWorkflowsPanel = () => {
    if (!showPastWorkflows) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b-4 border-black flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase">Workflow History</h2>
            <button
              onClick={() => setShowPastWorkflows(false)}
              className="border-4 border-black p-2 hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {pastWorkflows.length === 0 ? (
              <p className="text-center font-bold text-gray-500">No workflows yet</p>
            ) : (
              <div className="space-y-4">
                {pastWorkflows.map((wf) => (
                  <div
                    key={wf.workflow_id}
                    onClick={() => loadPastWorkflow(wf.workflow_id)}
                    className="border-4 border-black p-4 hover:bg-yellow-50 cursor-pointer transition-all bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-lg">Workflow #{wf.workflow_id}</p>
                        <p className="font-bold text-sm text-gray-600">
                          {wf.content_source.toUpperCase()}
                        </p>
                        <p className="font-bold text-xs text-gray-500 mt-1">
                          {new Date(wf.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowRight size={24} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {step === "input" && renderInputStep()}
      {step === "preview" && renderPreviewStep()}
      {renderPastWorkflowsPanel()}
    </>
  );
}
