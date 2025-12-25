"use client";
import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, Loader2, FileText, Plus, Mic, MicOff, X, ClipboardList, Layers, GitBranch } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { getApiUrl } from "@/lib/api";
import { useRouter } from "next/navigation";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tool_results?: Array<{
    tool: string;
    result: any;
    error?: string;
  }>;
}

interface ToolResult {
  tool: string;
  result: any;
  error?: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-detect if input is a URL
  const isURL = (text: string): boolean => {
    const urlPattern = /^(https?:\/\/|www\.)[^\s]+/i;
    return urlPattern.test(text.trim());
  };

  const handleSend = async () => {
    const messageText = input.trim();
    if (!messageText && !pdfFile) {
      toast.error("Please enter a message or upload a file");
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: messageText || (pdfFile ? `Uploaded file: ${pdfFile.name}` : "")
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setPdfFile(null);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const formData = new FormData();
      // Auto-detect: if it's a URL, mention it; otherwise send as text
      let messageToSend = currentInput;
      if (isURL(currentInput)) {
        messageToSend = `Explain this URL: ${currentInput}`;
      } else if (!currentInput && pdfFile) {
        messageToSend = `Please explain the uploaded PDF: ${pdfFile.name}`;
      }
      
      formData.append("message", messageToSend);
      formData.append("session_id", "main");

      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const response = await axios.post(
        getApiUrl("api/agent/chat"),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.data.message,
        tool_results: response.data.tool_results || []
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg = error.response?.data?.detail || "Failed to get response";
      toast.error(errorMsg);
      
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMsg}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setPdfFile(file);
        toast.success(`PDF selected: ${file.name}`);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev + (prev ? " " : "") + transcript);
          setIsRecording(false);
          toast.success("Voice transcribed!");
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
          if (event.error === "no-speech") {
            toast.error("No speech detected. Please try again.");
          } else if (event.error === "not-allowed") {
            toast.error("Microphone access denied. Please allow microphone access.");
          } else {
            toast.error("Speech recognition error. Please try again.");
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success("Listening...");
    } catch (error: any) {
      console.error("Error starting recognition:", error);
      if (error.message?.includes("already started")) {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current.start();
          setIsRecording(true);
        }, 100);
      } else {
        toast.error("Failed to start voice recognition");
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const renderToolResult = (toolResult: ToolResult) => {
    const { tool, result, error } = toolResult;

    if (error) {
      return (
        <div className="card-neo bg-red-50 border-red-300 p-4 my-2">
          <div className="font-bold text-red-700">Error in {tool}:</div>
          <div className="text-red-600">{error}</div>
        </div>
      );
    }

    switch (tool) {
      case "explain_content":
        return (
          <div className="card-neo bg-blue-50 border-blue-300 p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={20} className="text-blue-600" />
              <span className="font-bold text-blue-700">Explanation Generated</span>
            </div>
            {result.title && (
              <h3 className="font-black text-lg mb-2">{result.title}</h3>
            )}
            {result.summary && (
              <p className="text-sm mb-2">{result.summary}</p>
            )}
            {result.sections && result.sections.length > 0 && (
              <div className="text-xs text-blue-600">
                {result.sections.length} sections generated
              </div>
            )}
          </div>
        );

      case "generate_quiz":
        return (
          <div className="card-neo bg-green-50 border-green-300 p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList size={20} className="text-green-600" />
              <span className="font-bold text-green-700">Quiz Generated</span>
            </div>
            {result.quiz && (
              <div>
                <div className="text-sm mb-2">
                  {result.num_questions || result.quiz.length} questions ({result.difficulty || "medium"} difficulty)
                </div>
                <button
                  onClick={() => {
                    if (result.quiz) {
                      localStorage.setItem("agent_quiz_data", JSON.stringify(result.quiz));
                      router.push("/dashboard/quiz");
                    }
                  }}
                  className="btn-neo bg-green-600 text-white px-4 py-2 text-sm font-bold"
                >
                  View Quiz
                </button>
              </div>
            )}
          </div>
        );

      case "generate_flashcards":
        return (
          <div className="card-neo bg-purple-50 border-purple-300 p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={20} className="text-purple-600" />
              <span className="font-bold text-purple-700">Flashcards Generated</span>
            </div>
            {result.flashcards && (
              <div>
                <div className="text-sm mb-2">
                  {result.num_cards || result.flashcards.length} flashcards created
                </div>
                <button
                  onClick={() => {
                    if (result.flashcards) {
                      localStorage.setItem("agent_flashcard_data", JSON.stringify(result.flashcards));
                      router.push("/dashboard/flashcards");
                    }
                  }}
                  className="btn-neo bg-purple-600 text-white px-4 py-2 text-sm font-bold"
                >
                  View Flashcards
                </button>
              </div>
            )}
          </div>
        );

      case "generate_workflow":
        return (
          <div className="card-neo bg-orange-50 border-orange-300 p-4 my-2">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch size={20} className="text-orange-600" />
              <span className="font-bold text-orange-700">Workflow Generated</span>
            </div>
            {result.mermaid_code && (
              <button
                onClick={() => {
                  if (result.mermaid_code) {
                    localStorage.setItem("agent_workflow_data", result.mermaid_code);
                    router.push("/dashboard/workflow");
                  }
                }}
                className="btn-neo bg-orange-600 text-white px-4 py-2 text-sm font-bold"
              >
                View Workflow
              </button>
            )}
          </div>
        );

      default:
        return (
          <div className="card-neo bg-gray-50 p-4 my-2">
            <div className="text-sm font-bold">{tool} completed</div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center text-white">
            <MessageSquare size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase">AI Tutor</h1>
        </div>
        <p className="font-bold text-gray-600">Chat with your AI tutor. Ask for explanations, quizzes, flashcards, and more!</p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto card-neo bg-white mb-4 p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
            <p className="font-bold">Start a conversation with your AI tutor!</p>
            <p className="text-sm mt-2">Try: "Explain this URL: https://..." or "Give me a quiz on machine learning"</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] ${
                msg.role === "user"
                  ? "bg-[var(--neo-primary)] text-white"
                  : "bg-gray-100 text-gray-900"
              } p-4 rounded-lg border-[3px] border-black`}
            >
              <div className="font-bold whitespace-pre-wrap">{msg.content}</div>
              
              {/* Render tool results */}
              {msg.tool_results && msg.tool_results.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.tool_results.map((toolResult, toolIdx) => (
                    <div key={toolIdx}>
                      {renderToolResult(toolResult)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-4 rounded-lg border-[3px] border-black">
              <Loader2 className="animate-spin" size={20} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="card-neo bg-white p-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className="hidden"
        />

        {/* PDF File Preview */}
        {pdfFile && (
          <div className="mb-3 flex items-center gap-2 bg-gray-100 p-2 rounded border-[2px] border-black">
            <FileText size={20} />
            <span className="flex-1 font-bold text-sm">{pdfFile.name}</span>
            <button
              onClick={() => {
                setPdfFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          {/* Plus Button for File Upload */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-neo bg-white border-[3px] border-black p-3 font-black hover:bg-gray-50 transition-all"
            title="Upload PDF"
          >
            <Plus size={20} />
          </button>

          {/* Main Input Field */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message, paste a URL, or ask for explanations, quizzes, flashcards..."
            className="flex-1 px-4 py-3 border-[3px] border-black font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)]"
            onKeyPress={(e) => e.key === "Enter" && !loading && !isRecording && handleSend()}
            disabled={loading || isRecording}
          />

          {/* Mic Button for Voice Input */}
          <button
            onClick={() => {
              if (isRecording) {
                stopRecording();
              } else {
                startRecording();
              }
            }}
            className={`btn-neo p-3 font-black transition-all ${
              isRecording
                ? "bg-red-600 text-white border-[3px] border-black animate-pulse"
                : "bg-white border-[3px] border-black hover:bg-gray-50"
            }`}
            title={isRecording ? "Click to stop recording" : "Click to start voice input"}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={loading || isRecording || (!input.trim() && !pdfFile)}
            className="btn-neo bg-[var(--neo-primary)] text-white px-6 py-3 font-black uppercase disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Send size={20} />
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
