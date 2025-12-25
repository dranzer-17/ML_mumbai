"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  MarkerType,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Lightbulb, 
  FileText, 
  Link as LinkIcon, 
  Upload, 
  Loader2, 
  CheckCircle,
  Brain,
  Workflow as WorkflowIcon,
  MessageCircle,
  X,
  Send,
  ArrowRight,
  ClipboardList,
  Layers,
  Image as ImageIcon,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Hand
} from "lucide-react";
import SignLanguageAvatar from "@/components/SignLanguageAvatar";

interface Section {
  heading: string;
  content: string;
  key_points: string[];
  examples: string[];
}

interface Concept {
  term: string;
  definition: string;
  analogy: string;
}

interface Workflow {
  title: string;
  steps: string[];
}

interface Diagram {
  type: string;
  description: string;
  mermaid_code: string;
}

interface ImageSuggestion {
  query: string;
  context: string;
}

interface Reference {
  title: string;
  description: string;
  suggested_search: string;
}

interface ExplanationData {
  title: string;
  summary: string;
  sections: Section[];
  concepts: Concept[];
  workflows: Workflow[];
  diagrams: Diagram[];
  image_suggestions: ImageSuggestion[];
  references: Reference[];
  quiz_topics: string[];
  flashcard_concepts: string[];
  original_content: string;
  content_source: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

// Parse Mermaid code to React Flow format
const parseMermaidToFlow = (mermaidCode: string): { nodes: Node[]; edges: Edge[] } => {
  // Handle undefined or empty mermaid code
  if (!mermaidCode || typeof mermaidCode !== 'string') {
    return { nodes: [], edges: [] };
  }
  
  const lines = mermaidCode.split('\n').filter(line => line.trim() && !line.trim().startsWith('flowchart'));
  const nodeMap = new Map<string, { label: string; isDiamond: boolean }>();
  const nodeOrder: string[] = [];
  const edgeList: { source: string; target: string; label?: string }[] = [];

  // Parse nodes and edges
  lines.forEach(line => {
    const trimmedLine = line.trim();
    
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

    // Parse connections
    let connectionMatch = trimmedLine.match(/([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*\|([^\|]+)\|\s*([A-Z]+)[\[{]+/);
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[3].trim(),
        label: connectionMatch[2].trim()
      });
      return;
    }
    
    connectionMatch = trimmedLine.match(/([A-Z]+)[\[{]+[^\]{}]+[\]}]+\s*-->\s*([A-Z]+)[\[{]+/);
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[2].trim()
      });
      return;
    }
    
    connectionMatch = trimmedLine.match(/([A-Z]+)\s+-->\s+([A-Z]+)[\[{]/);
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[2].trim()
      });
      return;
    }
    
    connectionMatch = trimmedLine.match(/([A-Z]+)\s*-->\s*([A-Z]+)/);
    if (connectionMatch) {
      edgeList.push({
        source: connectionMatch[1].trim(),
        target: connectionMatch[2].trim()
      });
    }
  });

  // Fallback: create sequential connections
  if (edgeList.length === 0 && nodeOrder.length > 1) {
    for (let i = 0; i < nodeOrder.length - 1; i++) {
      edgeList.push({
        source: nodeOrder[i],
        target: nodeOrder[i + 1]
      });
    }
  }

  // Convert to React Flow nodes
  const flowNodes: Node[] = [];
  let colorIndex = 0;
  let yPosition = 0;
  
  nodeMap.forEach((data, id) => {
    const color = NODE_COLORS[colorIndex % NODE_COLORS.length];
    colorIndex++;
    
    if (data.isDiamond) {
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
        position: { x: 250, y: yPosition },
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
      yPosition += 200;
    } else {
      flowNodes.push({
        id,
        type: 'default',
        data: { label: data.label },
        position: { x: 200, y: yPosition },
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
      yPosition += 150;
    }
  });

  // Convert to React Flow edges
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

  return { nodes: flowNodes, edges: flowEdges };
};

export default function ExplainerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Check if coming from video transcript
  const videoTranscript = searchParams?.get("transcript");
  
  const [step, setStep] = useState<"input" | "settings" | "loading" | "result">(
    videoTranscript ? "settings" : "input"
  );
  
  // Input Data
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState(videoTranscript || "");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  // Settings
  const [complexity, setComplexity] = useState("medium");
  
  // Explanation Data
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Sign Language State
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [signLanguageText, setSignLanguageText] = useState("");
  
  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0]));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    } else {
      toast.error("Please select a valid PDF file");
    }
  };

  const handleNextToSettings = () => {
    if (inputMode === "text" && !textInput.trim()) {
      toast.error("Please enter some text");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (inputMode === "pdf" && !pdfFile) {
      toast.error("Please select a PDF file");
      return;
    }
    setStep("settings");
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStep("loading");

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

      formData.append("complexity", complexity);

      const response = await axios.post(
        getApiUrl("api/explainer/generate"),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setExplanation(response.data);
      setStep("result");
      toast.success("Explanation generated successfully!");
    } catch (error: any) {
      console.error("Error generating explanation:", error);
      const errorMsg = error.response?.data?.detail || "Failed to generate explanation";
      toast.error(errorMsg);
      setStep("settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !explanation) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        getApiUrl("api/explainer/chat"),
        {
          explainer_content: JSON.stringify(explanation),
          chat_history: chatMessages,
          question: chatInput
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.data.answer
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to get response");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleQuizRedirect = () => {
    if (explanation) {
      localStorage.setItem("explainer_content", explanation.original_content);
      router.push("/dashboard/quiz");
    }
  };

  const handleFlashcardsRedirect = () => {
    if (explanation) {
      localStorage.setItem("explainer_content", explanation.original_content);
      router.push("/dashboard/flashcards");
    }
  };

  const handleShowSignLanguage = () => {
    if (explanation) {
      // Combine all content into sign language text
      let fullText = `${explanation.title}. ${explanation.summary}. `;
      explanation.sections.forEach(section => {
        fullText += `${section.heading}. ${section.content}. `;
      });
      setSignLanguageText(fullText);
      setShowSignLanguage(true);
    }
  };

  const toggleSection = (index: number) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[var(--neo-secondary)] border-[3px] border-black shadow-neo flex items-center justify-center">
            <Lightbulb size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">AI Explainer</h1>
            <p className="text-sm font-bold text-gray-600 mt-1">
              Get comprehensive explanations with diagrams, workflows, and references
            </p>
          </div>
        </div>

        {/* Input Step */}
        {step === "input" && (
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h2 className="text-2xl font-black uppercase mb-6">Select Input Source</h2>
            
            {/* Tab Selection */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <button
                onClick={() => setInputMode("text")}
                className={`px-6 py-4 font-bold text-lg border-[3px] border-black transition-all ${
                  inputMode === "text"
                    ? "bg-[var(--neo-accent)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <FileText className="inline-block mr-2" size={24} />
                Text
              </button>
              <button
                onClick={() => setInputMode("url")}
                className={`px-6 py-4 font-bold text-lg border-[3px] border-black transition-all ${
                  inputMode === "url"
                    ? "bg-[var(--neo-accent)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <LinkIcon className="inline-block mr-2" size={24} />
                URL
              </button>
              <button
                onClick={() => setInputMode("pdf")}
                className={`px-6 py-4 font-bold text-lg border-[3px] border-black transition-all ${
                  inputMode === "pdf"
                    ? "bg-[var(--neo-accent)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                    : "bg-white hover:bg-gray-50"
                }`}
              >
                <Upload className="inline-block mr-2" size={24} />
                PDF
              </button>
            </div>

            {/* Input Fields */}
            {inputMode === "text" && (
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste your content here..."
                className="w-full h-64 px-4 py-3 border-[3px] border-black font-mono text-sm focus:outline-none focus:ring-4 focus:ring-[var(--neo-primary)] resize-none"
              />
            )}

            {inputMode === "url" && (
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full px-4 py-3 border-[3px] border-black font-bold text-lg focus:outline-none focus:ring-4 focus:ring-[var(--neo-primary)]"
              />
            )}

            {inputMode === "pdf" && (
              <div className="border-[3px] border-dashed border-black p-8 text-center">
                <Upload size={48} className="mx-auto mb-4" />
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="inline-block px-6 py-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold cursor-pointer"
                >
                  Choose PDF File
                </label>
                {pdfFile && (
                  <p className="mt-4 font-bold text-green-600">✓ {pdfFile.name}</p>
                )}
              </div>
            )}

            <button
              onClick={handleNextToSettings}
              className="mt-6 w-full px-8 py-4 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black text-lg uppercase flex items-center justify-center gap-2"
            >
              Next <ArrowRight size={24} />
            </button>
          </div>
        )}

        {/* Settings Step */}
        {step === "settings" && (
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <h2 className="text-2xl font-black uppercase mb-6">Explanation Settings</h2>
            
            <div className="mb-8">
              <label className="block text-lg font-black uppercase mb-3">Complexity Level</label>
              <div className="grid grid-cols-3 gap-4">
                {["simple", "medium", "advanced"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setComplexity(level)}
                    className={`px-6 py-4 font-bold border-[3px] border-black transition-all ${
                      complexity === level
                        ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep("input")}
                className="flex-1 px-8 py-4 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black text-lg uppercase"
              >
                Back
              </button>
              <button
                onClick={handleGenerate}
                className="flex-1 px-8 py-4 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black text-lg uppercase flex items-center justify-center gap-2"
              >
                <Brain size={24} />
                Generate Explanation
              </button>
            </div>
          </div>
        )}

        {/* Loading Step */}
        {step === "loading" && (
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-12 text-center">
            <Loader2 size={64} className="mx-auto mb-6 animate-spin text-[var(--neo-primary)]" />
            <h2 className="text-2xl font-black uppercase mb-2">Generating Explanation...</h2>
            <p className="text-gray-600 font-bold">
              Creating diagrams, workflows, and comprehensive content
            </p>
          </div>
        )}

        {/* Result Step */}
        {step === "result" && explanation && (
          <div className="space-y-6">
            {/* Title and Summary */}
            <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
              <h1 className="text-4xl font-black uppercase mb-4">{explanation.title}</h1>
              <p className="text-lg font-bold text-gray-700 leading-relaxed">
                {explanation.summary}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={handleQuizRedirect}
                className="px-6 py-4 bg-[var(--neo-accent)] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black uppercase flex items-center justify-center gap-2"
              >
                <ClipboardList size={24} />
                Take Quiz
              </button>
              <button
                onClick={handleFlashcardsRedirect}
                className="px-6 py-4 bg-[var(--neo-secondary)] border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black uppercase flex items-center justify-center gap-2"
              >
                <Layers size={24} />
                Flashcards
              </button>
              <button
                onClick={handleShowSignLanguage}
                className="px-6 py-4 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black uppercase flex items-center justify-center gap-2"
              >
                <Hand size={24} />
                Sign Language
              </button>
            </div>

            {/* Main Sections */}
            {explanation.sections.map((section, idx) => (
              <div key={idx} className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => toggleSection(idx)}
                  className="w-full px-8 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <h2 className="text-2xl font-black uppercase">{section.heading}</h2>
                  {expandedSections.has(idx) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                
                {expandedSections.has(idx) && (
                  <div className="px-8 pb-8 border-t-[3px] border-black">
                    <div className="prose max-w-none mt-6">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                    </div>

                    {section.key_points.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-xl font-black uppercase mb-3">Key Points</h3>
                        <ul className="space-y-2">
                          {section.key_points.map((point, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <CheckCircle size={20} className="text-green-600 mt-1 flex-shrink-0" />
                              <span className="font-bold text-gray-700">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {section.examples.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-xl font-black uppercase mb-3">Examples</h3>
                        <div className="space-y-3">
                          {section.examples.map((example, i) => (
                            <div key={i} className="bg-gray-50 border-[3px] border-black p-4">
                              <p className="font-bold text-gray-700">{example}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Concepts */}
            {explanation.concepts.length > 0 && (
              <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <Brain size={28} />
                  Key Concepts
                </h2>
                <div className="grid gap-6">
                  {explanation.concepts.map((concept, idx) => (
                    <div key={idx} className="border-[3px] border-black p-6 bg-[var(--neo-accent)]">
                      <h3 className="text-xl font-black uppercase mb-2">{concept.term}</h3>
                      <p className="font-bold text-gray-800 mb-3">{concept.definition}</p>
                      <div className="bg-white border-[3px] border-black p-4">
                        <p className="font-bold text-sm">
                          <span className="text-[var(--neo-primary)]">💡 Analogy:</span> {concept.analogy}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Workflows */}
            {explanation.workflows.length > 0 && (
              <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <WorkflowIcon size={28} />
                  Workflows & Processes
                </h2>
                <div className="space-y-8">
                  {explanation.workflows.map((workflow, idx) => (
                    <div key={idx}>
                      <h3 className="text-xl font-black uppercase mb-4">{workflow.title}</h3>
                      <div className="space-y-4">
                        {workflow.steps.map((step, i) => (
                          <div key={i} className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-[var(--neo-primary)] text-white border-[3px] border-black flex items-center justify-center font-black text-lg">
                              {i + 1}
                            </div>
                            <div className="flex-1 bg-gray-50 border-[3px] border-black p-4">
                              <p className="font-bold text-gray-800">{step}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagrams */}
            {explanation.diagrams.length > 0 && (
              <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="text-2xl font-black uppercase mb-6">Visual Diagrams</h2>
                <div className="space-y-6">
                  {explanation.diagrams.map((diagram, idx) => {
                    // Check if mermaid_code exists
                    if (!diagram.mermaid_code) {
                      return (
                        <div key={idx} className="border-[3px] border-black p-6 bg-[var(--neo-secondary)]">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-black text-white font-black text-sm uppercase">
                              {diagram.type}
                            </span>
                            <h3 className="font-black uppercase">{diagram.description}</h3>
                          </div>
                          <p className="text-gray-600 font-bold italic">
                            Diagram visualization not available
                          </p>
                        </div>
                      );
                    }
                    
                    const { nodes, edges } = parseMermaidToFlow(diagram.mermaid_code);
                    
                    // If parsing failed, show fallback
                    if (nodes.length === 0) {
                      return (
                        <div key={idx} className="border-[3px] border-black p-6 bg-[var(--neo-secondary)]">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-black text-white font-black text-sm uppercase">
                              {diagram.type}
                            </span>
                            <h3 className="font-black uppercase">{diagram.description}</h3>
                          </div>
                          <div className="bg-white border-[3px] border-black p-4">
                            <pre className="text-sm font-mono whitespace-pre-wrap">
                              {diagram.mermaid_code}
                            </pre>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div key={idx} className="border-[3px] border-black bg-[var(--neo-secondary)]">
                        <div className="flex items-center gap-3 p-4 border-b-[3px] border-black bg-white">
                          <span className="px-3 py-1 bg-black text-white font-black text-sm uppercase">
                            {diagram.type}
                          </span>
                          <h3 className="font-black uppercase">{diagram.description}</h3>
                        </div>
                        <div style={{ height: '500px', width: '100%' }}>
                          <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            fitView
                            attributionPosition="bottom-left"
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                          >
                            <Background color="#000" gap={16} />
                            <Controls 
                              showInteractive={false}
                              style={{
                                border: '3px solid black',
                                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
                              }}
                            />
                            <MiniMap 
                              nodeColor={(node) => {
                                const style = node.style as any;
                                return style?.background || '#fff';
                              }}
                              maskColor="rgba(0, 0, 0, 0.1)"
                              style={{
                                border: '3px solid black',
                                boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)'
                              }}
                            />
                          </ReactFlow>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Image Suggestions */}
            {explanation.image_suggestions.length > 0 && (
              <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <ImageIcon size={28} />
                  Recommended Visuals
                </h2>
                <div className="grid gap-4">
                  {explanation.image_suggestions.map((img, idx) => (
                    <a
                      key={idx}
                      href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(img.query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 border-[3px] border-black bg-gray-50 hover:bg-[var(--neo-accent)] transition-colors"
                    >
                      <ImageIcon size={24} className="flex-shrink-0" />
                      <div>
                        <p className="font-black">{img.query}</p>
                        <p className="text-sm font-bold text-gray-600">{img.context}</p>
                      </div>
                      <ArrowRight size={20} className="ml-auto" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* References */}
            {explanation.references.length > 0 && (
              <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
                  <BookOpen size={28} />
                  Further Reading
                </h2>
                <div className="grid gap-4">
                  {explanation.references.map((ref, idx) => (
                    <a
                      key={idx}
                      href={`https://www.google.com/search?q=${encodeURIComponent(ref.suggested_search)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-6 border-[3px] border-black bg-gray-50 hover:bg-[var(--neo-secondary)] transition-colors"
                    >
                      <h3 className="font-black text-lg mb-2">{ref.title}</h3>
                      <p className="font-bold text-gray-700 mb-3">{ref.description}</p>
                      <span className="inline-flex items-center gap-2 text-[var(--neo-primary)] font-black text-sm">
                        Search: {ref.suggested_search} <ArrowRight size={16} />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Chat Button - Bottom Middle */}
        {step === "result" && explanation && !showChat && (
          <button
            onClick={() => setShowChat(true)}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[var(--neo-primary)] text-white border-4 border-black px-8 py-4 font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[-2px] transition-all flex items-center gap-2 z-40"
          >
            <MessageCircle size={24} />
            Ask Questions
          </button>
        )}

        {/* Chat Popup Modal */}
        {showChat && explanation && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowChat(false)}
            />
            
            {/* Chat Modal */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[600px] max-w-[90vw] bg-white border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col z-50" style={{ maxHeight: '70vh' }}>
              <div className="flex items-center justify-between p-4 border-b-[3px] border-black bg-[var(--neo-primary)]">
                <h3 className="font-black text-white uppercase flex items-center gap-2">
                  <MessageCircle size={20} />
                  Ask Questions
                </h3>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-2 hover:bg-white/20 transition-colors rounded"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '300px', maxHeight: 'calc(70vh - 150px)' }}>
                {chatMessages.length === 0 && (
                  <div className="text-center py-12">
                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="font-bold text-gray-500">
                      Ask any questions about the explained content
                    </p>
                  </div>
                )}

                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border-[3px] border-black ${
                      msg.role === "user"
                        ? "bg-[var(--neo-accent)] ml-12"
                        : "bg-gray-50 mr-12"
                    }`}
                  >
                    <p className="font-bold text-sm mb-1">
                      {msg.role === "user" ? "You" : "AI Tutor"}
                    </p>
                    <p className="text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center gap-2 p-4 bg-gray-50 border-[3px] border-black mr-12">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="font-bold text-gray-600">Thinking...</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t-[3px] border-black bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder="Ask a question..."
                    className="flex-1 px-4 py-3 border-[3px] border-black font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)]"
                    disabled={isChatLoading}
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-6 py-3 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed font-black"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sign Language Avatar */}
        <SignLanguageAvatar 
          text={signLanguageText}
          isVisible={showSignLanguage}
          onClose={() => setShowSignLanguage(false)}
        />
      </div>
    </div>
  );
}
