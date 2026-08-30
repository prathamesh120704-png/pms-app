/** Trimmed department used for isolation filters. Empty / null means no access. */
export function scopedDepartment(
  department: string | null | undefined,
): string | null {
  const value = department?.trim();
  return value ? value : null;
}
