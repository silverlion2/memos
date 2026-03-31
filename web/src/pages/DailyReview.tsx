import { create } from "@bufbuild/protobuf";
import { RefreshCwIcon, SparklesIcon, CheckCircle2Icon, SkipForwardIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import MemoView from "@/components/MemoView";
import { Button } from "@/components/ui/button";
import { memoServiceClient } from "@/connect";
import useCurrentUser from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import type { Memo } from "@/types/proto/api/v1/memo_service_pb";
import { ListMemosRequestSchema } from "@/types/proto/api/v1/memo_service_pb";
import { useTranslate } from "@/utils/i18n";

const REVIEW_BATCH_SIZE = 5;
const MIN_AGE_DAYS = 3;

const DailyReview = () => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewedSet, setReviewedSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [minAgeDays, setMinAgeDays] = useState(MIN_AGE_DAYS);

  const fetchRandomMemos = useCallback(async () => {
    if (!currentUser?.name) return;

    setIsLoading(true);
    try {
      // Calculate the cutoff date
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - minAgeDays);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      // Fetch memos older than the cutoff
      const response = await memoServiceClient.listMemos(
        create(ListMemosRequestSchema, {
          filter: `creator == "${currentUser.name}" && display_time < "${cutoffStr}"`,
          pageSize: 50,
        }),
      );

      // Shuffle and take a batch
      const shuffled = [...response.memos].sort(() => Math.random() - 0.5);
      setMemos(shuffled.slice(0, REVIEW_BATCH_SIZE));
      setCurrentIndex(0);
      setReviewedSet(new Set());
    } catch (error) {
      console.error("Failed to fetch memos for review:", error);
      setMemos([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.name, minAgeDays]);

  useEffect(() => {
    fetchRandomMemos();
  }, [fetchRandomMemos]);

  const currentMemo = memos[currentIndex];
  const allReviewed = memos.length > 0 && reviewedSet.size >= memos.length;
  const reviewProgress = memos.length > 0 ? Math.round((reviewedSet.size / memos.length) * 100) : 0;

  const handleMarkReviewed = useCallback(() => {
    if (!currentMemo) return;
    setReviewedSet((prev) => new Set(prev).add(currentMemo.name));
    if (currentIndex < memos.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentMemo, currentIndex, memos.length]);

  const handleSkip = useCallback(() => {
    if (currentIndex < memos.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, memos.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const ageDaysOptions = useMemo(() => [3, 7, 14, 30, 90], []);

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
              <p className="text-sm text-muted-foreground">{t("daily-review.subtitle")}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          {/* Age filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">{t("daily-review.from-the-past")}:</span>
            {ageDaysOptions.map((days) => (
              <button
                key={days}
                onClick={() => setMinAgeDays(days)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all",
                  minAgeDays === days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Shuffle button */}
          <Button variant="outline" size="sm" onClick={fetchRandomMemos} disabled={isLoading} className="gap-2">
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
            <Button variant="outline" onClick={fetchRandomMemos} className="gap-2 mt-2">
              <RefreshCwIcon className="w-4 h-4" />
              {t("daily-review.shuffle")}
            </Button>
          </div>
        ) : memos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <SparklesIcon className="w-12 h-12 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground text-center">{t("daily-review.no-memos")}</p>
          </div>
        ) : (
          <>
            {/* Memo card with subtle highlight */}
            {currentMemo && (
              <div className="relative">
                {/* Date badge */}
                <div className="mb-2 text-xs text-muted-foreground flex items-center gap-2">
                  <span className="inline-block px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md font-medium">
                    {currentIndex + 1} / {memos.length}
                  </span>
                </div>

                {/* The memo */}
                <div
                  className={cn(
                    "transition-all duration-300",
                    reviewedSet.has(currentMemo.name) && "opacity-60 scale-[0.98]",
                  )}
                >
                  <MemoView memo={currentMemo} showVisibility compact />
                </div>
              </div>
            )}

            {/* Navigation controls */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="gap-2">
                <ChevronLeftIcon className="w-4 h-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={currentIndex >= memos.length - 1}
                className="gap-2"
              >
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

              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
                disabled={currentIndex >= memos.length - 1}
                className="gap-2"
              >
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
