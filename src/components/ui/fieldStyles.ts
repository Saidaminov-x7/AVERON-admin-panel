export const fieldContainerClass = "w-full space-y-1.5";
export const fieldLabelClass = "block text-xs font-semibold tracking-wide text-app select-none";
export const fieldControlClass = [
  "h-11 w-full px-3.5 text-sm rounded-theme transition-all duration-150 outline-none",
  "bg-surface border border-app text-app placeholder:text-muted",
  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20",
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-white/5",
].join(" ");
export const fieldErrorClass = "border-red-500 focus:border-red-500 focus:ring-red-500/20";
export const fieldMessageClass = "text-xs font-medium animate-fade-in";
