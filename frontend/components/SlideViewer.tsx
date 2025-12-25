"use client";
import { ChevronLeft, ChevronRight, Edit2, Check, X } from "lucide-react";
import { useState, useEffect } from "react";

interface SlideViewerProps {
  slides: any[];
  theme: string;
  currentSlide: number;
  onSlideChange: (index: number) => void;
  onSlideUpdate?: (slideIndex: number, updatedSlide: any) => void;
  isEditing?: boolean;
  onEditToggle?: (editing: boolean) => void;
  userName?: string;
  font?: string;
}

export default function SlideViewer({ 
  slides, 
  theme, 
  currentSlide, 
  onSlideChange,
  onSlideUpdate,
  isEditing = false,
  onEditToggle,
  userName = "User",
  font = "Inter"
}: SlideViewerProps) {
  const slide = slides[currentSlide];
  const [editedHeading, setEditedHeading] = useState("");
  const [editedItems, setEditedItems] = useState<any[]>([]);
  
  // Update edited states when slide changes and exit edit mode
  useEffect(() => {
    if (slide) {
      setEditedHeading(slide.content.heading || "");
      setEditedItems(slide.content.items || []);
      // Exit edit mode when slide changes
      if (isEditing) {
        onEditToggle?.(false);
      }
    }
  }, [currentSlide]);
  
  if (!slide) return null;

  const startEditing = () => {
    setEditedHeading(slide.content.heading || "");
    setEditedItems(slide.content.items || []);
    onEditToggle?.(true);
  };

  const saveEdits = () => {
    if (onSlideUpdate) {
      const updatedSlide = {
        ...slide,
        content: {
          ...slide.content,
          heading: editedHeading,
          items: editedItems,
        },
      };
      onSlideUpdate(currentSlide, updatedSlide);
    }
    onEditToggle?.(false);
  };

  const cancelEdits = () => {
    onEditToggle?.(false);
  };

  // Helper function to determine text color based on background
  const getTextColorForBg = (bgColor: string) => {
    // For light backgrounds (white, light gray, light colors), use black text
    if (bgColor === "#E5E5E5" || bgColor === "#FFFFFF" || bgColor === "#F9FAFB" ||
        bgColor.includes("gray") || bgColor.includes("white") ||
        bgColor.startsWith("#F") || bgColor.startsWith("#E") || bgColor.startsWith("#D")) {
      return "#000000";
    }
    return "#FFFFFF";
  };

  const themeStyles = {
    default: {
      bg: "bg-white",
      primary: "#FF6B6B",
      secondary: "#4ECDC4",
      accent: "#FFE66D",
      text: "#1A1A1A",
    },
    modern: {
      bg: "bg-gradient-to-br from-blue-50 to-indigo-100",
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#EC4899",
      text: "#1E293B",
    },
    minimal: {
      bg: "bg-gray-50",
      primary: "#000000",
      secondary: "#404040",
      accent: "#737373",
      text: "#000000",
    },
    vibrant: {
      bg: "bg-gradient-to-br from-purple-400 via-pink-400 to-red-400",
      primary: "#FFFFFF",
      secondary: "#FDE047",
      accent: "#34D399",
      text: "#FFFFFF",
    },
    dark: {
      bg: "bg-gradient-to-br from-gray-900 to-black",
      primary: "#FFFFFF",
      secondary: "#E5E5E5",
      accent: "#A3A3A3",
      text: "#FFFFFF",
    },
  };

  const currentTheme = themeStyles[theme as keyof typeof themeStyles] || themeStyles.default;

  const renderLayout = () => {
    const { layout, content, section_layout } = slide;

    switch (layout) {
      case "bullets":
        return (
          <div className="relative flex flex-col justify-center h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-8 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-8" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <ul className="space-y-4">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => (
                <li key={idx} className="flex items-start gap-4">
                  <span
                    className="text-3xl mt-1"
                    style={{ color: currentTheme.secondary, fontFamily: font }}
                  >
                    •
                  </span>
                  <div className="flex-1">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-bold border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-lg mt-1 opacity-75 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                            style={{ color: currentTheme.text, fontFamily: font }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold" style={{ color: currentTheme.text, fontFamily: font }}>
                          {item.text}
                        </p>
                        {item.subtext && (
                          <p className="text-lg mt-1 opacity-75" style={{ color: currentTheme.text, fontFamily: font }}>
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {currentSlide === 0 && (
              <div className="absolute bottom-8 right-12 text-xl font-bold opacity-70" style={{ color: currentTheme.text, fontFamily: font }}>
                By {userName}
              </div>
            )}
          </div>
        );

      case "columns":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-8 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-8" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-8 flex-1">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                // In dark theme, boxes should be dark gray; otherwise use primary color with transparency
                const isDark = theme === 'dark';
                const bgColor = isDark ? '#404040' : '#FFFFFF';
                const textColor = '#000000';
                const headingColor = isDark ? '#FFFFFF' : currentTheme.primary;
                return (
                  <div
                    key={idx}
                    className="p-6 rounded-lg"
                    style={{
                      backgroundColor: bgColor,
                      border: `3px solid ${currentTheme.primary}`,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-bold mb-3 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          style={{ color: headingColor, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <textarea
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-lg border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700 resize-none"
                            style={{ color: isDark ? '#FFFFFF' : textColor, fontFamily: font }}
                            rows={3}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold mb-3" style={{ color: headingColor, fontFamily: font }}>
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-lg" style={{ color: isDark ? '#FFFFFF' : textColor, fontFamily: font }}>
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "timeline":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-12 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-12" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="relative flex items-center justify-between flex-1">
              <div
                className="absolute top-1/2 left-0 right-0 h-2 -translate-y-1/2"
                style={{ backgroundColor: currentTheme.secondary, fontFamily: font }}
              />
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => (
                <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black mb-4"
                    style={{ backgroundColor: currentTheme.primary,
                      color: "#FFFFFF", fontFamily: font }}
                  >
                    {idx + 1}
                  </div>
                  <div className="text-center">
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="text-xl font-bold mb-1 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="text-sm opacity-75 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                            style={{ color: currentTheme.text, fontFamily: font }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-bold mb-1" style={{ color: currentTheme.text, fontFamily: font }}>
                          {item.text}
                        </p>
                        {item.subtext && (
                          <p className="text-sm opacity-75" style={{ color: currentTheme.text, fontFamily: font }}>
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "boxes":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-12 text-center border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-12 text-center" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-3 gap-6 flex-1">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                const isDark = theme === 'dark';
                const bgColor = isDark ? '#404040' : '#FFFFFF';
                const textColor = isDark ? '#FFFFFF' : '#000000';
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center p-6 rounded-xl"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      border: `3px solid ${currentTheme.primary}`,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="text-3xl font-black mb-3 text-center border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="text-center text-lg border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-3xl font-black mb-3">{item.text}</h3>
                        {item.subtext && <p className="text-center text-lg">{item.subtext}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "arrows":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-12 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-12" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="flex items-center justify-between flex-1 gap-4">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center flex-1">
                  <div
                    className="flex-1 p-6 rounded-lg"
                    style={{ backgroundColor: currentTheme.secondary,
                      color: getTextColorForBg(currentTheme.secondary), fontFamily: font }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-bold mb-2 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-lg border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold mb-2">{item.text}</h3>
                        {item.subtext && <p className="text-lg">{item.subtext}</p>}
                      </>
                    )}
                  </div>
                  {idx < content.items.length - 1 && (
                    <div className="text-5xl mx-2" style={{ color: currentTheme.primary, fontFamily: font }}>
                      →
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "compare":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-12 text-center border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-12 text-center" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-2 gap-12 flex-1">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                const bgColor = theme === 'dark' 
                  ? (idx === 0 ? '#404040' : '#525252') 
                  : (idx === 0 ? `${currentTheme.primary}30` : `${currentTheme.secondary}30`);
                const headingColor = theme === 'dark'
                  ? '#FFFFFF'
                  : (idx === 0 ? currentTheme.primary : currentTheme.secondary);
                const textColor = theme === 'dark' ? '#FFFFFF' : currentTheme.text;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-xl"
                    style={{
                      backgroundColor: bgColor,
                      border: `4px solid ${idx === 0 ? currentTheme.primary : currentTheme.secondary}`,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-3xl font-black mb-6 border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          style={{ color: headingColor, fontFamily: font }}
                        />
                        {item.subtext !== undefined && (
                          <textarea
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-xl border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700 resize-none"
                            style={{ color: textColor, fontFamily: font }}
                            rows={3}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3
                          className="text-3xl font-black mb-6"
                          style={{ color: headingColor, fontFamily: font }}
                        >
                          {item.text}
                        </h3>
                        {item.subtext && (
                          <p className="text-xl" style={{ color: textColor, fontFamily: font }}>
                            {item.subtext}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "pyramid":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-8 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-8" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                const width = 100 - idx * 25;
                return (
                  <div
                    key={idx}
                    className="py-6 px-8 text-center rounded-lg"
                    style={{
                      width: `${width}%`,
                      backgroundColor: currentTheme.primary,
                      color: "#FFFFFF",
                      opacity: 1 - idx * 0.15,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-2xl font-bold mb-1 text-center border-2 border-dashed border-blue-300 px-2 py-1 rounded bg-white/20 focus:outline-none focus:border-blue-400"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="w-full text-lg text-center border-2 border-dashed border-blue-300 px-2 py-1 rounded bg-white/20 focus:outline-none focus:border-blue-400"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-2xl font-bold mb-1">{item.text}</h3>
                        {item.subtext && <p className="text-lg">{item.subtext}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "icons":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-12 text-center border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-12 text-center" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="grid grid-cols-3 gap-8 flex-1">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center text-center">
  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4"
                    style={{ backgroundColor: currentTheme.secondary,
                      color: getTextColorForBg(currentTheme.secondary), fontFamily: font }}
                  >
                    {idx + 1}
                  </div>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => {
                          const newItems = [...editedItems];
                          newItems[idx] = { ...newItems[idx], text: e.target.value };
                          setEditedItems(newItems);
                        }}
                        className="text-2xl font-bold mb-2 text-center border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                        style={{ color: currentTheme.primary, fontFamily: font }}
                      />
                      {item.subtext !== undefined && (
                        <input
                          type="text"
                          value={item.subtext || ""}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="w-full text-lg text-center border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                          style={{ color: currentTheme.text, fontFamily: font }}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="text-2xl font-bold mb-2" style={{ color: currentTheme.primary, fontFamily: font }}>
                        {item.text}
                      </h3>
                      {item.subtext && (
                        <p className="text-lg" style={{ color: currentTheme.text, fontFamily: font }}>
                          {item.subtext}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case "cycle":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-8 text-center border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-8 text-center" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="flex items-center justify-center flex-1 gap-6">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                const textColor = getTextColorForBg(currentTheme.secondary);
                return (
                  <div key={idx} className="flex-1 max-w-sm">
                    <div
                      className="p-6 rounded-xl text-center h-full flex flex-col justify-center"
                      style={{
                        backgroundColor: currentTheme.secondary,
                        color: textColor,
                        border: `3px solid ${currentTheme.primary}`,
                      }}
                    >
                      <div
                        className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-black"
                        style={{ backgroundColor: currentTheme.primary,
                          color: getTextColorForBg(currentTheme.primary), fontFamily: font }}
                      >
                        {idx + 1}
                      </div>
                      {isEditing ? (
                        <>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], text: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="text-xl font-bold mb-2 text-center border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700"
                            style={{ color: textColor, fontFamily: font }}
                          />
                          {item.subtext !== undefined && (
                            <textarea
                              value={item.subtext || ""}
                              onChange={(e) => {
                                const newItems = [...editedItems];
                                newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                                setEditedItems(newItems);
                              }}
                              className="text-sm leading-relaxed text-center border-2 border-dashed border-blue-500 px-2 py-1 rounded bg-transparent focus:outline-none focus:border-blue-700 resize-none"
                              style={{ color: textColor, fontFamily: font }}
                              rows={2}
                            />
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="text-xl font-bold mb-2" style={{ color: textColor, fontFamily: font }}>{item.text}</h3>
                          {item.subtext && <p className="text-sm leading-relaxed" style={{ color: textColor, fontFamily: font }}>{item.subtext}</p>}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "staircase":
        return (
          <div className="flex flex-col h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-5xl font-black mb-8 border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-5xl font-black mb-8" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            <div className="flex items-end justify-between flex-1 gap-4">
              {(isEditing ? editedItems : content.items)?.map((item: any, idx: number) => {
                const height = ((idx + 1) / content.items.length) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 p-4 rounded-t-lg flex flex-col justify-end"
                    style={{
                      height: `${height}%`,
                      backgroundColor: currentTheme.primary,
                      color: "#FFFFFF",
                      opacity: 0.7 + (idx * 0.3) / content.items.length,
                    }}
                  >
                    {isEditing ? (
                      <>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) => {
                            const newItems = [...editedItems];
                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                            setEditedItems(newItems);
                          }}
                          className="text-xl font-bold mb-2 border-2 border-dashed border-blue-300 px-2 py-1 rounded bg-white/20 focus:outline-none focus:border-blue-400"
                        />
                        {item.subtext !== undefined && (
                          <input
                            type="text"
                            value={item.subtext || ""}
                            onChange={(e) => {
                              const newItems = [...editedItems];
                              newItems[idx] = { ...newItems[idx], subtext: e.target.value };
                              setEditedItems(newItems);
                            }}
                            className="text-sm border-2 border-dashed border-blue-300 px-2 py-1 rounded bg-white/20 focus:outline-none focus:border-blue-400"
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold mb-2">{item.text}</h3>
                        {item.subtext && <p className="text-sm">{item.subtext}</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );

      default:
        return (
          <div className="relative flex flex-col justify-center items-center h-full px-16 py-12">
            {isEditing ? (
              <input
                type="text"
                value={editedHeading}
                onChange={(e) => setEditedHeading(e.target.value)}
                className="text-6xl font-black text-center border-2 border-dashed border-blue-500 px-4 py-2 rounded bg-transparent focus:outline-none focus:border-blue-700"
                style={{ color: currentTheme.primary, fontFamily: font }}
              />
            ) : (
              <h2 className="text-6xl font-black text-center" style={{ color: currentTheme.primary, fontFamily: font }}>
                {content.heading}
              </h2>
            )}
            {currentSlide === 0 && (
              <div className="absolute bottom-8 right-12 text-xl font-bold opacity-70" style={{ color: currentTheme.text, fontFamily: font }}>
                By {userName}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Slide Container */}
      <div
        className={`relative flex-1 ${currentTheme.bg} border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`}
        style={{ aspectRatio: "16/9", fontFamily: font }}
      >
        {renderLayout()}

        {/* Edit Controls */}
        {isEditing && (
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={saveEdits}
              className="p-3 bg-green-500 text-white rounded-lg border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-green-600 transition-all"
            >
              <Check size={24} />
            </button>
            <button
              onClick={cancelEdits}
              className="p-3 bg-red-500 text-white rounded-lg border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-600 transition-all"
            >
              <X size={24} />
            </button>
          </div>
        )}

        {/* Edit Button */}
        {!isEditing && onEditToggle && (
          <button
            onClick={startEditing}
            className="absolute top-4 right-4 p-3 bg-blue-500 text-white rounded-lg border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-600 transition-all"
          >
            <Edit2 size={20} />
          </button>
        )}

        {/* Slide Number */}
        <div
          className="absolute bottom-4 right-4 px-4 py-2 rounded-lg font-bold border-2 border-black"
          style={{ backgroundColor: theme === 'dark' ? '#FFFFFF' : '#000000',
            color: theme === 'dark' ? '#000000' : '#FFFFFF', fontFamily: font }}
        >
          {currentSlide + 1} / {slides.length}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-6 px-4">
        <button
          onClick={() => onSlideChange(Math.max(0, currentSlide - 1))}
          disabled={currentSlide === 0}
          className="flex items-center gap-2 px-6 py-3 bg-white border-3 border-black font-bold rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        {/* Slide Thumbnails */}
        <div className="flex gap-3 overflow-x-auto max-w-2xl py-2 px-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSlideChange(idx)}
              className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 border-black font-bold transition-all flex items-center justify-center ${
                idx === currentSlide
                  ? "bg-[var(--neo-primary)] text-white scale-110"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => onSlideChange(Math.min(slides.length - 1, currentSlide + 1))}
          disabled={currentSlide === slides.length - 1}
          className="flex items-center gap-2 px-6 py-3 bg-white border-3 border-black font-bold rounded-lg disabled:opacity-30 hover:bg-gray-100 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
