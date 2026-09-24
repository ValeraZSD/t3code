export function truncate(text: string, maxLength = 50): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  // Back off one unit rather than cut a surrogate pair (most emoji) in half.
  const lastCode = trimmed.charCodeAt(maxLength - 1);
  const end = lastCode >= 0xd800 && lastCode <= 0xdbff ? maxLength - 1 : maxLength;
  return `${trimmed.slice(0, end)}...`;
}
