export type ReferralTreePerson = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  color?: string;
};

export type ReferralDisplayNode = {
  key: string;
  label: string;
  empty: boolean;
  color?: string;
  children: ReferralDisplayNode[];
};

function emptyNode(key: string): ReferralDisplayNode {
  return { key, label: "Share your link!", empty: true, children: [] };
}

function withTrailingEmpty(
  children: ReferralDisplayNode[],
  emptyKey: string,
): ReferralDisplayNode[] {
  return [...children, emptyNode(emptyKey)];
}

export function buildReferralDisplayTree(
  people: ReferralTreePerson[],
  rootColor?: string,
): ReferralDisplayNode {
  const byParent = new Map<string | null, ReferralTreePerson[]>();
  for (const person of people) {
    const list = byParent.get(person.parentId) ?? [];
    list.push(person);
    byParent.set(person.parentId, list);
  }

  const fromPerson = (person: ReferralTreePerson): ReferralDisplayNode => {
    const realChildren = (byParent.get(person.id) ?? []).map(fromPerson);
    return {
      key: person.id,
      label: person.name,
      empty: false,
      color: person.color,
      children: realChildren,
    };
  };

  const directs = (byParent.get(null) ?? []).map(fromPerson);

  return {
    key: "you",
    label: "You",
    empty: false,
    color: rootColor,
    children: withTrailingEmpty(directs, "you-empty"),
  };
}
