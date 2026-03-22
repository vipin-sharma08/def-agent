import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts — required by shadcn/ui */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
