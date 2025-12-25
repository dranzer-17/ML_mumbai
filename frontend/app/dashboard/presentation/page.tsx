"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Presentation, 
  Loader2, 
  CheckCircle, 
  XCircle,
  RefreshCcw,
  Sparkles,
  ChevronRight,
  Edit3,
  Download,
  Palette,
  History,
  Clock,
  FileText,
  X
} from "lucide-react";
import SlideViewer from "@/components/SlideViewer";

interface Slide {
  layout: string;
  section_layout: string;
  content: {
    heading?: string;
    items?: Array<{ text: string; subtext?: string }>;
  };
  image_query?: string;
}

export default function PresentationPage() {
  const [step, setStep] = useState<"input" | "outline" | "preview">("input");
  const [topic, setTopic] = useState("");
  const [numSlides, setNumSlides] = useState(5);
  const [language, setLanguage] = useState("en-US");
  const [tone, setTone] = useState("professional");
  const [theme, setTheme] = useState("default");
  
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [title, setTitle] = useState("");
  const [outline, setOutline] = useState<string[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [presentations, setPresentations] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userName, setUserName] = useState<string>("User");

  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "hi", name: "Hindi" },
    { code: "zh", name: "Chinese" },
  ];

  const tones = ["professional", "casual", "educational", "inspirational"];
  const themes = ["default", "modern", "minimal", "vibrant", "dark"];
  const fonts = ["Inter", "Poppins", "Roboto", "Montserrat", "Playfair Display", "Lora"];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get("http://127.0.0.1:8000/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUserName(response.data.full_name || response.data.email.split("@")[0]);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUserData();
  }, []);

  const handleGenerateOutline = async () => {
    if (!topic.trim()) {
      setError("Please enter a presentation topic");
      return;
    }

    setError(null);
    setIsGeneratingOutline(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/presentation/outline",
        {
          prompt: topic,
          num_slides: numSlides,
          language: language,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setTitle(response.data.title);
      setOutline(response.data.outline);
      setStep("outline");
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string }; status?: number } };
      if (error.response?.status === 429) {
        setError("⚠️ API Rate Limit: Switching to backup API key automatically...");
      } else {
        setError(error.response?.data?.detail || "Failed to generate outline");
      }
    } finally {
      setIsGeneratingOutline(false);
    }
  };

  const handleGeneratePresentation = async () => {
    setError(null);
    setIsGeneratingPresentation(true);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/presentation/generate",
        {
          title: title,
          prompt: topic,
          outline: outline,
          language: language,
          tone: tone,
          theme: theme,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setSlides(response.data.slides);
      setStep("preview");
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string }; status?: number } };
      if (error.response?.status === 429) {
        setError("⚠️ All API keys exhausted. Please wait or add more keys to .env");
      } else {
        setError(error.response?.data?.detail || "Failed to generate presentation");
      }
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setTopic("");
    setTitle("");
    setOutline([]);
    setSlides([]);
    setError(null);
    setCurrentSlide(0);
    setEditingSlide(null);
  };

  const handleDownloadPPTX = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:8000/api/presentation/download",
        {
          title: title,
          slides: slides,
          theme: theme,
          font: selectedFont,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${title.replace(/[^a-z0-9]/gi, "_")}.pptx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to download presentation");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSlideUpdate = (slideIndex: number, updatedSlide: Slide) => {
    const newSlides = [...slides];
    newSlides[slideIndex] = updatedSlide;
    setSlides(newSlides);
  };

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:8000/api/presentation/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPresentations(response.data.presentations || []);
      setShowHistory(true);
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load history");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadPresentation = async (pptId: number) => {
    setIsLoadingHistory(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:8000/api/presentation/history/${pptId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const ppt = response.data.presentation;
      setTitle(ppt.title);
      setSlides(ppt.slides);
      setTheme(ppt.theme);
      setLanguage(ppt.language);
      setTone(ppt.tone);
      setOutline(ppt.outline || []);
      setTopic(ppt.topic || "");
      setCurrentSlide(0);
      setShowHistory(false);
      setStep("preview");
    } catch (err) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || "Failed to load presentation");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-neo rounded-lg p-6 mb-6 shadow-neo">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-[var(--neo-primary)] p-3 border-neo">
                <Presentation className="text-white" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase">PPT Maker</h1>
                <p className="text-gray-600 font-bold">
                  AI-Powered Presentation Generator with Auto API Switching
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchHistory}
                disabled={isLoadingHistory}
                className="btn-neo bg-white text-black flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoadingHistory ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <History size={20} />
                    History
                  </>
                )}
              </button>
              {step !== "input" && (
                <button
                  onClick={handleReset}
                  className="btn-neo bg-white text-black flex items-center gap-2"
                >
                  <RefreshCcw size={20} />
                  Start Over
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-3 border-red-500 rounded-lg p-4 mb-6 flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={24} />
            <span className="font-bold text-red-700">{error}</span>
          </div>
        )}

        {/* Step 1: Input */}
        {step === "input" && (
          <div className="bg-white border-neo rounded-lg p-8 shadow-neo">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-[var(--neo-primary)]" size={28} />
              <h2 className="text-2xl font-black uppercase">
                What&apos;s your presentation about?
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase">
                  Presentation Topic
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="E.g., The future of artificial intelligence in healthcare"
                  className="w-full border-neo rounded-lg p-4 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)] min-h-30"
                  disabled={isGeneratingOutline}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">
                    Number of Slides
                  </label>
                  <select
                    value={numSlides}
                    onChange={(e) => setNumSlides(Number(e.target.value))}
                    className="w-full border-neo rounded-lg p-3 pr-10 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)] appearance-none bg-white"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1.5em 1.5em" }}
                    disabled={isGeneratingOutline}
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <option key={num} value={num}>
                        {num} slides
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full border-neo rounded-lg p-3 pr-10 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)] appearance-none bg-white"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1.5em 1.5em" }}
                    disabled={isGeneratingOutline}
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full border-neo rounded-lg p-3 pr-10 font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)] appearance-none bg-white"
                    style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1.5em 1.5em" }}
                    disabled={isGeneratingOutline}
                  >
                    {tones.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateOutline}
                disabled={isGeneratingOutline || !topic.trim()}
                className="w-full btn-neo bg-[var(--neo-primary)] text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingOutline ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating Outline...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Generate Outline
                    <ChevronRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Outline Review */}
        {step === "outline" && (
          <div className="space-y-6">
            <div className="bg-white border-neo rounded-lg p-6 shadow-neo">
              <div className="flex items-center gap-3 mb-4">
                <Edit3 className="text-[var(--neo-secondary)]" size={24} />
                <h2 className="text-2xl font-black uppercase">
                  Presentation Title
                </h2>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border-neo rounded-lg p-4 font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-[var(--neo-secondary)]"
              />
            </div>

            <div className="bg-white border-neo rounded-lg p-6 shadow-neo">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-[var(--neo-secondary)]" size={24} />
                <h2 className="text-2xl font-black uppercase">
                  Presentation Outline
                </h2>
              </div>
              <div className="space-y-4">
                {outline.map((item, index) => (
                  <div
                    key={index}
                    className="border-neo rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start gap-3">
                      <span className="bg-[var(--neo-secondary)] text-white font-black px-3 py-1 border-2 border-black">
                        {index + 1}
                      </span>
                      <div className="flex-1 whitespace-pre-wrap font-bold">
                        {item}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border-neo rounded-lg p-6 shadow-neo">
              <div className="flex items-center gap-3 mb-4">
                <Palette className="text-[var(--neo-accent)]" size={24} />
                <h2 className="text-2xl font-black uppercase">
                  Select Theme
                </h2>
              </div>
              <div className="flex gap-3 flex-wrap">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-6 py-3 border-neo rounded-lg font-bold uppercase transition-all ${
                      theme === t
                        ? "bg-[var(--neo-accent)] shadow-neo"
                        : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGeneratePresentation}
              disabled={isGeneratingPresentation}
              className="w-full btn-neo bg-[var(--neo-secondary)] text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPresentation ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Presentation...
                </>
              ) : (
                <>
                  <Presentation size={20} />
                  Generate Presentation
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <div className="space-y-6">
            <div className="bg-green-100 border-3 border-green-500 rounded-lg p-6 flex items-center gap-4">
              <CheckCircle className="text-green-600" size={32} />
              <div>
                <h3 className="text-xl font-black uppercase text-green-800">
                  Presentation Generated Successfully!
                </h3>
                <p className="font-bold text-green-700">
                  Your presentation with {slides.length} slides is ready.
                </p>
              </div>
            </div>

            <div className="bg-white border-neo rounded-lg p-8 shadow-neo text-center">
              <h1 className="text-4xl font-black uppercase mb-2">{title}</h1>
              <p className="text-gray-600 font-bold">
                Theme: {theme} • {slides.length} Slides • {language}
              </p>
            </div>

            {/* Theme and Font Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border-neo rounded-lg p-6 shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="text-[var(--neo-accent)]" size={24} />
                  <h2 className="text-xl font-black uppercase">Change Theme</h2>
                </div>
                <div className="flex gap-3 flex-wrap">
                  {themes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`px-4 py-2 border-neo rounded-lg font-bold uppercase transition-all text-sm ${
                        theme === t
                          ? "bg-[var(--neo-accent)] shadow-neo"
                          : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border-neo rounded-lg p-6 shadow-neo">
                <div className="flex items-center gap-3 mb-4">
                  <Edit3 className="text-[var(--neo-secondary)]" size={24} />
                  <h2 className="text-xl font-black uppercase">Change Font</h2>
                </div>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full px-4 py-3 pr-10 border-neo rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-[var(--neo-primary)] appearance-none bg-white"
                  style={{ backgroundImage: "url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.75rem center", backgroundSize: "1.5em 1.5em" }}
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slide Viewer */}
            <div className="bg-white border-neo rounded-lg p-8 shadow-neo">
              <SlideViewer 
                slides={slides}
                theme={theme}
                currentSlide={currentSlide}
                onSlideChange={setCurrentSlide}
                onSlideUpdate={handleSlideUpdate}
                isEditing={isEditingInline}
                onEditToggle={setIsEditingInline}
                userName={userName}
                font={selectedFont}
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDownloadPPTX}
                disabled={isDownloading || isEditingInline}
                className="flex-1 btn-neo bg-[var(--neo-accent)] text-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Generating PPTX...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Download PPTX
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Modal Panel - Bottom Right */}
      {showHistory && (
        <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-[var(--neo-primary)] text-white border-b-[3px] border-black flex items-center justify-between">
            <h3 className="font-black text-xl uppercase flex items-center gap-2">
              <History size={24} /> Past Presentations
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="hover:bg-black/20 p-1 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={32} className="animate-spin text-[var(--neo-primary)]" />
              </div>
            ) : presentations.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="font-bold text-gray-500">No presentations found</p>
                <p className="text-sm text-gray-400 mt-2">Create one to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {presentations.map((ppt) => (
                  <div
                    key={ppt.ppt_id}
                    onClick={() => loadPresentation(ppt.ppt_id)}
                    className="p-4 bg-gray-50 border-[2px] border-black rounded hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm">PPT #{ppt.ppt_id}</span>
                      <span className="text-lg">📊</span>
                    </div>
                    <h4 className="font-black text-sm mb-2 line-clamp-2 uppercase">
                      {ppt.title}
                    </h4>
                    <div className="space-y-1 text-xs">
                      <p className="font-bold text-gray-600 flex items-center gap-1">
                        <FileText size={12} />
                        {ppt.num_slides} slides
                      </p>
                      <p className="font-bold text-gray-600 flex items-center gap-1">
                        <Palette size={12} />
                        {ppt.theme} theme
                      </p>
                      <p className="text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(ppt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
