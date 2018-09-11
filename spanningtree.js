const get = (xs, i, reverse, length) => xs[reverse ? xs.length - 1 - i : i]
const set = (xs, i, v, reverse, length) => {
  xs[reverse ? xs.length - 1 - i : i] = v
}

const radixSort = (xs, fn, reverse) => {
  const largest = String(Math.max(...xs.map(fn))).length
  const bucket = [...Array(10)].map((_, i) => [])

  xs = xs.map(x => ({
    val: x,
    key: String(fn(x)).padStart(largest, '0')
  }))

  for (let i = 0; i < largest; i++) {
    xs.forEach(y => bucket[y.key.slice(-i - 1)[0]].push(y))
    xs = []
    for (let j = 0; j < 10; j++) {
      const ys = get(bucket, j, reverse)
      for (let k = 0; k < ys.length; k++) xs.push(get(ys, k))
      set(bucket, j, [], reverse)
    }
  }

  return xs.map(y => y.val)
}

function makeSpanningTree (weighted, t) {
  const sortedEdges = radixSort(weighted, x => x[1], t === 'min')
  const result = []

  const subsets = new Map(
    sortedEdges.reduce(
      (acc, [edge, weight]) =>
        [...edge].map(v => [v, { rank: 0, parent: v }]).concat(acc),
      []
    )
  )

  const findSet = v => {
    if (subsets.get(v).parent === v) return v
    const vRoot = findSet(subsets.get(v).parent)
    // compression technique
    subsets.get(v).parent = vRoot
    return vRoot
  }

  const union = (x, y) => {
    // union by rank
    const [a, b] = [findSet(x), findSet(y)].sort((a, b) => a.rank - b.rank)
    subsets.get(a).parent = subsets.get(b).parent
    if (a.rank === b.rank) subsets.get(b).rank++
    return subsets
  }

  const processEdge = (v1, v2) => {
    const [r1, r2] = [findSet(v1), findSet(v2)]
    return r1 !== r2 && union(r1, r2)
  }

  const targetVerticesCount = subsets.size - 1
  while (result.length !== targetVerticesCount) {
    const next = sortedEdges.pop()
    processEdge(...next[0]) && result.push(next)
  }

  return result
}

let edges = [
  ['CI', 36],
  ['IC', 9],
  ['CU', 1],
  ['CI', 45],
  ['UI', 84],
  ['IK', 61]
]

let a = makeSpanningTree(edges, 'max')
console.log(JSON.stringify(a))
