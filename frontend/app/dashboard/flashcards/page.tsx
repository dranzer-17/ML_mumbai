"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import { getApiUrl } from "@/lib/api";
import { 
  Layers,
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  RefreshCcw,
  FileText,
  Link as LinkIcon,
  Upload,
  ArrowLeft,
  Brain,
  History,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Hand
} from "lucide-react";
import SignLanguageAvatar from "@/components/SignLanguageAvatar";

interface Flashcard {
  id: number;
  front: string;
  back: string;
  difficulty: string;
}

interface PastFlashcardSet {
  flashcard_id: number;
  total_cards: number;
  words_per_card: number;
  content_source: string;
  created_at: string;
}

type InputMode = "text" | "pdf" | "url";

export default function FlashcardsPage() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState<"input" | "settings" | "preview" | "study">("input");
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Input Data
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [contentSource, setContentSource] = useState<string>("text");
  
  // Settings Data
  const [cardLimitMode, setCardLimitMode] = useState<"limited" | "unlimited">("limited");
  const [numCards, setNumCards] = useState(10);
  const [wordsPerCard, setWordsPerCard] = useState(35);
  
  // Flashcard Data
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [showGridView, setShowGridView] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  
  // History Data
  const [pastFlashcardSets, setPastFlashcardSets] = useState<PastFlashcardSet[]>([]);
  const [showPastSets, setShowPastSets] = useState(false);
  const [loadingPastSets, setLoadingPastSets] = useState(false);
  const [viewingPastSet, setViewingPastSet] = useState<any>(null);
  
  // Sign Language Avatar
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [signLanguageText, setSignLanguageText] = useState("");

  // === RESET FUNCTIONS ===
  const resetToDefaults = () => {
    setNumCards(10);
    setWordsPerCard(35);
  };

  const resetAll = () => {
    setStep("input");
    setTextInput("");
    setUrlInput("");
    setPdfFile(null);
    setFlashcards([]);
    setCurrentIndex(0);
    setShowBack(false);
    setOriginalContent("");
    setViewingPastSet(null);
  };

  // === INPUT HANDLERS ===
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const proceedToSettings = () => {
    let hasInput = false;
    
    if (inputMode === "text" && textInput.trim()) {
      hasInput = true;
    } else if (inputMode === "url" && urlInput.trim()) {
      hasInput = true;
    } else if (inputMode === "pdf" && pdfFile) {
      hasInput = true;
    }
    
    if (!hasInput) {
      alert("Please provide input before proceeding!");
      return;
    }
    
    setStep("settings");
  };

  // === GENERATE FLASHCARDS ===
  const generateFlashcards = async () => {
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

      if (cardLimitMode === "limited") {
        formData.append("num_cards", numCards.toString());
      } else {
        formData.append("num_cards", "50"); // Backend max, will generate as many as content allows
      }
      formData.append("words_per_card", wordsPerCard.toString());

      const res = await axios.post(
        getApiUrl("api/flashcards/generate"),
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      setFlashcards(res.data.flashcards);
      setOriginalContent(res.data.original_content);
      setContentSource(res.data.content_source);
      setIsGenerating(false);
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate flashcards. Please try again.";
      
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

  // === SAVE FLASHCARDS ===
  const saveFlashcardSet = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to save flashcard sets");
        return;
      }

      const saveRequest = {
        flashcards: flashcards,
        original_content: originalContent,
        content_source: contentSource,
        num_cards: numCards,
        words_per_card: wordsPerCard
      };

      await axios.post(
        getApiUrl("api/flashcards/save"),
        saveRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      toast.success("Flashcard set saved successfully!");
      setStep("study");
    } catch (err: any) {
      console.error("Failed to save flashcard set:", err);
      alert("Failed to save flashcard set. Please try again.");
    }
  };

  // === STUDY MODE HANDLERS ===
  const flipCard = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    
    // Play flip sound
    const audio = new Audio('/sounds/flipcard-91468.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {}); // Ignore errors if sound file doesn't exist
    
    setTimeout(() => {
      setShowBack(!showBack);
      setIsFlipping(false);
    }, 300);
  };

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowBack(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setShowBack(false);
    }
  };

  // === FETCH PAST FLASHCARD SETS ===
  const fetchPastFlashcardSets = async () => {
    if (pastFlashcardSets.length > 0) {
      setShowPastSets(true);
      return;
    }

    setLoadingPastSets(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to view past flashcard sets");
        return;
      }

      const res = await axios.get(
        getApiUrl("api/flashcards/history"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      setPastFlashcardSets(res.data.flashcard_sets || []);
      setShowPastSets(true);
    } catch (err: any) {
      console.error("Failed to fetch past flashcard sets:", err);
      alert("Failed to load flashcard history");
    } finally {
      setLoadingPastSets(false);
    }
  };

  const loadPastFlashcardSet = async (flashcard_id: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        getApiUrl(`api/flashcards/history/${flashcard_id}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const fset = res.data.flashcard_set;
      setFlashcards(fset.flashcards);
      setOriginalContent(fset.original_content || "");
      setContentSource(fset.content_source);
      setNumCards(fset.num_cards_requested);
      setWordsPerCard(fset.words_per_card);
      setViewingPastSet(fset);
      setCurrentIndex(0);
      setShowBack(false);
      setShowGridView(false);
      setShowPastSets(false);
      setStep("study");
    } catch (err: any) {
      console.error("Failed to load flashcard set:", err);
      alert("Failed to load flashcard set");
    }
  };

  // === RENDER FUNCTIONS ===
  const renderInputStep = () => (
    <>
        <div className="flex items-center gap-3 mb-6">
          <Layers className="fill-black" size={40} />
          <h1 className="text-4xl font-black uppercase">Generate Flashcards</h1>
        </div>
        <p className="text-lg font-bold mb-6">
          Create exam-focused flashcards from your content
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
            placeholder="Paste your study material here (minimum 100 characters)..."
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
            onClick={proceedToSettings}
            className="flex-1 bg-yellow-300 border-4 border-black px-6 py-4 font-black uppercase text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
          >
            Next: Settings
            <ArrowRight size={24} />
          </button>
          
          <button
            onClick={fetchPastFlashcardSets}
            disabled={loadingPastSets}
            className="bg-blue-300 border-4 border-black px-6 py-4 font-black uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <History size={24} />
            {loadingPastSets ? "Loading..." : "History"}
          </button>
        </div>
    </>
  );

  const renderSettingsStep = () => (
    <>
        <h2 className="text-3xl font-black uppercase mb-6">Flashcard Settings</h2>

        {/* Card Limit Mode */}
        <div className="mb-6">
          <label className="block text-lg font-black uppercase mb-2">
            Number of Flashcards
          </label>
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setCardLimitMode("limited")}
              className={`flex-1 py-3 px-4 border-4 border-black font-black uppercase transition-all ${
                cardLimitMode === "limited"
                  ? "bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              Limited (5-50)
            </button>
            <button
              onClick={() => setCardLimitMode("unlimited")}
              className={`flex-1 py-3 px-4 border-4 border-black font-black uppercase transition-all ${
                cardLimitMode === "unlimited"
                  ? "bg-yellow-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              Unlimited
            </button>
          </div>
          
          {cardLimitMode === "limited" && (
            <input
              type="number"
              min="5"
              max="50"
              value={numCards}
              onChange={(e) => setNumCards(parseInt(e.target.value) || 10)}
              className="w-full p-4 border-4 border-black font-bold text-xl focus:outline-none focus:ring-4 focus:ring-yellow-300"
            />
          )}
          
          {cardLimitMode === "unlimited" && (
            <div className="bg-blue-100 border-4 border-black p-4">
              <p className="font-black text-sm">📚 UNLIMITED MODE:</p>
              <p className="font-bold text-sm mt-1">Will generate as many flashcards as the content allows</p>
            </div>
          )}
        </div>

        {/* Words Per Card */}
        <div className="mb-6">
          <label className="block text-lg font-black uppercase mb-2">
            Max Words Per Side (20-50)
          </label>
          <input
            type="number"
            min="20"
            max="50"
            value={wordsPerCard}
            onChange={(e) => setWordsPerCard(parseInt(e.target.value) || 35)}
            className="w-full p-4 border-4 border-black font-bold text-xl focus:outline-none focus:ring-4 focus:ring-yellow-300"
          />
          <p className="text-sm font-bold mt-2 text-gray-600">
            Shorter = faster review. Exam-style: Keep it concise!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setStep("input")}
            className="bg-gray-200 border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          
          <button
            onClick={resetToDefaults}
            className="bg-white border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
          >
            <RotateCcw size={20} />
            Reset to Default
          </button>
          
          <button
            onClick={generateFlashcards}
            disabled={isGenerating}
            className="flex-1 bg-yellow-300 border-4 border-black px-6 py-3 font-black uppercase text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain size={24} />
                Generate Flashcards
              </>
            )}
          </button>
        </div>
    </>
  );



  const renderPreviewStep = () => {
    const currentCard = flashcards[currentIndex];
    
    return (
    <>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="fill-green-500" size={40} />
            <h2 className="text-3xl font-black uppercase">Flashcards Generated!</h2>
          </div>
          <div className="text-right">
            <p className="text-lg font-black">{flashcards.length} Cards Created</p>
            <p className="text-sm font-bold text-gray-600">Max {wordsPerCard} words/side</p>
          </div>
        </div>

        {/* Preview Controls */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowGridView(!showGridView)}
            className="bg-blue-300 border-4 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
          >
            <Layers size={16} />
            {showGridView ? "Card View" : "View All"}
          </button>
          
          {!showGridView && (
            <div className="flex items-center gap-4">
              <button
                onClick={prevCard}
                disabled={currentIndex === 0}
                className="bg-gray-200 border-4 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronLeft size={20} />
              </button>
              
              <span className="font-black text-lg">Card {currentIndex + 1} / {flashcards.length}</span>
              
              <button
                onClick={nextCard}
                disabled={currentIndex === flashcards.length - 1}
                className="bg-gray-200 border-4 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Preview Display */}
        {showGridView ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto p-2">
            {flashcards.map((card, idx) => (
              <div key={idx} className="border-4 border-black p-4 bg-gray-50 h-fit">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-black text-sm">Card {idx + 1}</span>
                  <span className={`text-xs font-black px-2 py-1 border-2 border-black ${
                    card.difficulty === 'easy' ? 'bg-green-200' :
                    card.difficulty === 'medium' ? 'bg-yellow-200' : 'bg-red-200'
                  }`}>
                    {card.difficulty.toUpperCase()}
                  </span>
                </div>
                <p className="font-bold text-sm mb-2">Q: {card.front}</p>
                <p className="font-bold text-sm text-gray-600">A: {card.back}</p>
              </div>
            ))}
          </div>
          ) : (
          <div className="flex-1 flex flex-col items-center justify-center mb-6">
            <p className="text-sm font-bold text-gray-600 mb-4">Click the card to flip</p>
            <div 
              onClick={flipCard}
              className={`w-96 h-[500px] border-4 border-black bg-yellow-200 p-8 cursor-pointer hover:bg-yellow-100 transition-all flex items-center justify-center text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                isFlipping ? 'opacity-50' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
                transition: 'transform 0.3s ease-in-out'
              }}
            >
            <div>
              <p className="text-sm font-black uppercase mb-4 text-gray-600">
                {showBack ? "ANSWER" : "QUESTION"}
              </p>
              <p className="text-2xl font-black leading-relaxed">
                {showBack ? currentCard.back : currentCard.front}
              </p>
            </div>
          </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-auto">
          <button
            onClick={resetAll}
            className="bg-gray-200 border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
          >
            <RefreshCcw size={20} />
            Start Over
          </button>
          
          <button
            onClick={saveFlashcardSet}
            className="flex-1 bg-green-300 border-4 border-black px-6 py-3 font-black uppercase text-lg shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle size={24} />
            Save & Start Studying
          </button>
        </div>
    </>
    );
  };

  const renderStudyStep = () => {
    if (flashcards.length === 0) return null;
    const currentCard = flashcards[currentIndex];
    
    return (
      <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black uppercase">Study Mode</h2>
              <button
                onClick={() => setShowGridView(!showGridView)}
                className="bg-blue-300 border-4 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <Layers size={16} />
                {showGridView ? "Card View" : "View All"}
              </button>
              <button
                onClick={resetAll}
                className="bg-green-300 border-4 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <RefreshCcw size={16} />
                New Flashcards
              </button>
            </div>
            <div className="text-right">
              <p className="text-lg font-black">Card {currentIndex + 1} / {flashcards.length}</p>
              <span className={`text-xs font-black px-2 py-1 border-2 border-black ${
                currentCard.difficulty === 'easy' ? 'bg-green-200' :
                currentCard.difficulty === 'medium' ? 'bg-yellow-200' : 'bg-red-200'
              }`}>
                {currentCard.difficulty.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Flashcard Display */}
          {showGridView ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-y-auto mb-6">
              {flashcards.map((card, idx) => (
                <div key={idx} className="border-4 border-black p-4 bg-gray-50 h-fit">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm">Card {idx + 1}</span>
                    <span className={`text-xs font-black px-2 py-1 border-2 border-black ${
                      card.difficulty === 'easy' ? 'bg-green-200' :
                      card.difficulty === 'medium' ? 'bg-yellow-200' : 'bg-red-200'
                    }`}>
                      {card.difficulty.toUpperCase()}
                    </span>
                  </div>
                  <p className="font-bold text-sm mb-2">Q: {card.front}</p>
                  <p className="font-bold text-sm text-gray-600">A: {card.back}</p>
                </div>
              ))}
            </div>
          ) : (
          <div className="flex-1 flex flex-col items-center justify-center mb-6">
            <p className="text-sm font-bold text-gray-600 mb-4">Click the card to flip</p>
            <div 
              onClick={flipCard}
              className={`w-96 h-[500px] border-4 border-black bg-yellow-200 p-8 cursor-pointer hover:bg-yellow-100 transition-all flex items-center justify-center text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] ${
                isFlipping ? 'opacity-50' : ''
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
                transition: 'transform 0.3s ease-in-out'
              }}
            >
            <div>
              <p className="text-sm font-black uppercase mb-4 text-gray-600">
                {showBack ? "ANSWER" : "QUESTION"}
              </p>
              <p className="text-2xl font-black leading-relaxed">
                {showBack ? currentCard.back : currentCard.front}
              </p>
            </div>
          </div>
          </div>
          )}

          {/* Navigation */}
          {!showGridView && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="bg-gray-200 border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Previous
            </button>
            
            <button
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              className="bg-yellow-300 border-4 border-black px-6 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 flex items-center gap-2"
            >
              Next
              <ChevronRight size={20} />
            </button>
          </div>
          )}
      </>
    );
  };

  const handleShowSignLanguage = () => {
    const currentCard = flashcards[currentIndex];
    const textToShow = showBack ? currentCard.back : currentCard.front;
    setSignLanguageText(textToShow);
    setShowSignLanguage(true);
  };

  const renderPastSetsPanel = () => {
    if (!showPastSets) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b-4 border-black flex items-center justify-between">
            <h2 className="text-2xl font-black uppercase">Flashcard History</h2>
            <button
              onClick={() => setShowPastSets(false)}
              className="border-4 border-black p-2 hover:bg-gray-100"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            {pastFlashcardSets.length === 0 ? (
              <p className="text-center font-bold text-gray-500">No flashcard sets yet</p>
            ) : (
              <div className="space-y-4">
                {pastFlashcardSets.map((fset) => (
                  <div
                    key={fset.flashcard_id}
                    onClick={() => loadPastFlashcardSet(fset.flashcard_id)}
                    className="border-4 border-black p-4 hover:bg-yellow-50 cursor-pointer transition-all bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-lg">Set #{fset.flashcard_id}</p>
                        <p className="font-bold text-sm text-gray-600">
                          {fset.total_cards} cards • {fset.words_per_card} words/side
                        </p>
                        <p className="font-bold text-xs text-gray-500 mt-1">
                          {new Date(fset.created_at).toLocaleDateString()} • {fset.content_source.toUpperCase()}
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
      {step === "settings" && renderSettingsStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "study" && renderStudyStep()}
      {renderPastSetsPanel()}
      
      {/* Sign Language Avatar Button - Show in preview and study mode */}
      {(step === "preview" || step === "study") && !showGridView && (
        <button
          onClick={handleShowSignLanguage}
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
    </>
  );
}
