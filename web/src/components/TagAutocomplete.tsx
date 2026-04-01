import { HashIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TagSuggestion {
  tag: string;
  count: number;
}

interface Props {
  /** All available tags with counts */
  tags: Record<string, number>;
  /** Current textarea value */
  text: string;
  /** Cursor position in the textarea */
  cursorPos: number;
  /** Whether the autocomplete is active */
  isActive: boolean;
  /** Called when a tag is selected */
  onSelect: (tag: string, replaceFrom: number, replaceTo: number) => void;
  /** Called to dismiss the autocomplete */
  onDismiss: () => void;
  /** Anchor element for positioning */
  anchorRef: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * Extracts the tag query from text at the cursor position.
 * Returns the query string after `#` and the start index of `#`.
 */
export function extractTagQuery(text: string, cursorPos: number): { query: string; hashPos: number } | null {
  // Look backwards from cursor for a `#` character
  let hashPos = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    const ch = text[i];
    if (ch === "#") {
      // Check that `#` is either at start or preceded by whitespace
      if (i === 0 || /\s/.test(text[i - 1])) {
        hashPos = i;
        break;
      }
      return null;
    }
    // Stop if we hit a space (tag hasn't started)
    if (/\s/.test(ch)) return null;
  }

  if (hashPos === -1) return null;

  const query = text.slice(hashPos + 1, cursorPos);
  // Don't show autocomplete for empty queries (just typed `#`)
  // Actually, show it — Flomo shows all tags when you type `#`
  return { query, hashPos };
}

const TagAutocomplete = ({ tags, text, cursorPos, isActive, onSelect, onDismiss, anchorRef }: Props) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const tagQuery = useMemo(() => {
    if (!isActive) return null;
    return extractTagQuery(text, cursorPos);
  }, [isActive, text, cursorPos]);

  const suggestions = useMemo<TagSuggestion[]>(() => {
    if (!tagQuery) return [];

    const q = tagQuery.query.toLowerCase();
    return Object.entries(tags)
      .filter(([tag]) => tag.toLowerCase().includes(q))
      .sort((a, b) => {
        // Exact prefix match first, then by count
        const aStartsWith = a[0].toLowerCase().startsWith(q) ? 0 : 1;
        const bStartsWith = b[0].toLowerCase().startsWith(q) ? 0 : 1;
        if (aStartsWith !== bStartsWith) return aStartsWith - bStartsWith;
        return b[1] - a[1]; // Higher count first
      })
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));
  }, [tags, tagQuery]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[selectedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (suggestion: TagSuggestion) => {
      if (!tagQuery) return;
      // Replace from `#` to cursor with the selected tag
      onSelect(suggestion.tag, tagQuery.hashPos, cursorPos);
    },
    [tagQuery, cursorPos, onSelect],
  );

  // Keyboard handler — must be called from parent's onKeyDown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!tagQuery || suggestions.length === 0) return false;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => (i + 1) % suggestions.length);
          return true;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          return true;
        case "Enter":
        case "Tab":
          e.preventDefault();
          handleSelect(suggestions[selectedIndex]);
          return true;
        case "Escape":
          e.preventDefault();
          onDismiss();
          return true;
        default:
          return false;
      }
    },
    [tagQuery, suggestions, selectedIndex, handleSelect, onDismiss],
  );

  // Expose handleKeyDown via a stable ref pattern
  // Parent should call tagAutocompleteRef.current?.handleKeyDown(e)
  useEffect(() => {
    if (anchorRef.current) {
      (anchorRef.current as unknown as Record<string, unknown>).__tagAutocompleteKeyDown = handleKeyDown;
    }
  }, [handleKeyDown, anchorRef]);

  if (!isActive || !tagQuery || suggestions.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute z-50 w-64 max-h-48 overflow-auto",
        "bg-popover border border-border rounded-xl shadow-xl",
        "py-1 animate-in fade-in-0 zoom-in-95 duration-150",
        // Position above the textarea
        "bottom-full mb-2 left-0",
      )}
      ref={listRef}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.tag}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors",
            i === selectedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
          )}
          onMouseDown={(e) => {
            e.preventDefault(); // Don't blur the textarea
            handleSelect(s);
          }}
          onMouseEnter={() => setSelectedIndex(i)}
        >
          <HashIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="truncate flex-1">{s.tag}</span>
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">{s.count}</span>
        </button>
      ))}
    </div>
  );
};

export default TagAutocomplete;
