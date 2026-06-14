import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("kk-KZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(time: string) {
  return time;
}
