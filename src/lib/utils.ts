import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (number: number, precision?: number) => {
  let num = number,
    prec = precision || 2,
    suffix = "";
  const locale =
    typeof window !== "undefined" ? window.navigator.language : "en-US";

  if (Math.abs(number) > 1000000) {
    num = number / 1000000;
    prec = 2;
    suffix = "M";
  } else if (Math.abs(number) > 1000) {
    num = number / 1000;
    prec = 2;
    suffix = "K";
  }
  return (
    num.toLocaleString(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: prec,
    }) + suffix
  );
};

export const formatTimestamp = (ts: number) =>
  format(ts * 1000, "MMM d, yyyy 'at' HH:mm");
