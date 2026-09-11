import { describe, expect, it } from "vitest";
import { buildReferralDisplayTree, type ReferralTreePerson } from "./referralDisplayTree";

const person = (
  id: string,
  name: string,
  parentId: string | null,
  depth: number,
): ReferralTreePerson => ({ id, name, parentId, depth });

describe("buildReferralDisplayTree", () => {
  it("appends one empty under You when the tree is empty", () => {
    const root = buildReferralDisplayTree([]);
    expect(root.label).toBe("You");
    expect(root.children).toEqual([
      { key: "you-empty", label: "Share your link!", empty: true, children: [] },
    ]);
  });

  it("puts an empty after a lone direct, not under that leaf", () => {
    const root = buildReferralDisplayTree([person("a", "Alice", null, 1)]);
    expect(root.children.map((child) => child.label)).toEqual(["Alice", "Share your link!"]);
    expect(root.children[0]?.children).toEqual([]);
    expect(root.children[1]?.empty).toBe(true);
  });

  it("only appends the share slot under You, not under nested referrals", () => {
    const root = buildReferralDisplayTree([
      person("a", "Alice", null, 1),
      person("b", "Bob", null, 1),
      person("c", "Cara", "a", 2),
      person("d", "Dee", "a", 2),
    ]);
    expect(root.children.map((child) => child.label)).toEqual(["Alice", "Bob", "Share your link!"]);
    const alice = root.children.find((child) => child.key === "a");
    const bob = root.children.find((child) => child.key === "b");
    expect(alice?.children.map((child) => child.label)).toEqual(["Cara", "Dee"]);
    expect(bob?.children).toEqual([]);
  });
});
