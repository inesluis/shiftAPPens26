export function getFirstName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0]?.trim();
  return first || fullName.trim();
}
