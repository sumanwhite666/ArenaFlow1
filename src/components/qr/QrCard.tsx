"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QrCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  downloadName?: string;
  showDownload?: boolean;
  showPrint?: boolean;
};

export default function QrCard({
  title,
  value,
  subtitle,
  downloadName = "session-qr",
  showDownload = false,
  showPrint = false,
}: QrCardProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(value, {
      margin: 1,
      width: 220,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setDataUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div className="rounded-3xl border border-subtle bg-white p-6 text-center">
      <p className="font-display text-2xl">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      <div className="mt-6 flex justify-center">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="QR code"
            className="h-56 w-56 rounded-2xl border border-subtle bg-white p-2 shadow-soft"
          />
        ) : (
          <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-subtle bg-white text-xs text-muted shadow-soft">
            Generating QR...
          </div>
        )}
      </div>
      {showDownload || showPrint ? (
        <div className="mt-4 flex flex-wrap justify-center gap-3 text-xs">
          {showDownload ? (
            <a
              href={dataUrl}
              download={`${downloadName}.png`}
              className="rounded-full border border-subtle bg-white/80 px-4 py-2 font-semibold text-muted"
            >
              Download QR
            </a>
          ) : null}
          {showPrint ? (
            <button
              onClick={() => {
                if (!dataUrl) return;
                const printWindow = window.open("", "print");
                if (!printWindow) return;
                printWindow.document.write(
                  `<img src="${dataUrl}" style="width:240px;height:240px;" />`,
                );
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
              }}
              className="rounded-full border border-subtle bg-white/80 px-4 py-2 font-semibold text-muted"
            >
              Print QR
            </button>
          ) : null}
        </div>
      ) : null}
      <p className="mt-4 break-all text-xs text-muted">{value}</p>
    </div>
  );
}
