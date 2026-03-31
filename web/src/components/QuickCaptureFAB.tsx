import { create } from "@bufbuild/protobuf";
import { PenLineIcon, SendIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { memoServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { type Memo, MemoSchema, Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

const QuickCaptureFAB = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Global keyboard shortcut: Ctrl+Shift+N
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "N") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Auto-focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isOpen]);

  // Auto-resize textarea
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, []);

  const handleSave = useCallback(async () => {
    if (!content.trim() || !currentUser?.name) return;

    setIsSaving(true);
    try {
      const memoCreate = create(MemoSchema, {
        content: content.trim(),
        visibility: Visibility.PRIVATE,
      } as Partial<Memo> as Record<string, unknown>);

      await memoServiceClient.createMemo({ memo: memoCreate });

      toast.success("Memo saved ✨");
      setContent("");
      setIsOpen(false);

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to save quick memo:", error);
      toast.error("Failed to save memo");
    } finally {
      setIsSaving(false);
    }
  }, [content, currentUser?.name]);

  // Ctrl+Enter to save
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  if (!currentUser) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsOpen(false)} />}

      {/* Quick Capture Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out",
          // Mobile: bottom sheet style
          "bottom-0 left-0 right-0 md:bottom-24 md:right-6 md:left-auto",
          // Desktop: floating card
          "md:w-[420px]",
          isOpen ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-full opacity-0 pointer-events-none md:translate-y-8",
        )}
      >
        <div
          className={cn(
            "bg-card border border-border shadow-2xl",
            // Mobile: full-width bottom sheet
            "rounded-t-2xl md:rounded-2xl",
            "p-4",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PenLineIcon className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{t("daily-review.quick-capture")}</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-muted transition-colors"
              aria-label={t("common.close")}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind? Use #tags to organize..."
            className={cn(
              "w-full min-h-[100px] max-h-[300px] resize-none bg-transparent",
              "text-sm text-foreground placeholder:text-muted-foreground/60",
              "border-0 outline-none focus:ring-0",
              "leading-relaxed",
            )}
          />

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Ctrl</kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Enter</kbd>
              {" to save"}
            </span>

            <button
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                content.trim()
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              <SendIcon className="w-3.5 h-3.5" />
              {isSaving ? "..." : t("editor.save")}
            </button>
          </div>
        </div>
      </div>

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${t("daily-review.quick-capture")} (Ctrl+Shift+N)`}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-2xl shadow-lg",
          "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
          "text-white flex items-center justify-center",
          "transition-all duration-300 hover:scale-105 hover:shadow-xl",
          "active:scale-95",
          isOpen && "rotate-45 scale-90",
        )}
      >
        {isOpen ? <XIcon className="w-6 h-6" /> : <PenLineIcon className="w-6 h-6" />}
      </button>
    </>
  );
};

export default QuickCaptureFAB;
