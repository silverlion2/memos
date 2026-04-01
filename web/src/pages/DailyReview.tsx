import { create } from "@bufbuild/protobuf";
import {
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  FlameIcon,
  RefreshCwIcon,
  SkipForwardIcon,
  SparklesIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MemoView from "@/components/MemoView";
import { Button } from "@/components/ui/button";
import { memoServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { ListMemosRequestSchema } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

// ──────────────────────────────────────────────────────────────
// Spaced-repetition review state (Leitner-style, localStorage)
// ──────────────────────────────────────────────────────────────

interface ReviewRecord {
  /** Number of times this memo has been reviewed */
  count: number;
  /** ISO timestamp of last review */
  lastReviewed: string;
}

const REVIEW_STORAGE_KEY = "paperslip-review-state";
const REVIEW_BATCH_SIZE = 8;

/** Leitner intervals: review count → days until next review */
const LEITNER_INTERVALS: Record<number, number> = {
  0: 0, // never reviewed → show immediately
  1: 1, // reviewed once → next day
  2: 3, // reviewed twice → after 3 days
  3: 7, // reviewed 3x → after 7 days
  4: 14, // reviewed 4x → after 14 days
  5: 30, // reviewed 5+ → after 30 days
};

function getInterval(reviewCount: number): number {
  return LEITNER_INTERVALS[Math.min(reviewCount, 5)] ?? 30;
}

function loadReviewState(): Record<string, ReviewRecord> {
  try {
    const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReviewState(state: Record<string, ReviewRecord>) {
  localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state));
}

function isDueForReview(memoName: string, reviewState: Record<string, ReviewRecord>): boolean {
  const record = reviewState[memoName];
  if (!record) return true; // Never reviewed

  const interval = getInterval(record.count);
  const lastReviewed = new Date(record.lastReviewed);
  const now = new Date();
  const daysSince = (now.getTime() - lastReviewed.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= interval;
}

function getReviewBucket(memoName: string, reviewState: Record<string, ReviewRecord>): number {
  return reviewState[memoName]?.count ?? 0;
}

function daysSinceLastReview(memoName: string, reviewState: Record<string, ReviewRecord>): number | null {
  const record = reviewState[memoName];
  if (!record) return null;
  const last = new Date(record.lastReviewed);
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

const DailyReview = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedSet, setReviewedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [reviewState, setReviewState] = useState<Record<string, ReviewRecord>>(loadReviewState);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Fetch memos due for spaced-repetition review
  const fetchReviewMemos = useCallback(async () => {
    if (!currentUser?.name) return;

    setIsLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 1); // at least 1 day old
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const response = await memoServiceClient.listMemos(
        create(ListMemosRequestSchema, {
          filter: `creator == "${currentUser.name}" && display_time < "${cutoffStr}"`,
          pageSize: 200,
        }),
      );

      const currentReviewState = loadReviewState();

      // Filter to memos that are due + sort by priority (lower buckets first)
      const dueMemos = response.memos
        .filter((m) => isDueForReview(m.name, currentReviewState))
        .sort((a, b) => {
          const bucketA = getReviewBucket(a.name, currentReviewState);
          const bucketB = getReviewBucket(b.name, currentReviewState);
          if (bucketA !== bucketB) return bucketA - bucketB; // Lower bucket = higher priority
          return Math.random() - 0.5; // Randomize within same bucket
        })
        .slice(0, REVIEW_BATCH_SIZE);

      setMemos(dueMemos);
      setCurrentIndex(0);
      setReviewedSet(new Set());
      setReviewState(currentReviewState);
    } catch (error) {
      console.error("Failed to fetch memos for review:", error);
      setMemos([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    fetchReviewMemos();
  }, [fetchReviewMemos]);

  const currentMemo = memos[currentIndex];
  const allReviewed = memos.length > 0 && reviewedSet.size >= memos.length;
  const reviewProgress = memos.length > 0 ? Math.round((reviewedSet.size / memos.length) * 100) : 0;

  // Mark as reviewed — updates Leitner state
  const handleMarkReviewed = useCallback(() => {
    if (!currentMemo) return;

    // Update review state
    const newState = { ...reviewState };
    const existing = newState[currentMemo.name];
    newState[currentMemo.name] = {
      count: (existing?.count ?? 0) + 1,
      lastReviewed: new Date().toISOString(),
    };
    setReviewState(newState);
    saveReviewState(newState);

    // Mark in UI
    setReviewedSet((prev) => new Set(prev).add(currentMemo.name));

    // Auto-advance
    if (currentIndex < memos.length - 1) {
      setSlideDirection("left");
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setSlideDirection(null);
      }, 250);
    }
  }, [currentMemo, currentIndex, memos.length, reviewState]);

  const handleSkip = useCallback(() => {
    if (currentIndex < memos.length - 1) {
      setSlideDirection("left");
      setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setSlideDirection(null);
      }, 250);
    }
  }, [currentIndex, memos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setSlideDirection("right");
      setTimeout(() => {
        setCurrentIndex((i) => i - 1);
        setSlideDirection(null);
      }, 250);
    }
  }, [currentIndex]);

  // Touch / swipe handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 80;

      if (diff > threshold) {
        // Swipe right → previous
        handlePrev();
      } else if (diff < -threshold) {
        // Swipe left → mark reviewed & next
        handleMarkReviewed();
      }
      touchStartX.current = null;
    },
    [handlePrev, handleMarkReviewed],
  );

  const currentBucket = currentMemo ? getReviewBucket(currentMemo.name, reviewState) : 0;
  const lastReviewedDays = currentMemo ? daysSinceLastReview(currentMemo.name, reviewState) : null;

  const bucketLabels: Record<number, { label: string; color: string }> = useMemo(
    () => ({
      0: { label: "New", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
      1: { label: "Learning", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
      2: { label: "Reviewing", color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
      3: { label: "Familiar", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
      4: { label: "Known", color: "bg-teal-500/15 text-teal-600 dark:text-teal-400" },
      5: { label: "Mastered", color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
    }),
    [],
  );

  const bucketInfo = bucketLabels[Math.min(currentBucket, 5)] ?? bucketLabels[0];

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30">
              <SparklesIcon className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("daily-review.title")}</h1>
              <p className="text-sm text-muted-foreground">Spaced repetition — resurface ideas at the right time</p>
            </div>
          </div>
        </div>

        {/* Shuffle button */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FlameIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Prioritizing unreviewed & overdue memos</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReviewMemos} disabled={isLoading} className="gap-2">
            <RefreshCwIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
            {t("daily-review.shuffle")}
          </Button>
        </div>

        {/* Progress bar */}
        {memos.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                {reviewedSet.size} / {memos.length} {t("daily-review.reviewed").toLowerCase()}
              </span>
              <span>{reviewProgress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCwIcon className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : allReviewed ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30">
              <CheckCircle2Icon className="w-12 h-12 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-center">{t("daily-review.all-reviewed")}</p>
            <p className="text-sm text-muted-foreground text-center">Notes will resurface based on spaced-repetition intervals</p>
            <Button variant="outline" onClick={fetchReviewMemos} className="gap-2 mt-2">
              <RefreshCwIcon className="w-4 h-4" />
              {t("daily-review.shuffle")}
            </Button>
          </div>
        ) : memos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <SparklesIcon className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground text-center">{t("daily-review.no-memos")}</p>
            <p className="text-sm text-muted-foreground/70 text-center">All caught up! Your memos will be due for review on schedule.</p>
          </div>
        ) : (
          <>
            {/* Memo card with slide animation + touch support */}
            {currentMemo && (
              <div
                className="relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {/* Badges row */}
                <div className="mb-3 flex items-center gap-2 flex-wrap">
                  <span className="inline-block px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md text-xs font-medium">
                    {currentIndex + 1} / {memos.length}
                  </span>
                  <span className={cn("inline-block px-2.5 py-0.5 rounded-md text-xs font-medium", bucketInfo.color)}>
                    {bucketInfo.label}
                  </span>
                  {lastReviewedDays !== null && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs text-muted-foreground bg-muted/50">
                      <ClockIcon className="w-3 h-3" />
                      Last reviewed {lastReviewedDays}d ago
                    </span>
                  )}
                </div>

                {/* The memo — animated */}
                <div
                  className={cn(
                    "transition-all duration-300 ease-out",
                    slideDirection === "left" && "-translate-x-4 opacity-0",
                    slideDirection === "right" && "translate-x-4 opacity-0",
                    !slideDirection && "translate-x-0 opacity-100",
                    reviewedSet.has(currentMemo.name) && "opacity-60 scale-[0.98]",
                  )}
                >
                  <MemoView memo={currentMemo} showVisibility compact />
                </div>

                {/* Swipe hint on mobile */}
                <p className="text-center text-[11px] text-muted-foreground/50 mt-3 md:hidden">← swipe to navigate, swipe left to review →</p>
              </div>
            )}

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="gap-2">
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={handleSkip} disabled={currentIndex >= memos.length - 1} className="gap-2">
                <SkipForwardIcon className="w-4 h-4" />
                {t("daily-review.skip")}
              </Button>

              <Button
                size="sm"
                onClick={handleMarkReviewed}
                disabled={reviewedSet.has(currentMemo?.name ?? "")}
                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                <CheckCircle2Icon className="w-4 h-4" />
                {t("daily-review.reviewed")}
              </Button>

              <Button variant="outline" size="sm" onClick={handleSkip} disabled={currentIndex >= memos.length - 1} className="gap-2">
                <ChevronRightIcon className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyReview;
