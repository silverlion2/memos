import { EarthIcon, HomeIcon, PenLineIcon, SettingsIcon, SparklesIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import useCurrentUser from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { Routes } from "@/router";
import { useTranslate } from "@/utils/i18n";

interface BottomNavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  isCapture?: boolean;
}

interface Props {
  onCaptureClick: () => void;
}

const BottomNav = ({ onCaptureClick }: Props) => {
  const t = useTranslate();
  const currentUser = useCurrentUser();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollThreshold = 10;

  // Hide on scroll-down, show on scroll-up (iOS-like)
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      if (Math.abs(diff) < scrollThreshold) return;

      if (diff > 0 && currentY > 100) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Always show when route changes
  useEffect(() => {
    setIsVisible(true);
  }, [location.pathname]);

  const handleCaptureClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onCaptureClick();
    },
    [onCaptureClick],
  );

  if (!currentUser) return null;

  const navItems: BottomNavItem[] = [
    {
      id: "bottom-home",
      path: Routes.ROOT,
      label: t("common.home"),
      icon: <HomeIcon className="w-5 h-5" />,
    },
    {
      id: "bottom-explore",
      path: Routes.EXPLORE,
      label: t("common.explore"),
      icon: <EarthIcon className="w-5 h-5" />,
    },
    {
      id: "bottom-capture",
      path: "#capture",
      label: t("daily-review.quick-capture"),
      icon: <PenLineIcon className="w-5 h-5" />,
      isCapture: true,
    },
    {
      id: "bottom-review",
      path: Routes.DAILY_REVIEW,
      label: t("common.daily-review"),
      icon: <SparklesIcon className="w-5 h-5" />,
    },
    {
      id: "bottom-setting",
      path: Routes.SETTING,
      label: t("common.settings"),
      icon: <SettingsIcon className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "bg-background/80 backdrop-blur-2xl border-t border-border/40",
        "transition-transform duration-300 ease-out",
        "safe-area-bottom",
        isVisible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-around px-2 pt-1.5 pb-1.5">
        {navItems.map((item) => {
          if (item.isCapture) {
            // Center capture button — elevated & styled
            return (
              <button
                key={item.id}
                onClick={handleCaptureClick}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 -mt-4",
                  "w-14 h-14 rounded-2xl",
                  "bg-gradient-to-br from-amber-500 to-orange-500",
                  "text-white shadow-lg shadow-amber-500/30",
                  "active:scale-90 transition-all duration-200",
                )}
              >
                {item.icon}
              </button>
            );
          }

          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === Routes.ROOT}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-300",
                  "text-[10px] font-medium",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted/50",
                )
              }
            >
              <div className="relative">
                {item.icon}
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
