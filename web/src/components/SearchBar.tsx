import { ClockIcon, SearchIcon, SparklesIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { useMemoFilterContext } from "@/contexts/MemoFilterContext";
import { cn } from "@/lib/utils";
import { useTranslate } from "@/utils/i18n";
import MemoDisplaySettingMenu from "./MemoDisplaySettingMenu";

const MAX_HISTORY = 10;

const SearchBar = () => {
  const t = useTranslate();
  const { addFilter } = useMemoFilterContext();
  const [queryText, setQueryText] = useState("");
  const [isSmartMode, setIsSmartMode] = useLocalStorage("search-smart-mode", false);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>("search-history", []);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(-1);

  const history = searchHistory ?? [];

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addToHistory = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed) return;
      const updated = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
      setSearchHistory(updated);
    },
    [history, setSearchHistory],
  );

  const removeFromHistory = useCallback(
    (query: string) => {
      setSearchHistory(history.filter((h) => h !== query));
    },
    [history, setSearchHistory],
  );

  const executeSearch = useCallback(
    (text: string) => {
      const trimmedText = text.trim();
      if (trimmedText === "") return;

      addToHistory(trimmedText);

      if (isSmartMode) {
        // Smart mode: split into meaningful terms for broader matching
        // Also extract potential tag queries (#tag → tagSearch filter)
        const terms = trimmedText.split(/\s+/);
        for (const term of terms) {
          if (term.startsWith("#")) {
            const tagValue = term.slice(1);
            if (tagValue) {
              addFilter({ factor: "tagSearch", value: tagValue });
            }
          } else {
            addFilter({ factor: "contentSearch", value: term });
          }
        }
      } else {
        // Classic mode: add each word as a separate content filter
        const words = trimmedText.split(/\s+/);
        words.forEach((word) => {
          addFilter({ factor: "contentSearch", value: word });
        });
      }

      setQueryText("");
      setShowHistory(false);
    },
    [addFilter, addToHistory, isSmartMode],
  );

  const onTextChange = (event: React.FormEvent<HTMLInputElement>) => {
    setQueryText(event.currentTarget.value);
    setSelectedHistoryIndex(-1);
  };

  const onFocus = () => {
    if (history.length > 0) {
      setShowHistory(true);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showHistory && history.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedHistoryIndex((i) => Math.min(i + 1, history.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedHistoryIndex((i) => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter" && selectedHistoryIndex >= 0) {
        e.preventDefault();
        executeSearch(history[selectedHistoryIndex]);
        return;
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      executeSearch(queryText);
    }

    if (e.key === "Escape") {
      setShowHistory(false);
    }
  };

  return (
    <div className="relative w-full h-auto flex flex-col" ref={containerRef}>
      {/* Search input row */}
      <div className="relative w-full h-auto flex flex-row justify-start items-center">
        <SearchIcon className="absolute left-2 w-4 h-auto opacity-40 text-sidebar-foreground" />
        <input
          className={cn(
            "w-full text-sidebar-foreground leading-6 bg-sidebar border border-border text-sm rounded-lg p-1 pl-8 pr-16 outline-0",
            "transition-all duration-300 focus:border-primary/30 focus:ring-4 focus:ring-primary/10 focus:shadow-sm",
          )}
          placeholder={isSmartMode ? "Search naturally... (use #tags)" : t("memo.search-placeholder")}
          value={queryText}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          ref={inputRef}
        />

        {/* Smart mode toggle */}
        <button
          onClick={() => setIsSmartMode(!isSmartMode)}
          title={isSmartMode ? "Smart search (handles #tags)" : "Keyword search"}
          className={cn(
            "absolute right-8 p-0.5 rounded transition-all",
            isSmartMode
              ? "text-amber-500 hover:text-amber-600 bg-amber-500/10"
              : "text-muted-foreground/50 hover:text-muted-foreground",
          )}
        >
          <SparklesIcon className="w-3.5 h-3.5" />
        </button>

        <MemoDisplaySettingMenu className="absolute right-2 top-2 text-sidebar-foreground" />
      </div>

      {/* Search history dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover/90 backdrop-blur-xl border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="py-1">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">Recent searches</div>
            {history.map((query, i) => (
              <div
                key={query}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer transition-colors group",
                  i === selectedHistoryIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted/50",
                )}
                onClick={() => executeSearch(query)}
                onMouseEnter={() => setSelectedHistoryIndex(i)}
              >
                <ClockIcon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                <span className="truncate flex-1">{query}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(query);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted transition-all"
                >
                  <XIcon className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
