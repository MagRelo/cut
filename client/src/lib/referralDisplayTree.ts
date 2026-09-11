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
  color?: string;
  invite?: boolean;
  children: ReferralDisplayNode[];
};

export function buildReferralDisplayTree(people: ReferralTreePerson[]): ReferralDisplayNode[] {
  const byParent = new Map<string | null, ReferralTreePerson[]>();
  for (const person of people) {
    const list = byParent.get(person.parentId) ?? [];
    list.push(person);
    byParent.set(person.parentId, list);
  }

  const fromPerson = (person: ReferralTreePerson): ReferralDisplayNode => ({
    key: person.id,
    label: person.name,
    color: person.color,
    children: (byParent.get(person.id) ?? []).map(fromPerson),
  });

  return (byParent.get(null) ?? []).map(fromPerson);
}
