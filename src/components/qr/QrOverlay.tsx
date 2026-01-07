"use client";

import { useMemo } from "react";

import QrCard from "@/components/qr/QrCard";

type QrOverlayProps = {
  title: string;
  token: string;
  onClose: () => void;
};

export default function QrOverlay({ title, token, onClose }: QrOverlayProps) {
  const scanUrl = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (baseUrl) {
      return `${baseUrl}/scan?token=${token}`;
    }
    if (typeof window === "undefined") {
      return "";
    }
    return `${window.location.origin}/scan?token=${token}`;
  }, [token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 py-10">
      <div className="relative w-full max-w-lg">
        <button
          onClick={onClose}
          className="absolute right-0 top-[-44px] rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-[color:var(--ink)] shadow-soft"
        >
          Close
        </button>
        <QrCard
          title={title}
          value={scanUrl || token}
          subtitle="Students scan to log attendance"
          downloadName={title.toLowerCase().replace(/\s+/g, "-")}
          showDownload
          showPrint
        />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              if (!scanUrl) return;
              navigator.clipboard?.writeText(scanUrl);
            }}
            className="rounded-full border border-subtle bg-white/80 px-4 py-2 text-xs font-semibold text-muted"
          >
            Copy scan link
          </button>
        </div>
      </div>
    </div>
  );
}
