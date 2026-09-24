import { describe, expect, it } from "vite-plus/test";

import { truncate } from "./String.ts";

describe("truncate", () => {
  it("keeps short text and trims whitespace", () => {
    expect(truncate("  hello  ", 10)).toBe("hello");
  });

  it("cuts long text at the limit", () => {
    expect(truncate("abcdefgh", 5)).toBe("abcde...");
  });

  it("never leaves half of an emoji at the cut", () => {
    expect(truncate("abcd😀 more", 5)).toBe("abcd...");
    expect(truncate("abc😀 more", 5)).toBe("abc😀...");
  });
});
