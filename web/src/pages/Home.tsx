import MemoEditor from "@/components/MemoEditor";
import MemoView from "@/components/MemoView";
import PagedMemoList from "@/components/PagedMemoList";
import WritingStreakBanner from "@/components/WritingStreakBanner";
import { useInstance } from "@/contexts/InstanceContext";
import { useMemoFilters, useMemoSorting } from "@/hooks";
import useCurrentUser from "@/hooks/useCurrentUser";
import { useFilteredMemoStats } from "@/hooks/useFilteredMemoStats";
import { State } from "@/types/proto/api/v1/common_pb";
import { Memo } from "@/types/proto/api/v1/memo_service_pb";

const Home = () => {
  const user = useCurrentUser();
  const { isInitialized } = useInstance();

  const { statistics } = useFilteredMemoStats({ userName: user?.name, context: "home" });

  const memoFilter = useMemoFilters({
    creatorName: user?.name,
    includeShortcuts: true,
    includePinned: true,
  });

  const { listSort, orderBy } = useMemoSorting({
    pinnedFirst: true,
    state: State.NORMAL,
  });

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      {/* Writing Streak Banner */}
      {user && <WritingStreakBanner activityStats={statistics.activityStats} />}

      {/* Inline Editor */}
      <div className="mt-4">
        <MemoEditor className="mb-4" cacheKey="home-editor" />
      </div>

      {/* Memo Feed */}
      <PagedMemoList
        renderer={(memo: Memo) => <MemoView key={`${memo.name}-${memo.displayTime}`} memo={memo} showVisibility showPinned compact />}
        listSort={listSort}
        orderBy={orderBy}
        filter={memoFilter}
        enabled={isInitialized}
      />
    </div>
  );
};

export default Home;
