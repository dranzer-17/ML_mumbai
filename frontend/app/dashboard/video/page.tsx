"use client";
import { useState } from "react";
import { Video, Link as LinkIcon, Upload, Loader2, Copy, Download, Hand, Lightbulb } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import SignLanguageAvatar from "@/components/SignLanguageAvatar";
import { useRouter } from "next/navigation";
import { getApiUrl } from "@/lib/api";

type InputMode = "youtube" | "upload";

export default function VideoPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [videoId, setVideoId] = useState("");
  
  // Sign Language Avatar
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [signLanguageText, setSignLanguageText] = useState("");
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setIsLoading(true);
    setTranscript("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        getApiUrl("api/video-transcript/youtube"),
        { video_url: youtubeUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setTranscript(response.data.transcript);
        setVideoId(response.data.video_id || "");
        toast.success("Transcript fetched successfully!");
      }
    } catch (error: any) {
      console.error("Error fetching transcript:", error);
      const errorMsg = error.response?.data?.detail || "Failed to fetch transcript";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a video file");
      return;
    }

    setIsLoading(true);
    setTranscript("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        getApiUrl("api/video-transcript/upload"),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        setTranscript(response.data.transcript);
        toast.success("Video transcribed successfully!");
      }
    } catch (error: any) {
      console.error("Error transcribing video:", error);
      const errorMsg = error.response?.data?.detail || "Failed to transcribe video";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["video/mp4", "video/avi", "video/mov", "video/x-matroska", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please select a valid video file (mp4, avi, mov, mkv, webm)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ["video/mp4", "video/avi", "video/mov", "video/x-matroska", "video/webm"];
      if (!validTypes.includes(file.type)) {
        toast.error("Please select a valid video file (mp4, avi, mov, mkv, webm)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    toast.success("Transcript copied to clipboard!");
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${videoId || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded!");
  };

  const handleExplainTranscript = () => {
    router.push(`/dashboard/explainer?transcript=${encodeURIComponent(transcript)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-[var(--neo-secondary)] border-[3px] border-black shadow-neo flex items-center justify-center">
            <Video size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Video Transcript</h1>
            <p className="text-sm font-bold text-gray-600 mt-1">
              Extract transcripts from YouTube videos or upload your own video files
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 mb-8">
          {/* Tab Selection */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              onClick={() => setInputMode("youtube")}
              className={`relative px-6 py-4 font-bold text-lg border-[3px] border-black transition-all ${
                inputMode === "youtube"
                  ? "bg-[var(--neo-accent)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <LinkIcon className="inline-block mr-2" size={24} />
              YouTube URL
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`relative px-6 py-4 font-bold text-lg border-[3px] border-black transition-all ${
                inputMode === "upload"
                  ? "bg-[var(--neo-accent)] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <Upload className="inline-block mr-2" size={24} />
              Upload Video
            </button>
          </div>

          {/* YouTube Input */}
          {inputMode === "youtube" && (
            <div>
              <label className="block font-bold mb-3 text-sm uppercase tracking-wide">
                Paste YouTube URL
              </label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none font-bold mb-6 focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-2px] focus:translate-y-[-2px] transition-all"
              />
              <button
                onClick={handleYoutubeSubmit}
                disabled={isLoading || !youtubeUrl.trim()}
                className="w-full bg-[var(--neo-primary)] text-white px-6 py-4 font-bold text-lg border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Fetching Transcript...
                  </>
                ) : (
                  <>
                    <Video size={20} />
                    Get Transcript
                  </>
                )}
              </button>
            </div>
          )}

          {/* Upload Input */}
          {inputMode === "upload" && (
            <div>
              <label className="block font-bold mb-3 text-sm uppercase tracking-wide">
                Upload Video File
              </label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-[3px] border-dashed border-black p-8 text-center mb-6 transition-all ${
                  isDragging 
                    ? "bg-[var(--neo-accent)] scale-105" 
                    : "bg-gray-50"
                }`}
              >
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <Upload size={48} className={isDragging ? "text-black" : "text-gray-400"} />
                  <div className="font-bold">
                    {selectedFile ? (
                      <span className="text-[var(--neo-primary)]">{selectedFile.name}</span>
                    ) : (
                      <>
                        <span>{isDragging ? "Drop video here!" : "Click to upload or drag and drop"}</span>
                        <p className="text-sm text-gray-500 mt-1">
                          MP4, AVI, MOV, MKV, WEBM (Max 100MB)
                        </p>
                      </>
                    )}
                  </div>
                </label>
              </div>
              <button
                onClick={handleFileUpload}
                disabled={isLoading || !selectedFile}
                className="w-full bg-[var(--neo-secondary)] text-black px-6 py-4 font-bold text-lg border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Transcribing Video...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Transcribe Video
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Transcript Output */}
        {transcript && (
          <div className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black uppercase">Transcript</h2>
              <div className="flex gap-3">
                <button
                  onClick={handleExplainTranscript}
                  className="px-4 py-2 bg-[var(--neo-primary)] text-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-bold flex items-center gap-2"
                >
                  <Lightbulb size={16} />
                  Explain
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy
                </button>
                <button
                  onClick={downloadTranscript}
                  className="px-4 py-2 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-bold flex items-center gap-2"
                >
                  <Download size={16} />
                  Download
                </button>
              </div>
            </div>
            <div className="bg-gray-50 border-[3px] border-black p-6 max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{transcript}</pre>
            </div>
          </div>
        )}
      </div>
      
      {/* Sign Language Button - Bottom Right Corner */}
      {transcript && (
        <button
          onClick={() => {
            setSignLanguageText(transcript);
            setShowSignLanguage(true);
          }}
          className="fixed bottom-6 right-6 bg-[var(--neo-primary)] text-white border-4 border-black px-6 py-4 font-black uppercase shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2 z-40"
        >
          <Hand size={24} />
          Sign Language
        </button>
      )}
      
      {/* Sign Language Avatar Component */}
      <SignLanguageAvatar 
        text={signLanguageText}
        isVisible={showSignLanguage}
        onClose={() => setShowSignLanguage(false)}
      />
    </div>
  );
}
