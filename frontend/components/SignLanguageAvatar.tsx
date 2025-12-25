"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Hand, X, Play, Pause } from "lucide-react";

interface SignLanguageAvatarProps {
  text: string;
  isVisible: boolean;
  onClose: () => void;
}

// Common words that have their own sign language videos
const COMMON_WORDS = [
  'hi', 'hello', 'bye', 'goodbye', 'thank-you', 'thanks', 'please', 
  'yes', 'no', 'ok', 'okay', 'good', 'bad', 'welcome', 'you', 'my',
  'name', 'is', 'not', 'love-you', 'everyone', 'good-morning', 'how-are-you',
  'what'
];

export default function SignLanguageAvatar({ text, isVisible, onClose }: SignLanguageAvatarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [signItems, setSignItems] = useState<Array<{type: 'word' | 'letter' | 'space', value: string}>>([]);
  const [modalSize, setModalSize] = useState({ width: 400, height: 600 });
  const [isResizing, setIsResizing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Parse text into words and letters
  useEffect(() => {
    const cleanText = text.toLowerCase().trim();
    const words = cleanText.split(/\s+/);
    const items: Array<{type: 'word' | 'letter' | 'space', value: string}> = [];

    words.forEach((word, wordIdx) => {
      const cleanWord = word.replace(/[^a-zA-Z-]/g, '');
      
      // Check if word exists in common words
      const wordMatch = COMMON_WORDS.find(cw => cw === cleanWord || cw.replace(/-/g, '') === cleanWord.replace(/-/g, ''));
      
      if (wordMatch && cleanWord.length > 0) {
        // Add the word as a single item
        items.push({ type: 'word', value: wordMatch });
      } else if (cleanWord.length > 0) {
        // Split into individual letters
        cleanWord.split('').forEach(letter => {
          if (letter.match(/[a-z]/)) {
            items.push({ type: 'letter', value: letter });
          }
        });
      }
      
      // Add space between words (except after last word)
      if (wordIdx < words.length - 1) {
        items.push({ type: 'space', value: ' ' });
      }
    });

    setSignItems(items);
    setCurrentItemIndex(0);
  }, [text]);

  const playNextItem = useCallback(() => {
    if (currentItemIndex >= signItems.length) {
      setIsPlaying(false);
      setCurrentItemIndex(0);
      return;
    }

    const currentItem = signItems[currentItemIndex];
    
    // Handle spaces
    if (currentItem.type === 'space') {
      timeoutRef.current = setTimeout(() => {
        setCurrentItemIndex(prev => prev + 1);
      }, 800);
      return;
    }

    // Load and play the video
    if (videoRef.current) {
      // Try webm first, then mp4 if webm fails
      const videoPathWebm = `/signs/${currentItem.value}.webm`;
      const videoPathMp4 = `/signs/${currentItem.value}.mp4`;
      
      // Preload next video
      const nextIdx = currentItemIndex + 1;
      if (nextIdx < signItems.length && signItems[nextIdx].type !== 'space') {
        const nextVideo = new Image();
        nextVideo.src = `/signs/${signItems[nextIdx].value}.webm`;
      }
      
      videoRef.current.src = videoPathWebm;
      videoRef.current.load();
      
      videoRef.current.onerror = () => {
        // If webm fails, try mp4
        if (videoRef.current) {
          videoRef.current.src = videoPathMp4;
          videoRef.current.load();
        }
      };
      
      videoRef.current.onloadeddata = () => {
        if (videoRef.current) {
          videoRef.current.playbackRate = playbackSpeed;
          videoRef.current.play().catch(err => console.error('Video play error:', err));
        }
      };
      
      // Move to next item when video ends (no pause)
      videoRef.current.onended = () => {
        setCurrentItemIndex(prev => prev + 1);
      };
    }
  }, [currentItemIndex, signItems, playbackSpeed]);

  useEffect(() => {
    if (isVisible && isPlaying && signItems.length > 0) {
      playNextItem();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, currentItemIndex, isVisible, signItems, playNextItem]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    } else {
      if (currentItemIndex >= signItems.length) {
        setCurrentItemIndex(0);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentItemIndex(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
    
    // Update current video speed if playing
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.playbackRate = speeds[nextIndex];
    }
  };

  const handleWordClick = (index: number) => {
    setCurrentItemIndex(index);
    setIsPlaying(true);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: modalSize.width,
      height: modalSize.height
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartRef.current) return;
      
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;
      
      // For top-left resize, we subtract delta instead of add
      const newWidth = Math.max(350, Math.min(800, resizeStartRef.current.width - deltaX));
      const newHeight = Math.max(500, Math.min(900, resizeStartRef.current.height - deltaY));
      
      setModalSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isVisible || signItems.length === 0) return null;

  const currentItem = signItems[currentItemIndex];
  const isSpace = currentItem?.type === 'space';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div 
        ref={modalRef}
        className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative"
        style={{ width: `${modalSize.width}px`, height: `${modalSize.height}px` }}
      >
        {/* Header */}
        <div className="bg-[var(--neo-primary)] border-b-4 border-black p-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Hand className="text-white" size={20} />
            <h3 className="text-white font-black uppercase text-sm">Sign Language</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:text-black border-2 border-white p-1 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Display */}
        <div className="p-4 flex-1 flex flex-col overflow-hidden">
          <div 
            className="bg-gray-100 border-2 border-black flex items-center justify-center mb-3 relative overflow-hidden flex-shrink-0"
            style={{ height: `${modalSize.height * 0.5}px` }}
          >
            {isSpace ? (
              <div className="text-center">
                <div className="text-6xl font-black mb-2">_</div>
                <p className="text-sm font-bold text-gray-600">SPACE</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  muted
                  playsInline
                />
                <div className="absolute top-2 right-2 bg-black text-white px-3 py-1 font-black text-lg border-2 border-white">
                  {currentItem?.type === 'word' 
                    ? currentItem.value.toUpperCase().replace(/-/g, ' ')
                    : currentItem?.value.toUpperCase()}
                </div>
              </>
            )}
          </div>

          {/* Progress */}
          <div className="mb-3 flex-shrink-0">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-gray-600">
                Item {currentItemIndex + 1} / {signItems.length}
              </span>
              <span className="text-xs font-bold text-gray-600">
                {Math.round(((currentItemIndex + 1) / signItems.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 h-2 border-2 border-black">
              <div
                className="bg-[var(--neo-primary)] h-full transition-all duration-300"
                style={{ width: `${((currentItemIndex + 1) / signItems.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Text Display */}
          <div className="bg-yellow-50 border-2 border-black p-3 mb-3 overflow-y-auto flex-shrink-0" style={{ maxHeight: '80px' }}>
            <p className="text-sm font-bold leading-relaxed">
              {signItems.map((item, idx) => {
                if (item.type === 'space') {
                  return <span key={idx} className={idx === currentItemIndex ? 'bg-yellow-300' : ''}> </span>;
                }
                return (
                  <span
                    key={idx}
                    onClick={() => handleWordClick(idx)}
                    className={`cursor-pointer hover:bg-blue-100 transition-colors ${
                      idx === currentItemIndex
                        ? 'bg-[var(--neo-secondary)] px-1 border-2 border-black'
                        : idx < currentItemIndex
                        ? 'text-gray-400'
                        : ''
                    }`}
                  >
                    {item.type === 'word' ? item.value.replace(/-/g, ' ') : item.value}
                  </span>
                );
              })}
            </p>
          </div>

          {/* Controls */}
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handlePlayPause}
              className={`flex-1 ${
                isPlaying ? 'bg-yellow-300' : 'bg-green-300'
              } border-3 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2`}
            >
              {isPlaying ? (
                <>
                  <Pause size={16} /> Pause
                </>
              ) : (
                <>
                  <Play size={16} /> {currentItemIndex >= signItems.length ? 'Replay' : 'Play'}
                </>
              )}
            </button>
            <button
              onClick={handleSpeedChange}
              className="bg-blue-300 border-3 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all min-w-[60px]"
            >
              {playbackSpeed}x
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-200 border-3 border-black px-4 py-2 font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize bg-[var(--neo-primary)] border-r-4 border-b-4 border-black hover:bg-[var(--neo-secondary)] transition-colors"
          style={{ 
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          }}
        />
      </div>
    </div>
  );
}
