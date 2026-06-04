"use client";
import { useLang } from "@/context/LangContext";

export default function StockBadge({ stock, stockMin }: { stock: number; stockMin: number }) {
  const { t } = useLang();
  let cls: string, label: string;
  if (stock <= 0) {
    cls = "bg-red-500/15 text-red-400 ring-red-500/30";
    label = t("outOfStock");
  } else if (stock <= stockMin) {
    cls = "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30";
    label = t("lowStock");
  } else {
    cls = "bg-green-500/15 text-green-400 ring-green-500/30";
    label = t("available");
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 whitespace-nowrap ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
