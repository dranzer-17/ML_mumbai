"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Trophy, 
  Loader2, 
  ArrowRight, 
  RefreshCcw,
  FileText,
  Link as LinkIcon,
  Upload,
  ArrowLeft,
  Brain,
  TrendingUp,
  History,
  X,
  Hand
} from "lucide-react";
import SignLanguageAvatar from "@/components/SignLanguageAvatar";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
}

interface UserAnswer {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
}

interface Analysis {
  analysis: string;
  topics_to_improve: string[];
  strengths: string[];
  recommendations: string[];
}

interface PastQuiz {
  quiz_id: number;
  score: number;
  total_questions: number;
  percentage: number;
  difficulty: string;
  content_source: string;
  created_at: string;
  has_analysis: boolean;
}

type InputMode = "text" | "pdf" | "url";

// Helper function to strip letter prefixes from options (A., B., A), A.A, B.B, etc.)
const stripOptionPrefix = (option: string): string => {
  // Remove patterns like:
  // - "A." or "B." (single letter + period)
  // - "A)" or "B)" (single letter + parenthesis)
  // - "A.A" or "B.B" (letter + period + letter)
  // - "A.A)" or "B.B)" (letter + period + letter + parenthesis)
  // - "A. A)" (with spaces)
  // First try to match double letter pattern (A.A, B.B), then single letter pattern
  let cleaned = option.replace(/^[A-Z]\.[A-Z][.)]?\s*/, ''); // Matches A.A, A.A), B.B, etc.
  if (cleaned === option) {
    // If no match, try single letter pattern
    cleaned = option.replace(/^[A-Z][.)]\s*/, ''); // Matches A., A), B., etc.
  }
  return cleaned.trim();
};

export default function QuizPage() {
  const router = useRouter();
  
  // --- STATE MANAGEMENT ---
  const [step, setStep] = useState<"input" | "settings" | "loading" | "play" | "result" | "analysis">("input");
  
  // Input Data
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [contentSource, setContentSource] = useState<string>("text");
  
  // Settings Data
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  
  // Game Data
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  
  // Analysis Data
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  
  // Sign Language Avatar
  const [showSignLanguage, setShowSignLanguage] = useState(false);
  const [signLanguageText, setSignLanguageText] = useState("");
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  
  // Past Quizzes Data
  const [showPastQuizzes, setShowPastQuizzes] = useState(false);
  const [pastQuizzes, setPastQuizzes] = useState<PastQuiz[]>([]);
  const [loadingPastQuizzes, setLoadingPastQuizzes] = useState(false);
  const [viewingPastQuiz, setViewingPastQuiz] = useState<any>(null);
  const [loadingPastQuizDetails, setLoadingPastQuizDetails] = useState(false);

  // --- HANDLERS ---

  const handleContinueToSettings = () => {
    if (inputMode === "text" && (!textInput.trim() || textInput.length < 50)) {
      alert("Please enter at least 50 characters of text.");
      return;
    }
    if (inputMode === "url" && !urlInput.trim()) {
      alert("Please enter a valid URL.");
      return;
    }
    if (inputMode === "pdf" && !pdfFile) {
      alert("Please upload a PDF file.");
      return;
    }
    setStep("settings");
  };

  const handleGenerate = async () => {
    setStep("loading");
    
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("num_questions", numQuestions.toString());
      formData.append("difficulty", difficulty);
      
      // Store original content and source
      if (inputMode === "text") {
        formData.append("text", textInput);
        setOriginalContent(textInput);
        setContentSource("text");
      } else if (inputMode === "url") {
        formData.append("url", urlInput);
        setOriginalContent(urlInput);
        setContentSource("url");
      } else if (inputMode === "pdf" && pdfFile) {
        formData.append("pdf", pdfFile);
        setOriginalContent(pdfFile.name);
        setContentSource("pdf");
      }

      const res = await axios.post("http://127.0.0.1:8000/api/quiz/generate", formData, {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      });

      setQuestions(res.data.quiz);
      // Store extracted content for analysis
      if (res.data.extracted_content) {
        setOriginalContent(res.data.extracted_content);
      } else if (inputMode === "text") {
        setOriginalContent(textInput);
      } else if (inputMode === "url") {
        setOriginalContent(urlInput);
      }
      
      if (res.data.content_source) {
        setContentSource(res.data.content_source);
      } else {
        setContentSource(inputMode);
      }
      
      setStep("play");
      setCurrentIndex(0);
      setScore(0);
      setUserAnswers([]);
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate quiz. Please try again.";
      
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || "";
        
        if (status === 429) {
          errorMessage = "API quota exceeded. Please check your API quota or try again later.";
        } else if (status === 401) {
          errorMessage = "Authentication failed. Please check your API key configuration.";
        } else if (status === 400) {
          errorMessage = detail || "Invalid request. Please check your input and try again.";
        } else if (status === 500) {
          errorMessage = detail || "Server error. Please try again later.";
        } else {
          errorMessage = detail || `Error ${status}: ${errorMessage}`;
        }
      }
      
      alert(errorMessage);
      setStep("settings");
    }
  };

  const handleOptionSelect = (option: string) => {
    if (showAnswer) return;
    
    const currentQuestion = questions[currentIndex];
    const isCorrect = option === currentQuestion.correct_answer;
    
    setSelectedOption(option);
    setShowAnswer(true);

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    
    // Store user answer
    setUserAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        userAnswer: option,
        isCorrect: isCorrect
      }
    ]);
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowAnswer(false);
    } else {
      setStep("result");
      // Save quiz when results are shown (without analysis initially)
      saveQuiz(null);
    }
  };

  const handleShowSignLanguage = () => {
    if (questions.length > 0 && questions[currentIndex]) {
      const currentQuestion = questions[currentIndex].question;
      setSignLanguageText(currentQuestion);
      setShowSignLanguage(true);
    }
  };

  const saveQuiz = async (analysisData: Analysis | null = null) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found, skipping quiz save");
        return;
      }

      const saveRequest = {
        questions: questions,
        user_answers: userAnswers.map(ua => ({
          questionId: ua.questionId,
          userAnswer: ua.userAnswer,
          isCorrect: ua.isCorrect
        })),
        score: score,
        total_questions: questions.length,
        original_content: originalContent,
        content_source: contentSource,
        difficulty: difficulty,
        analysis: analysisData
      };

      await axios.post(
        "http://127.0.0.1:8000/api/quiz/save",
        saveRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      console.log("Quiz saved successfully");
    } catch (err: any) {
      console.error("Failed to save quiz:", err);
      // Don't show error to user, just log it
    }
  };

  const handleGetAnalysis = async () => {
    setLoadingAnalysis(true);
    
    try {
      const token = localStorage.getItem("token");
      
      // Separate correct and wrong answers
      const correctAnswers = questions
        .filter((q, idx) => userAnswers[idx]?.isCorrect)
        .map(q => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer
        }));
      
      const wrongAnswers = questions
        .filter((q, idx) => !userAnswers[idx]?.isCorrect)
        .map((q, idx) => {
          const userAnswer = userAnswers.find(ua => ua.questionId === q.id);
          return {
            id: q.id,
            question: q.question,
            options: q.options,
            correct_answer: q.correct_answer,
            user_answer: userAnswer?.userAnswer || ""
          };
        });
      
      const analysisRequest = {
        original_content: originalContent,
        content_source: contentSource,
        correct_answers: correctAnswers,
        wrong_answers: wrongAnswers
      };
      
      const res = await axios.post(
        "http://127.0.0.1:8000/api/quiz/analyze",
        analysisRequest,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );
      
      setAnalysis(res.data);
      
      // Save quiz with analysis
      await saveQuiz(res.data);
      
      setStep("analysis");
    } catch (err: any) {
      console.error(err);
      let errorMessage = "Failed to generate analysis. Please try again.";
      
      if (err.response) {
        const status = err.response.status;
        const detail = err.response.data?.detail || "";
        
        if (status === 429) {
          errorMessage = "API quota exceeded. Please try again later.";
        } else if (status === 500) {
          errorMessage = detail || "Server error. Please try again later.";
        } else {
          errorMessage = detail || errorMessage;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const resetQuiz = () => {
    setStep("input");
    setTextInput("");
    setUrlInput("");
    setPdfFile(null);
    setQuestions([]);
    setSelectedOption(null);
    setShowAnswer(false);
    setUserAnswers([]);
    setAnalysis(null);
    setOriginalContent("");
    setViewingPastQuiz(null);
  };

  const retakeQuiz = () => {
    // Reset game state but keep questions for retake
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setShowAnswer(false);
    setUserAnswers([]);
    setStep("play");
  };

  const fetchPastQuizzes = async () => {
    if (pastQuizzes.length > 0) {
      // Already loaded, just show the panel
      setShowPastQuizzes(true);
      return;
    }

    setLoadingPastQuizzes(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to view past quizzes");
        return;
      }

      const res = await axios.get(
        "http://127.0.0.1:8000/api/quiz/history",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      setPastQuizzes(res.data.quizzes || []);
      setShowPastQuizzes(true);
    } catch (err: any) {
      console.error("Failed to fetch past quizzes:", err);
      alert("Failed to load past quizzes. Please try again.");
    } finally {
      setLoadingPastQuizzes(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateString;
    }
  };

  const loadPastQuizDetails = async (quizId: number) => {
    setLoadingPastQuizDetails(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to view quiz details");
        return;
      }

      const res = await axios.get(
        `http://127.0.0.1:8000/api/quiz/history/${quizId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      const quizData = res.data.quiz;
      
      // Set the quiz data to display
      setQuestions(quizData.questions || []);
      setUserAnswers((quizData.user_answers || []).map((ua: any) => ({
        questionId: ua.questionId,
        userAnswer: ua.userAnswer,
        isCorrect: ua.isCorrect
      })));
      setScore(quizData.score || 0);
      setDifficulty(quizData.difficulty || "Medium");
      setContentSource(quizData.content_source || "text");
      setOriginalContent(quizData.original_content || "");
      
      // Set analysis if available
      if (quizData.analysis) {
        setAnalysis(quizData.analysis);
      } else {
        setAnalysis(null);
      }
      
      // Close the panel and show results
      setShowPastQuizzes(false);
      setViewingPastQuiz(quizData);
      setStep("result");
      
      // If analysis exists, we can show it too
      if (quizData.analysis) {
        // Optionally go to analysis step
      }
    } catch (err: any) {
      console.error("Failed to load quiz details:", err);
      alert("Failed to load quiz details. Please try again.");
    } finally {
      setLoadingPastQuizDetails(false);
    }
  };

  // Get correct and wrong answers for results page
  const correctAnswers = questions.filter((q, idx) => userAnswers[idx]?.isCorrect);
  const wrongAnswers = questions.filter((q, idx) => !userAnswers[idx]?.isCorrect);

  return (
    <div className="max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#10b981] border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <ClipboardList className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">
              Quiz Generator
            </h1>
            <p className="font-bold text-gray-500">From Content to Test in Seconds.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={fetchPastQuizzes}
            disabled={loadingPastQuizzes}
            className="px-4 py-2 bg-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loadingPastQuizzes ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <History size={18} />
            )}
            PAST QUIZZES
          </button>
          
          {step === "play" && (
             <div className="bg-black text-white px-4 py-2 font-bold border-[3px] border-black shadow-[4px_4px_0px_0px_var(--neo-primary)]">
                Score: {score} / {questions.length}
             </div>
          )}
        </div>
      </div>

      {/* --- STEP 1: INPUT METHOD --- */}
      {step === "input" && (
        <div className="space-y-6">
          <div className="card-neo">
            <h2 className="text-2xl font-black uppercase mb-6">Choose Your Source</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => setInputMode("text")}
                className={`p-6 border-[3px] border-black font-bold text-lg transition-all flex flex-col items-center gap-3 ${
                  inputMode === "text" 
                  ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                  : "bg-white hover:bg-gray-100"
                }`}
              >
                <FileText size={32} />
                <span>Paste Text</span>
              </button>
              
              <button
                onClick={() => setInputMode("pdf")}
                className={`p-6 border-[3px] border-black font-bold text-lg transition-all flex flex-col items-center gap-3 ${
                  inputMode === "pdf" 
                  ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                  : "bg-white hover:bg-gray-100"
                }`}
              >
                <Upload size={32} />
                <span>Upload PDF</span>
              </button>
              
              <button
                onClick={() => setInputMode("url")}
                className={`p-6 border-[3px] border-black font-bold text-lg transition-all flex flex-col items-center gap-3 ${
                  inputMode === "url" 
                  ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                  : "bg-white hover:bg-gray-100"
                }`}
              >
                <LinkIcon size={32} />
                <span>Enter URL</span>
              </button>
            </div>

            {inputMode === "text" && (
              <div>
                <label className="font-black uppercase text-sm mb-2 block">
                  Paste Your Content
                </label>
                <textarea 
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50 h-64 resize-none font-sans text-sm"
                  placeholder="Paste lecture notes, articles, or study materials here..."
                ></textarea>
                <p className="text-xs font-bold text-gray-500 mt-2">
                  Minimum 50 characters required
                </p>
              </div>
            )}

            {inputMode === "pdf" && (
              <div>
                <label className="font-black uppercase text-sm mb-2 block">
                  Upload PDF File
                </label>
                <div className="border-[3px] border-dashed border-black p-8 text-center bg-gray-50">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="font-bold text-gray-600">
                      {pdfFile ? pdfFile.name : "Click to upload PDF"}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Max 10MB • Only PDF files
                    </p>
                  </label>
                </div>
              </div>
            )}

            {inputMode === "url" && (
              <div>
                <label className="font-black uppercase text-sm mb-2 block">
                  Enter Article/Page URL
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full p-4 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:bg-yellow-50 font-sans"
                  placeholder="https://example.com/article"
                />
                <p className="text-xs font-bold text-gray-500 mt-2">
                  We'll extract the content automatically
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={handleContinueToSettings}
            className="w-full py-4 bg-black text-white font-black text-xl border-[3px] border-black shadow-[6px_6px_0px_0px_var(--neo-accent)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--neo-accent)] transition-all flex items-center justify-center gap-2"
          >
            CONTINUE <ArrowRight size={24} />
          </button>
        </div>
      )}

      {/* --- STEP 2: SETTINGS --- */}
      {step === "settings" && (
        <div className="space-y-6">
          <button
            onClick={() => setStep("input")}
            className="flex items-center gap-2 font-bold text-gray-600 hover:text-black mb-4"
          >
            <ArrowLeft size={20} /> Back to Source
          </button>

          <div className="card-neo">
            <h2 className="text-2xl font-black uppercase mb-6">Quiz Settings</h2>
            
            <div className="space-y-6">
              <div>
                <label className="font-black uppercase text-sm mb-3 block">Difficulty Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {["Easy", "Medium", "Hard"].map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`p-4 border-[3px] border-black font-bold text-lg transition-all ${
                        difficulty === level 
                        ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-black uppercase text-sm mb-3 block">Number of Questions</label>
                <div className="grid grid-cols-3 gap-3">
                  {[5, 10, 15].map((num) => (
                    <button
                      key={num}
                      onClick={() => setNumQuestions(num)}
                      className={`p-4 border-[3px] border-black font-bold text-lg transition-all ${
                        numQuestions === num 
                        ? "bg-[var(--neo-secondary)] text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" 
                        : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            className="w-full py-4 bg-black text-white font-black text-xl border-[3px] border-black shadow-[6px_6px_0px_0px_var(--neo-accent)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--neo-accent)] transition-all flex items-center justify-center gap-2"
          >
            GENERATE QUIZ <ArrowRight size={24} />
          </button>
        </div>
      )}

      {/* --- STEP 3: LOADING --- */}
      {step === "loading" && (
         <div className="card-neo min-h-[400px] flex flex-col items-center justify-center text-center">
            <Loader2 size={64} className="animate-spin mb-6 text-[var(--neo-primary)]" />
            <h2 className="text-3xl font-black uppercase mb-2">Generating Quiz...</h2>
            <p className="font-bold text-gray-500 max-w-md">
               Saarthi is analyzing your text and crafting custom questions.
            </p>
         </div>
      )}

      {/* --- STEP 3: PLAY --- */}
      {step === "play" && questions.length > 0 && (
         <div className="card-neo min-h-[500px] flex flex-col">
            <div className="w-full bg-gray-200 h-4 border-b-[3px] border-black mb-6">
               <div 
                  className="bg-[var(--neo-primary)] h-full transition-all duration-300 ease-out"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
               />
            </div>

            <div className="flex-1">
               <span className="font-black text-gray-400 text-sm uppercase">Question {currentIndex + 1} of {questions.length}</span>
               <h2 className="text-2xl md:text-3xl font-black mt-2 mb-8 leading-tight">
                  {questions[currentIndex].question}
               </h2>

               <div className="grid grid-cols-1 gap-4">
                  {questions[currentIndex].options.map((option, idx) => {
                     let btnStyle = "bg-white hover:bg-gray-50";
                     let icon = null;

                     if (showAnswer) {
                        if (option === questions[currentIndex].correct_answer) {
                           btnStyle = "bg-[#CCFFD6] border-green-600 ring-2 ring-green-600";
                           icon = <CheckCircle size={20} className="text-green-700" />;
                        } else if (selectedOption === option) {
                           btnStyle = "bg-[#FFCCF9] border-red-500";
                           icon = <XCircle size={20} className="text-red-700" />;
                        } else {
                           btnStyle = "opacity-50 bg-gray-100";
                        }
                     }

                     return (
                        <button
                           key={idx}
                           onClick={() => handleOptionSelect(option)}
                           disabled={showAnswer}
                           className={`w-full text-left p-5 border-[3px] border-black font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex justify-between items-center ${btnStyle} ${!showAnswer && "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"}`}
                        >
                           <span><span className="font-black mr-3">{String.fromCharCode(65 + idx)}.</span> {stripOptionPrefix(option)}</span>
                           {icon}
                        </button>
                     )
                  })}
               </div>
            </div>

            <div className="mt-8 flex justify-end h-14">
               {showAnswer && (
                  <button 
                     onClick={handleNext}
                     className="bg-[var(--neo-secondary)] text-black px-8 py-3 font-black text-lg border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                  >
                     {currentIndex + 1 === questions.length ? "SEE RESULTS" : "NEXT QUESTION"} <ArrowRight size={20} />
                  </button>
               )}
            </div>
         </div>
      )}

      {/* --- STEP 4: DETAILED RESULTS --- */}
      {step === "result" && (
        <div className="space-y-6">
          {/* Header with New Quiz Button */}
          <div className="flex justify-between items-center mb-4">
            {viewingPastQuiz && (
              <div className="flex items-center gap-2 text-gray-600">
                <History size={20} />
                <span className="font-bold">Viewing Past Quiz #{viewingPastQuiz.quiz_id}</span>
                <span className="text-sm">({formatDate(viewingPastQuiz.created_at)})</span>
              </div>
            )}
            {!viewingPastQuiz && <div></div>}
            <div className="flex gap-2">
              {viewingPastQuiz && (
                <button 
                  onClick={() => {
                    setViewingPastQuiz(null);
                    resetQuiz();
                  }}
                  className="px-6 py-2 bg-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
                >
                  <ArrowLeft size={18} /> BACK
                </button>
              )}
              <button 
                onClick={resetQuiz}
                className="px-6 py-2 bg-[var(--neo-primary)] text-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <RefreshCcw size={18} /> NEW QUIZ
              </button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="card-neo text-center py-8">
            <div className="relative mb-6 inline-block">
              <div className="w-24 h-24 bg-[var(--neo-accent)] border-[4px] border-black rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <Trophy size={48} className="text-black" />
              </div>
              <div className="absolute -top-2 -right-2 bg-[var(--neo-primary)] text-white border-[3px] border-black px-3 py-1 font-black transform rotate-12">
                {Math.round((score / questions.length) * 100)}%
              </div>
            </div>

            <h2 className="text-4xl font-black uppercase mb-4">Quiz Complete!</h2>
            <p className="text-xl font-bold text-gray-600 mb-6">
              You scored <span className="text-[var(--neo-primary)] text-3xl mx-1 border-b-4 border-[var(--neo-primary)]">{score}</span> out of {questions.length}
            </p>
            <p className="text-sm font-bold text-gray-500">
              {correctAnswers.length} Correct • {wrongAnswers.length} Incorrect
            </p>
          </div>

          {/* All Questions in Order */}
          <div className="card-neo">
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const userAnswer = userAnswers.find(ua => ua.questionId === q.id);
                const isCorrect = userAnswer?.isCorrect || false;
                
                return (
                  <div 
                    key={q.id} 
                    className={`p-4 border-[2px] rounded ${
                      isCorrect 
                        ? "bg-green-50 border-green-600" 
                        : "bg-red-50 border-red-600"
                    }`}
                  >
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-black text-2xl">{q.id}.</span>
                        {isCorrect ? (
                          <CheckCircle size={24} className="text-green-700" />
                        ) : (
                          <XCircle size={24} className="text-red-700" />
                        )}
                        <p className={`font-bold text-lg ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                          {isCorrect ? "Correct" : "Incorrect"}
                        </p>
                      </div>
                      <p className="font-bold text-lg">{q.question}</p>
                    </div>
                    <div className="space-y-2 mb-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrectAnswer = opt === q.correct_answer;
                        const isUserAnswer = opt === userAnswer?.userAnswer;
                        
                        let optionStyle = "bg-white";
                        if (isCorrectAnswer) {
                          optionStyle = "bg-green-200 border-2 border-green-600 font-black";
                        } else if (isUserAnswer && !isCorrect) {
                          optionStyle = "bg-red-200 border-2 border-red-600 font-black";
                        }
                        
                        return (
                          <div
                            key={optIdx}
                            className={`p-2 rounded ${optionStyle}`}
                          >
                            <span className="font-black mr-2">{String.fromCharCode(65 + optIdx)}.</span>
                            {stripOptionPrefix(opt)}
                            {isCorrectAnswer && (
                              <CheckCircle size={16} className="inline ml-2 text-green-700" />
                            )}
                            {isUserAnswer && !isCorrectAnswer && (
                              <XCircle size={16} className="inline ml-2 text-red-700" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {!isCorrect && userAnswer && (
                      <div className="mt-3 pt-3 border-t-2 border-gray-300">
                        <p className="text-sm font-bold text-gray-600">
                          <span className="text-red-700">Your answer:</span> {stripOptionPrefix(userAnswer.userAnswer)}
                        </p>
                        <p className="text-sm font-bold text-gray-600">
                          <span className="text-green-700">Correct answer:</span> {stripOptionPrefix(q.correct_answer)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {!viewingPastQuiz && (
              <button 
                onClick={handleGetAnalysis}
                disabled={loadingAnalysis}
                className="flex-1 px-8 py-4 bg-[var(--neo-primary)] text-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingAnalysis ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Generating Analysis...
                  </>
                ) : (
                  <>
                    <Brain size={20} /> GET ANALYSIS
                  </>
                )}
              </button>
            )}
            {viewingPastQuiz && viewingPastQuiz.analysis && (
              <button 
                onClick={() => setStep("analysis")}
                className="flex-1 px-8 py-4 bg-[var(--neo-primary)] text-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2"
              >
                <Brain size={20} /> VIEW ANALYSIS
              </button>
            )}
            {viewingPastQuiz && (
              <button 
                onClick={retakeQuiz}
                className="px-8 py-4 bg-green-300 border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-400 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <RefreshCcw size={20} /> RETAKE QUIZ
              </button>
            )}
            <button 
              onClick={resetQuiz}
              className="px-8 py-4 bg-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
            >
              <RefreshCcw size={20} /> TRY ANOTHER
            </button>
            <button 
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-black text-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_var(--neo-secondary)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--neo-secondary)] transition-all"
            >
              DASHBOARD
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 5: ANALYSIS --- */}
      {step === "analysis" && analysis && (
        <div className="space-y-6">
          <div className="card-neo">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center">
                <Brain className="text-white" size={24} />
              </div>
              <h2 className="text-3xl font-black uppercase">Performance Analysis</h2>
            </div>

            <div className="space-y-6">
              {/* Analysis Text */}
              <div className="p-6 bg-gray-50 border-[2px] border-black rounded">
                <h3 className="font-black uppercase mb-3 text-lg">Overall Analysis</h3>
                <p className="font-bold text-gray-700 leading-relaxed whitespace-pre-line">
                  {analysis.analysis}
                </p>
              </div>

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div className="p-6 bg-green-50 border-[2px] border-green-600 rounded">
                  <h3 className="font-black uppercase mb-3 text-lg flex items-center gap-2 text-green-700">
                    <TrendingUp size={20} /> Your Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="font-bold text-gray-700 flex items-start gap-2">
                        <CheckCircle size={18} className="text-green-700 mt-0.5 flex-shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Topics to Improve */}
              {analysis.topics_to_improve && analysis.topics_to_improve.length > 0 && (
                <div className="p-6 bg-yellow-50 border-[2px] border-yellow-600 rounded">
                  <h3 className="font-black uppercase mb-3 text-lg text-yellow-700">Topics to Improve</h3>
                  <ul className="space-y-2">
                    {analysis.topics_to_improve.map((topic, idx) => (
                      <li key={idx} className="font-bold text-gray-700 flex items-start gap-2">
                        <span className="text-yellow-700 font-black">•</span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="p-6 bg-blue-50 border-[2px] border-blue-600 rounded">
                  <h3 className="font-black uppercase mb-3 text-lg text-blue-700">Recommendations</h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="font-bold text-gray-700 flex items-start gap-2">
                        <ArrowRight size={18} className="text-blue-700 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setStep("result")}
              className="px-8 py-4 bg-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
            >
              <ArrowLeft size={20} /> BACK TO RESULTS
            </button>
            <button 
              onClick={resetQuiz}
              className="px-8 py-4 bg-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
            >
              <RefreshCcw size={20} /> TRY ANOTHER
            </button>
            <button 
              onClick={() => router.push("/dashboard")}
              className="px-8 py-4 bg-black text-white border-[3px] border-black font-black shadow-[4px_4px_0px_0px_var(--neo-secondary)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_var(--neo-secondary)] transition-all"
            >
              DASHBOARD
            </button>
          </div>
        </div>
      )}

      {/* Past Quizzes Panel - Bottom Right */}
      {showPastQuizzes && (
        <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 bg-[var(--neo-primary)] text-white border-b-[3px] border-black flex items-center justify-between">
            <h3 className="font-black text-xl uppercase flex items-center gap-2">
              <History size={24} /> Past Quizzes
            </h3>
            <button
              onClick={() => setShowPastQuizzes(false)}
              className="hover:bg-black/20 p-1 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingPastQuizzes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={32} className="animate-spin text-[var(--neo-primary)]" />
              </div>
            ) : pastQuizzes.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-bold text-gray-500">No past quizzes found</p>
                <p className="text-sm text-gray-400 mt-2">Complete a quiz to see it here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastQuizzes.map((quiz) => (
                  <div
                    key={quiz.quiz_id}
                    onClick={() => !loadingPastQuizDetails && loadPastQuizDetails(quiz.quiz_id)}
                    className={`p-4 bg-gray-50 border-[2px] border-black rounded hover:bg-gray-100 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer ${
                      loadingPastQuizDetails ? "opacity-50 cursor-wait" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-sm">Quiz #{quiz.quiz_id}</span>
                      <span className={`font-black text-sm px-2 py-1 rounded ${
                        quiz.percentage >= 80 ? "bg-green-200 text-green-800" :
                        quiz.percentage >= 60 ? "bg-yellow-200 text-yellow-800" :
                        "bg-red-200 text-red-800"
                      }`}>
                        {quiz.percentage}%
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-bold">
                        Score: <span className="text-[var(--neo-primary)]">{quiz.score}</span> / {quiz.total_questions}
                      </p>
                      <p className="text-gray-600">
                        Difficulty: <span className="font-bold">{quiz.difficulty}</span>
                      </p>
                      <p className="text-gray-600">
                        Source: <span className="font-bold uppercase">{quiz.content_source}</span>
                      </p>
                      {quiz.has_analysis && (
                        <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
                          <Brain size={12} /> Has Analysis
                        </p>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(quiz.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Language Avatar Button - Only show during play mode */}
      {step === "play" && (
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
    </div>
  );
}