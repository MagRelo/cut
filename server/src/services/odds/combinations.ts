/** All k-sized subsets of indices (order preserved by increasing index). */
export function combinationsOfIndices(n: number, k: number): number[][] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const out: number[][] = [];
  function backtrack(start: number, path: number[]) {
    if (path.length === k) {
      out.push([...path]);
      return;
    }
    for (let i = start; i < indices.length; i++) {
      path.push(indices[i]!);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(0, []);
  return out;
}
