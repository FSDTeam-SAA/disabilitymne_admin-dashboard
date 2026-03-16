"use client";

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  className?: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, className, children }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div
        className={cn(
          "w-full max-w-4xl rounded-2xl border border-[#7eb9e699] bg-[linear-gradient(115deg,#1c3258_0%,#223f6f_55%,#1a3155_100%)] p-6 shadow-[0_25px_70px_-45px_rgba(0,0,0,.95)]",
          className
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          {title ? <h3 className="text-3xl font-semibold text-slate-100">{title}</h3> : <span />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <X className="size-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
