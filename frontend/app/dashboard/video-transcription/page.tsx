"use client";
import { useState } from "react";
import axios from "axios";
import { 
  Video, 
  Loader2, 
  Link as LinkIcon,
  Upload,
  FileVideo,
  CheckCircle,
  XCircle,
  Download
} from "lucide-react";

type InputMode = "url" | "video";

export default function VideoTranscriptionPage() {
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [urlInput, setUrlInput] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [videoSource, setVideoSource] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (inputMode === "url" && !urlInput.trim()) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    if (inputMode === "video" && !videoFile) {
      setError("Please upload a video file.");
      return;
    }

    setError(null);
    setStep("loading");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("source_type", inputMode);
      
      if (inputMode === "url") {
        formData.append("url", urlInput);
      } else if (inputMode === "video") {
        formData.append("video", videoFile!);
      }

      const response = await axios.post(
        "http://127.0.0.1:8000/api/transcription/transcribe",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setTranscript(response.data.formatted_transcript);
        setVideoSource(response.data.video_source);
        setStep("result");
      } else {
        setError(response.data.error || "Transcription failed");
        setStep("input");
      }
    } catch (err: any) {
      console.error("Transcription error:", err);
      setError(err.response?.data?.detail || "Failed to transcribe video");
      setStep("input");
    }
  };

  const handleReset = () => {
    setStep("input");
    setUrlInput("");
    setVideoFile(null);
    setTranscript("");
    setVideoSource("");
    setError(null);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `transcript_${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // ===========================
  // STEP 1: INPUT
  // ===========================
  if (step === "input") {
    return (
      <div className="min-h-screen bg-[var(--neo-bg)] text-[var(--neo-dark)] transition-colors">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-[var(--neo-secondary)] border-[3px] border-black shadow-neo rounded-lg">
                <Video size={32} className="text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black uppercase tracking-tight">
                  VIDEO TRANSCRIBER
                </h1>
                <p className="text-lg font-semibold mt-1">
                  Transcribe YouTube videos or upload your own
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 border-[3px] border-black shadow-neo flex items-start gap-3">
              <XCircle className="flex-shrink-0 text-red-600 dark:text-red-400" size={24} />
              <p className="font-bold text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Source Type Selection */}
          <div className="mb-6">
            <h2 className="text-2xl font-black uppercase mb-4">CHOOSE YOUR SOURCE</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setInputMode("url")}
                className={`p-6 border-[3px] border-black shadow-neo transition-all font-bold text-lg flex flex-col items-center gap-3 ${
                  inputMode === "url"
                    ? "bg-[var(--neo-accent)] scale-105"
                    : "bg-white dark:bg-[#3A3A3A] hover:scale-[1.02]"
                }`}
              >
                <LinkIcon size={32} />
                <span>YouTube URL</span>
              </button>

              <button
                onClick={() => setInputMode("video")}
                className={`p-6 border-[3px] border-black shadow-neo transition-all font-bold text-lg flex flex-col items-center gap-3 ${
                  inputMode === "video"
                    ? "bg-[var(--neo-accent)] scale-105"
                    : "bg-white dark:bg-[#3A3A3A] hover:scale-[1.02]"
                }`}
              >
                <Upload size={32} />
                <span>Upload Video</span>
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div className="mb-6">
            {inputMode === "url" && (
              <div>
                <label className="block font-black text-lg mb-3 uppercase">
                  PASTE YOUTUBE URL
                </label>
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="input-neo w-full"
                />
              </div>
            )}

            {inputMode === "video" && (
              <div>
                <label className="block font-black text-lg mb-3 uppercase">
                  UPLOAD VIDEO FILE
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="video-upload"
                  />
                  <label
                    htmlFor="video-upload"
                    className="block p-8 border-[3px] border-black border-dashed bg-white dark:bg-[#3A3A3A] shadow-neo cursor-pointer hover:bg-gray-50 dark:hover:bg-[#454545] transition-all"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <FileVideo size={48} />
                      <p className="font-bold text-lg">
                        {videoFile ? videoFile.name : "Click to upload video"}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        MP4, MOV, AVI, etc.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full p-6 bg-[var(--neo-accent)] border-[3px] border-black shadow-neo hover:shadow-neo-hover font-black text-xl uppercase transition-all flex items-center justify-center gap-3"
          >
            <Video size={24} />
            TRANSCRIBE VIDEO
          </button>
        </div>
      </div>
    );
  }

  // ===========================
  // STEP 2: LOADING
  // ===========================
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[var(--neo-bg)] text-[var(--neo-dark)] flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="mb-6 inline-block p-8 bg-white dark:bg-[#3A3A3A] border-[3px] border-black shadow-neo">
            <Loader2 size={64} className="animate-spin text-[var(--neo-secondary)]" />
          </div>
          <h2 className="text-3xl font-black uppercase mb-2">TRANSCRIBING VIDEO</h2>
          <p className="text-lg font-semibold">
            This may take a few moments...
          </p>
        </div>
      </div>
    );
  }

  // ===========================
  // STEP 3: RESULT
  // ===========================
  if (step === "result") {
    return (
      <div className="min-h-screen bg-[var(--neo-bg)] text-[var(--neo-dark)] transition-colors">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-[var(--neo-secondary)] border-[3px] border-black shadow-neo rounded-lg">
                  <CheckCircle size={32} className="text-black" />
                </div>
                <div>
                  <h1 className="text-4xl font-black uppercase tracking-tight">
                    TRANSCRIPTION COMPLETE
                  </h1>
                  <p className="text-lg font-semibold mt-1">
                    Source: {videoSource}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-3 bg-white dark:bg-[#3A3A3A] border-[3px] border-black shadow-neo hover:shadow-neo-hover font-bold transition-all"
              >
                NEW TRANSCRIPTION
              </button>
            </div>
          </div>

          {/* Transcript Display */}
          <div className="mb-6 p-8 bg-white dark:bg-[#3A3A3A] border-[3px] border-black shadow-neo">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase">FORMATTED TRANSCRIPT</h2>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-neo hover:shadow-neo-hover font-bold transition-all"
              >
                <Download size={20} />
                DOWNLOAD
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {transcript}
              </pre>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
