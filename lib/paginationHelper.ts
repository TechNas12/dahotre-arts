/**
 * Parses and validates pagination parameters from URL searchParams.
 * Clamps page to a minimum of 1.
 * Validates pageSize against allowed values, defaulting to 25.
 */
export function parsePaginationParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const parsedPage = Number.parseInt((searchParams.page as string) ?? "", 10);
  const parsedPageSize = Number.parseInt((searchParams.pageSize as string) ?? "", 10);
  
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = [10, 25, 50, 100].includes(parsedPageSize) ? parsedPageSize : 25;
  
  return { page, pageSize };
}
