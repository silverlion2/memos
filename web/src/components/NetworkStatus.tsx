import { WifiOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Wait a moment then hide the banner to show recovery
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg transition-all duration-500",
        isOnline
          ? "bg-green-500/10 text-green-600 border-green-500/20 shadow-green-500/10"
          : "bg-destructive/10 text-destructive border-destructive/20 shadow-destructive/10 animate-in fade-in slide-in-from-top-4",
      )}
    >
      <WifiOffIcon className={cn("w-4 h-4", isOnline && "hidden")} />
      <span className="text-sm font-medium">
        {isOnline ? "Connection restored" : "You are currently offline"}
      </span>
    </div>
  );
};

export default NetworkStatus;
