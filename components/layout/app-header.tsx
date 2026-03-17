"use client";

import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAdminSettingsProfile } from "@/lib/api";

interface AppHeaderProps {
  onMenuOpen: () => void;
}

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const { data: session } = useSession();
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["admin-settings-profile"],
    queryFn: getAdminSettingsProfile,
  });

  const profileImage = String(profileQuery.data?.profileImage || "");
  const userName = useMemo(() => {
    const firstName = String(profileQuery.data?.firstName || "").trim();
    const lastName = String(profileQuery.data?.lastName || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || session?.user?.name || "Disabilitymne";
  }, [profileQuery.data?.firstName, profileQuery.data?.lastName, session?.user?.name]);
  const userEmail = String(profileQuery.data?.email || session?.user?.email || "example@example.com");
  const shouldShowImage = Boolean(profileImage) && failedImageSrc !== profileImage;

  const avatarFallback = userName.trim().charAt(0).toUpperCase() || "A";

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#010408]/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        
        {/* Mobile Menu Trigger */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-slate-100 hover:bg-white/10 transition-colors xl:hidden"
          onClick={onMenuOpen}
          aria-label="Open menu"
        >
          <Menu className="size-6" />
        </button>

        {/* Right Section: User Profile */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden flex-col items-end leading-tight md:flex">
            <span className="text-sm font-medium text-white">
              {userName}
            </span>
            <span className="text-xs text-slate-400">
              {userEmail}
            </span>
          </div>
          
          <div className="relative size-10 overflow-hidden rounded-full border border-white/20 ring-2 ring-transparent hover:ring-white/10 transition-all">
            {shouldShowImage ? (
              <img
                src={profileImage}
                alt={`${userName}'s avatar`}
                className="size-full object-cover"
                onError={() => setFailedImageSrc(profileImage)}
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-white/10 text-sm font-semibold text-white">
                {avatarFallback}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
