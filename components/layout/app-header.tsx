"use client";

import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface AppHeaderProps {
  onMenuOpen: () => void;
}

export function AppHeader({ onMenuOpen }: AppHeaderProps) {
  const { data: session } = useSession();

  // Fallback data
  const userName = session?.user?.name || "Disabilitymne";
  const userEmail = session?.user?.email || "example@example.com";
  const userImage = session?.user?.image || "/avatar.png";

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
            <Image
              src={userImage}
              alt={`${userName}'s avatar`}
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </header>
  );
}