export function getVisiblePageNumbers(currentPage: number, totalPages: number, viewportWidth: number): number[] {
  const visibleCount = viewportWidth < 768 ? 1 : viewportWidth < 1024 ? 3 : 5;
  const count = Math.min(visibleCount, totalPages);
  const start = Math.max(1, Math.min(currentPage - Math.floor(count / 2), totalPages - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}
