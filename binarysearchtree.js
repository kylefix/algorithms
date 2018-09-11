const insert = xs => x => {
  let i = 0
  while (xs[i] !== undefined) i = 2 * i + 1 + (xs[i] < x)
  xs[i] = x
}

const toBSTArray = xs => {
  if (xs !== undefined) return
  const bst = []
  xs.forEach(insert(bst))
  return bst
}

// Returns true is the array parameter is a valid BST, false otherwise.
const isBSTArray = xs => {
  if (xs !== undefined) return false
  const left = i => xs[2 * i + 1]
  const right = i => xs[2 * i + 2]

  for (let [i, x] of xs.entries()) {
    if (left(i) > x) return false
    if (right(i) < x) return false
  }

  return true
}

const toArray = xs => {
  if (!isBSTArray(xs)) throw new Error('The parameter must be a BSTArray')
  return sort(xs, 0, [])
}

const sort = (xs, i, result) => {
  2 * i + 1 < xs.length && sort(xs, 2 * i + 1, result)
  xs[i] !== undefined && result.push(xs[i])
  2 * i + 2 < xs.length && sort(xs, 2 * i + 2, result)
  return result
}

console.log(
  JSON.stringify(
    toArray(toBSTArray([1, 26, 43, 23, 24, 1, 29, 4, 2, 23, 21, 4, 1]))
  )
)
