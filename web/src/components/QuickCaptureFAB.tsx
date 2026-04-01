import { create } from "@bufbuild/protobuf";
import { PenLineIcon, SendIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import TagAutocomplete, { extractTagQuery, type TagAutocompleteRef } from "@/components/TagAutocomplete";
import { memoServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useFilteredMemoStats } from "@/hooks/useFilteredMemoStats";
import { cn } from "@/lib/utils";
import { type Memo, MemoSchema, Visibility } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

interface QuickCaptureFABProps {
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

const QuickCaptureFAB = ({ externalOpen, onExternalOpenChange }: QuickCaptureFABProps = {}) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const setIsOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const newVal = typeof v === "function" ? v(isOpen) : v;
    setInternalOpen(newVal);
    onExternalOpenChange?.(newVal);
  }, [isOpen, onExternalOpenChange]);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [tagAutocompleteActive, setTagAutocompleteActive] = useState(false);
  const tagAutocompleteRef = useRef<TagAutocompleteRef>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch tags for autocomplete
  const { tags } = useFilteredMemoStats({ userName: currentUser?.name, context: "home" });

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

  // Auto-resize textarea + check for tag autocomplete trigger
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart ?? 0;
    setContent(value);
    setCursorPos(pos);

    // Check if we should show tag autocomplete
    const tagQuery = extractTagQuery(value, pos);
    setTagAutocompleteActive(tagQuery !== null);

    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 300)}px`;
  }, []);

  const handleTextareaSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const pos = (e.target as HTMLTextAreaElement).selectionStart ?? 0;
    setCursorPos(pos);

    const value = (e.target as HTMLTextAreaElement).value;
    const tagQuery = extractTagQuery(value, pos);
    setTagAutocompleteActive(tagQuery !== null);
  }, []);

  const handleTagSelect = useCallback(
    (tag: string, replaceFrom: number, replaceTo: number) => {
      const before = content.slice(0, replaceFrom);
      const after = content.slice(replaceTo);
      const newContent = `${before}#${tag} ${after}`;
      setContent(newContent);
      setTagAutocompleteActive(false);

      // Set cursor position after the inserted tag
      const newPos = replaceFrom + tag.length + 2; // +2 for # and space
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.value = newContent;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.focus();
          setCursorPos(newPos);
        }
      });
    },
    [content],
  );

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

  // Ctrl+Enter to save, or delegate to tag autocomplete
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Let tag autocomplete handle keys first
      if (tagAutocompleteActive && tagAutocompleteRef.current) {
        if (tagAutocompleteRef.current.handleKeyDown(e)) {
          return;
        }
      }

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, tagAutocompleteActive],
  );

  if (!currentUser) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsOpen(false)} />}

      {/* Quick Capture Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
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

          {/* Textarea with tag autocomplete */}
          <div className="relative">
            <TagAutocomplete
              ref={tagAutocompleteRef}
              tags={tags}
              text={content}
              cursorPos={cursorPos}
              isActive={tagAutocompleteActive}
              onSelect={handleTagSelect}
              onDismiss={() => setTagAutocompleteActive(false)}
            />
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleTextareaChange}
              onSelect={handleTextareaSelect}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind? Type #tag to organize..."
              className={cn(
                "w-full min-h-[100px] max-h-[300px] resize-none bg-transparent",
                "text-sm text-foreground placeholder:text-muted-foreground/60",
                "border-0 outline-none focus:ring-0",
                "leading-relaxed",
              )}
            />
          </div>

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

      {/* FAB Button — hidden on mobile when BottomNav is present */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${t("daily-review.quick-capture")} (Ctrl+Shift+N)`}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-2xl shadow-lg",
          "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
          "text-white flex items-center justify-center",
          "transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/20",
          "active:scale-95 animate-in slide-in-from-bottom-5",
          // Hide on mobile — BottomNav takes over
          "hidden md:flex",
          isOpen && "rotate-45 scale-90",
        )}
      >
        {isOpen ? <XIcon className="w-6 h-6" /> : <PenLineIcon className="w-6 h-6" />}
      </button>
    </>
  );
};

export default QuickCaptureFAB;
