import { describe, expect, it } from "vitest";
import { buildReferralDisplayTree, type ReferralTreePerson } from "./referralDisplayTree";

const person = (
  id: string,
  name: string,
  parentId: string | null,
  depth: number,
): ReferralTreePerson => ({ id, name, parentId, depth });

describe("buildReferralDisplayTree", () => {
  it("returns no nodes when the viewer has no referrals", () => {
    expect(buildReferralDisplayTree([])).toEqual([]);
  });

  it("lists a lone direct as a root row", () => {
    const tree = buildReferralDisplayTree([person("a", "Alice", null, 1)]);
    expect(tree.map((node) => node.label)).toEqual(["Alice"]);
    expect(tree[0]?.children).toEqual([]);
  });

  it("nests real referrals only", () => {
    const tree = buildReferralDisplayTree([
      person("a", "Alice", null, 1),
      person("b", "Bob", null, 1),
      person("c", "Cara", "a", 2),
      person("d", "Dee", "a", 2),
    ]);
    expect(tree.map((node) => node.label)).toEqual(["Alice", "Bob"]);
    const alice = tree.find((node) => node.key === "a");
    const bob = tree.find((node) => node.key === "b");
    expect(alice?.children.map((child) => child.label)).toEqual(["Cara", "Dee"]);
    expect(bob?.children).toEqual([]);
  });
});
