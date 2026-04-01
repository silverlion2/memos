import dayjs from "dayjs";
import { ChevronDownIcon, ChevronUpIcon, FlameIcon, PenLineIcon, TrophyIcon } from "lucide-react";
import { useMemo, useState } from "react";
import useLocalStorage from "react-use/lib/useLocalStorage";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  activityStats: Record<string, number>;
}

const HEATMAP_DAYS = 91; // ~13 weeks

/** Compute current & longest writing streaks from activity data. */
function computeStreaks(stats: Record<string, number>) {
  const today = dayjs();
  let current = 0;
  let longest = 0;
  let streak = 0;
  let totalMemos = 0;
  let todayCount = 0;

  const todayStr = today.format("YYYY-MM-DD");
  todayCount = stats[todayStr] ?? 0;

  for (const count of Object.values(stats)) {
    totalMemos += count;
  }

  // Walk backwards from today to calculate current streak
  for (let i = 0; i < 365; i++) {
    const dateStr = today.subtract(i, "day").format("YYYY-MM-DD");
    const count = stats[dateStr] ?? 0;
    if (count > 0) {
      streak++;
    } else if (i === 0) {
      // Today has no memos yet — don't break streak, just skip
      continue;
    } else {
      break;
    }
  }
  current = streak;

  // Calculate longest streak across all data
  const allDates = Object.keys(stats)
    .filter((d) => (stats[d] ?? 0) > 0)
    .sort();
  if (allDates.length > 0) {
    streak = 1;
    longest = 1;
    for (let i = 1; i < allDates.length; i++) {
      const prev = dayjs(allDates[i - 1]);
      const curr = dayjs(allDates[i]);
      if (curr.diff(prev, "day") === 1) {
        streak++;
        longest = Math.max(longest, streak);
      } else {
        streak = 1;
      }
    }
  }

  return { current, longest, totalMemos, todayCount };
}

/** Generate last N days of heatmap data. */
function generateHeatmapDays(stats: Record<string, number>, days: number) {
  const today = dayjs();
  const result: { date: string; count: number; label: string }[] = [];
  let maxCount = 1;

  for (let i = days - 1; i >= 0; i--) {
    const d = today.subtract(i, "day");
    const dateStr = d.format("YYYY-MM-DD");
    const count = stats[dateStr] ?? 0;
    maxCount = Math.max(maxCount, count);
    result.push({
      date: dateStr,
      count,
      label: d.format("MMM D"),
    });
  }

  return { cells: result, maxCount };
}

function getIntensityClass(count: number, maxCount: number): string {
  if (count === 0) return "bg-muted/30";
  const ratio = count / maxCount;
  if (ratio > 0.75) return "bg-amber-500 shadow-sm shadow-amber-500/30";
  if (ratio > 0.5) return "bg-amber-500/80";
  if (ratio > 0.25) return "bg-amber-500/55";
  return "bg-amber-500/30";
}

const WritingStreakBanner = ({ activityStats }: Props) => {
  const [collapsed, setCollapsed] = useLocalStorage("streak-banner-collapsed", false);
  const [isHovered, setIsHovered] = useState(false);

  const { current, longest, totalMemos, todayCount } = useMemo(() => computeStreaks(activityStats), [activityStats]);
  const { cells, maxCount } = useMemo(() => generateHeatmapDays(activityStats, HEATMAP_DAYS), [activityStats]);

  const streakEmoji = current >= 7 ? "🔥" : current >= 3 ? "✨" : "📝";
  const motivationText =
    todayCount > 0
      ? `${todayCount} memo${todayCount > 1 ? "s" : ""} today — keep going!`
      : current > 0
        ? "Write today to keep your streak alive!"
        : "Start your writing streak today!";

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-amber-500/[0.03] overflow-hidden transition-all duration-500",
        isHovered && "border-amber-500/30 shadow-sm",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left group"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-1.5 rounded-xl transition-all duration-300",
              current > 0
                ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30"
                : "bg-muted/50 border border-border/50",
            )}
          >
            <FlameIcon className={cn("w-5 h-5 transition-colors", current > 0 ? "text-amber-500" : "text-muted-foreground")} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">{current}</span>
            <span className="text-sm text-muted-foreground">day streak {streakEmoji}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Quick stats — hidden on mobile when collapsed */}
          <div className={cn("items-center gap-4 text-xs text-muted-foreground", collapsed ? "hidden md:flex" : "hidden sm:flex")}>
            <span className="flex items-center gap-1">
              <TrophyIcon className="w-3.5 h-3.5 text-amber-500/70" />
              Best: {longest}d
            </span>
            <span className="flex items-center gap-1">
              <PenLineIcon className="w-3.5 h-3.5 text-muted-foreground/70" />
              {totalMemos} total
            </span>
          </div>
          {collapsed ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          ) : (
            <ChevronUpIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <div
        className={cn(
          "grid transition-all duration-500 ease-out",
          collapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 space-y-3">
            {/* Motivation text */}
            <p className="text-xs text-muted-foreground/80 italic">{motivationText}</p>

            {/* Heatmap strip */}
            <TooltipProvider delayDuration={100}>
              <div className="flex gap-[3px] flex-wrap">
                {cells.map((cell) => (
                  <Tooltip key={cell.date}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-[11px] h-[11px] rounded-[3px] transition-all duration-200 hover:scale-150 hover:z-10 cursor-default",
                          getIntensityClass(cell.count, maxCount),
                          cell.date === dayjs().format("YYYY-MM-DD") && "ring-1 ring-primary/40 ring-offset-1 ring-offset-card",
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p>
                        {cell.label}: {cell.count} memo{cell.count !== 1 ? "s" : ""}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>

            {/* Legend */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <div className="w-[9px] h-[9px] rounded-[2px] bg-muted/30" />
                <div className="w-[9px] h-[9px] rounded-[2px] bg-amber-500/30" />
                <div className="w-[9px] h-[9px] rounded-[2px] bg-amber-500/55" />
                <div className="w-[9px] h-[9px] rounded-[2px] bg-amber-500/80" />
                <div className="w-[9px] h-[9px] rounded-[2px] bg-amber-500 shadow-sm shadow-amber-500/30" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingStreakBanner;
