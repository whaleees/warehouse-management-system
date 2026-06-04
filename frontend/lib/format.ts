/** Date + time, null-safe. Matches the dominant `toLocaleString()` usage. */
export const formatDate = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleString() : "-";

/** Date only, null-safe. */
export const formatDateOnly = (d?: string | Date | null) =>
  d ? new Date(d).toLocaleDateString() : "-";

/** Indonesian Rupiah currency formatting. */
export const formatIDR = (n: number) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
  });
