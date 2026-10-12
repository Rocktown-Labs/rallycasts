const padDateTime = (value: number) => String(value).padStart(2, "0");

/** ISO string → value for `<input type="datetime-local">` in local time. */
export const toLocalInputValue = (iso?: string | null) => {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  return `${date.getFullYear()}-${padDateTime(date.getMonth() + 1)}-${padDateTime(date.getDate())}T${padDateTime(date.getHours())}:${padDateTime(date.getMinutes())}`;
};

/** datetime-local value → ISO string (or null when cleared/invalid). */
export const fromLocalInputValue = (value: string) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};
