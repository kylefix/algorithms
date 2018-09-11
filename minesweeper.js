// ============================================================
// Globals
let BOMBS_REMAINING
let PUZZLE
let CLUES
let ADJACENT_UNKNOWNS

// ============================================================
// CONSTANTS
const UNKNOWN = '?'
const BOMB = 'x'
const ADJACENT_MAP = [...Array(8)].map((_, i) => {
  const j = [0, 1, 2].includes(i) ? 0 : [3, 7].includes(i) ? 1 : 2
  const k = [0, 6, 7].includes(i) ? 0 : [1, 5].includes(i) ? 1 : 2
  return [j, k]
})

// ============================================================
// HELPERS

const factorial = n => (n < 2 ? 1 : n * factorial(n - 1))

const stringToPuzzle = map =>
  map
    .split('\n')
    .map(row =>
      row.split(' ').map((c, j) => (c === UNKNOWN || c === BOMB ? c : +c))
    )

const puzzleToString = () =>
  '  ' +
  [...Array(BOMBS_REMAINING[0].length)].map((_, i) => i).join(' ') +
  '\n' +
  BOMBS_REMAINING.map((row, i) => [i].concat(row).join(' ')).join('\n')

const puzzleToAnswer = () => PUZZLE.map((row, i) => row.join(' ')).join('\n')

const isValidIndex = (xs, i, j) =>
  i >= 0 && j >= 0 && i < xs.length && j < xs[i].length

const isAClue = square => Number.isInteger(square)

const difference = (xs, ys) => {
  ys.forEach(y => {
    y.forEach(([position, bombs]) => bombs === UNKNOWN && xs.delete(position))
  })
  return xs
}

// ============================================================
// PUZZLE FUNCTIONS

const openZeros = () =>
  BOMBS_REMAINING.forEach((row, i) =>
    row.forEach((bombs, j) => !bombs && openAllAdjacent(i, j))
  )

const openAllAdjacent = (i, j) =>
  getAllAdjacent(i, j).forEach(
    ({ position, bombs }) => bombs === UNKNOWN && openAndUpdate(...position)
  )

const getAllAdjacent = (i, j) => {
  const result = []
  for (let k = 0; k < 8; k++) {
    const row = ADJACENT_MAP[k][0] + i - 1
    const column = ADJACENT_MAP[k][1] + j - 1
    if (!isValidIndex(BOMBS_REMAINING, row, column)) continue
    result.push({
      position: [row, column],
      bombs: BOMBS_REMAINING[row][column]
    })
  }
  return result
}

const getAdjacentBombCount = (i, j) =>
  getAllAdjacent(i, j).filter(({ bombs }) => bombs === BOMB).length

const openAndUpdate = (i, j = false) => {
  if (PUZZLE[i][j] !== UNKNOWN) return

  const newBombs = +open(i, j)

  if (isNaN(newBombs)) {
    throw new Error(`WAS A BOMB AT ${i},${j}`)
  }

  PUZZLE[i][j] = newBombs

  BOMBS_REMAINING[i][j] = newBombs - getAdjacentBombCount(i, j)

  BOMBS_REMAINING[i][j] && CLUES[BOMBS_REMAINING[i][j]].push([i, j])
  setAllAdjacentUnknowns(i, j)

  if (!BOMBS_REMAINING[i][j]) {
    return openAllAdjacent(i, j)
  }
}

const setAdjacentUnknowns = (i, j, adjacentUnknowns) => {
  ADJACENT_UNKNOWNS[i][j] = adjacentUnknowns
}

const setAllAdjacentUnknowns = (i, j = false) => {
  const isZero = BOMBS_REMAINING[(i, j)] === 0
  const allAdjacent = getAllAdjacent(i, j)
  const adjacentUnknowns = []
  const updated = []
  for (let { position, bombs } of allAdjacent) {
    const [row, column] = position
    if (bombs === UNKNOWN && !isZero) {
      adjacentUnknowns.push(position)
    } else if (bombs && bombs !== BOMB) {
      const withoutNewSquare = ADJACENT_UNKNOWNS[row][column].filter(
        ([r, c]) => !(r === i && c === j)
      )
      updated.push([row, column])
      setAdjacentUnknowns(row, column, withoutNewSquare)
    }
  }

  setAdjacentUnknowns(i, j, adjacentUnknowns)
  updated.push([i, j])
  updated.forEach(([i, j]) => openObviousBombs(i, j))

  return adjacentUnknowns
}

const openObviousBombs = (i, j) => {
  const bombs = BOMBS_REMAINING[i][j]
  const adjacentUnknowns = ADJACENT_UNKNOWNS[i][j]
  if (adjacentUnknowns.length === bombs) {
    setBombs(adjacentUnknowns)
  }
}

const setAllAdjacentBombs = (i, j) => {
  const allAdjacent = getAllAdjacent(i, j)
  const allUpdated = []
  for (let { position, bombs } of allAdjacent) {
    if (isAClue(bombs)) {
      const [row, column] = position
      BOMBS_REMAINING[row][column] = Math.max(bombs - 1, 0)
      if (BOMBS_REMAINING[row][column] !== bombs) {
        CLUES[bombs] = CLUES[bombs].filter(
          ([r, c]) => !(r === row && c === column)
        )
        allUpdated.push([row, column])
      }
    }
  }

  allUpdated.forEach(([row, column]) => {
    if (!BOMBS_REMAINING[row][column]) {
      openAllAdjacent(row, column)
    } else {
      CLUES[BOMBS_REMAINING[row][column]].push([row, column])
    }
  })
}

const setBombs = positions =>
  positions.forEach(position => setBomb(...position))

const setBomb = (i, j) => {
  if (BOMBS_REMAINING[i][j] === BOMB) return

  BOMBS_REMAINING[i][j] = BOMB
  PUZZLE[i][j] = BOMB
  setAllAdjacentBombs(i, j)
  setAllAdjacentUnknowns(i, j)
}

const cluesRemaining = (biggerThanZero = false) =>
  BOMBS_REMAINING.reduce((acc, row, i) => {
    row.forEach(
      (clue, j) =>
        isAClue(clue) && (!biggerThanZero || clue > 0) && acc.push([i, j])
    )
    return acc
  }, [])

// ============================================================
// SOLVE

const solveMine = (map, n) => {
  console.time()

  BOMBS_REMAINING = stringToPuzzle(map)
  PUZZLE = stringToPuzzle(map)
  ADJACENT_UNKNOWNS = BOMBS_REMAINING.map(row =>
    [...Array(row.length)].map(() => [])
  )
  CLUES = PUZZLE.reduce(
    (acc, row, i) => {
      row.forEach((clue, j) => {
        if (!isAClue(clue) || !clue) return
        acc[clue].push([i, j])
      })
      return acc
    },
    { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] }
  )

  // Start by opening all squares that have a 0
  openZeros(BOMBS_REMAINING)
  if (PUZZLE.some(row => row.some(cell => cell === UNKNOWN))) {
    while (cluesRemaining(true).length) {
      const [result, solutions] = backtrackSolve(CLUES, n)
      if (result) {
        if (solutions.length) {
          // Only one possible solution found. Set bombs there.
          const solution = solutions.pop()
          if (!solution.length) {
            return '?'
          }
          setBombsFromSolution(solution)
        } else {
          return '?'
        }
      } else if (!result && !solutions.size) {
        // Multiple solutions found, but no safe squares available
        return '?'
      } else {
        // Multiple solutions found. Open all safe squares
        const safeSquares = [...solutions]
        if (!safeSquares.length) return '?'

        safeSquares.forEach(position => {
          const [i, j] = position.split(',')
          openAndUpdate(+i, +j)
        })
      }

      cluesRemaining().forEach(([i, j]) => {
        openObviousBombs(+i, +j)
      })
    }
  }
  const remaining = cluesRemaining(true)
  if (!remaining.length) {
    const bombCount = BOMBS_REMAINING.reduce(
      (acc, row) => row.reduce((acc, bombs) => acc + (bombs === BOMB), acc),
      0
    )

    const unknownCount = BOMBS_REMAINING.reduce((acc, row, i) => {
      row.forEach((bombs, j) => bombs === UNKNOWN && acc++)
      return acc
    }, 0)

    if (bombCount === n) {
      // No hints left, no more bombs, all remaining squares are safe
      BOMBS_REMAINING.forEach((row, i) =>
        row.forEach((bombs, j) => bombs === UNKNOWN && openAndUpdate(i, j))
      )
    } else if (unknownCount === n - bombCount) {
      // No hints left, all remaining squares are bombs
      BOMBS_REMAINING.forEach((row, i) => {
        row.forEach((bombs, j) => bombs === UNKNOWN && setBomb(i, j))
      })
    } else {
      return '?'
    }
  }

  console.timeEnd()
  return puzzleToAnswer()
}

const getPermutations = (perms, count) => {
  const results = []
  const inner = (current, remaining) => {
    if (current.length === count) return results.push(current)
    for (let [i, x] of remaining.entries()) {
      inner([...current, x], remaining.slice(i + 1))
    }
  }
  inner([], perms)
  return results
}

const update = (obj, i, j) => {
  const key = `${i},${j}`
  if (obj[key] && obj[key].length) {
    return obj[key].push(obj[key][0])
  }
  obj[key] = [BOMBS_REMAINING[+i][+j]]
}

const deUpdate = (obj, i, j) => {
  const key = `${i},${j}`
  if (!obj[key]) return
  obj[key].pop()
  if (!obj[key].length) delete obj[key]
}

const extractSolution = source =>
  Object.entries(source).map(([key, value]) => [key, value[0]])

const setBombsFromSolution = allUpdated => {
  allUpdated.forEach(([key, value]) => {
    if (value === UNKNOWN) {
      const [i, j] = key.split(',')
      if (BOMBS_REMAINING[+i][+j] === BOMB) return
      BOMBS_REMAINING[+i][+j] = value
      setBomb(+i, +j)
    }
  })
}

const backtrackSolve = (clues, n) => {
  let allUpdated = {}
  let invalids = new Set()
  const solutions = []
  const allUnsafe = []
  const allSafe = []
  const allClues = Object.values(clues).reduce((acc, xs) => acc.concat(xs), [])
  let bombCount = BOMBS_REMAINING.reduce(
    (acc, row) => row.reduce((acc, bombs) => acc + (bombs === BOMB), acc),
    0
  )

  const allClueAdjacentUnknowns = allClues.reduce((acc, [i, j]) => {
    const allAdjacentUnknowns = getAllAdjacent(i, j).forEach(
      ({ position: [i, j], bombs }) => bombs === UNKNOWN && acc.add(`${i},${j}`)
    )
    return acc
  }, new Set())

  const singleUnknowns = BOMBS_REMAINING.reduce((acc, row, i) => {
    row.forEach((clue, j) => {
      if (clue !== UNKNOWN) return
      if (!allClueAdjacentUnknowns.has(`${i},${j}`)) {
        acc.push([i, j])
      }
    })
    return acc
  }, [])

  const placeNextBomb = remaining => {
    const validateSolution = () => {
      if (
        allClues.every(([i, j]) =>
          getAllAdjacent(i, j).every(
            ({ bombs }) => bombs === 0 || !isAClue(bombs)
          )
        )
      ) {
        if (bombCount > n) return false

        if (n - bombCount > singleUnknowns.length) {
          // Edge case where there are more bombs than squares available
          return false
        }

        if (n === bombCount) {
          const squareWillBeZero = BOMBS_REMAINING.some((row, i) =>
            row.some((clue, j) => {
              if (clue !== UNKNOWN) return
              const allAdjacentBombs = getAllAdjacent(i, j).filter(
                ({ bombs }) => bombs === BOMB
              )
              return allAdjacentBombs.length === 0
            })
          )

          if (squareWillBeZero) {
            // A square can never be zero since it would of been auto opened
            return false
          }
        }
        // No clues remain. We found a valid solution
        const solution = extractSolution(allUpdated)
        solutions.push(solution)
        const bombsRemaining = n - bombCount
        if (bombsRemaining) {
          const fact = factorial(singleUnknowns.length)
          const fact2 = factorial(bombsRemaining)
          const fact3 = factorial(singleUnknowns.length - bombsRemaining)
          const combinationCount = fact / (fact2 * fact3)
          if (combinationCount < 10000) {
            console.log('**permutations**')
            const allPermutations = getPermutations(
              singleUnknowns,
              bombsRemaining
            )
            const updated = {}
            const foundSafe = []
            const foundUnsafe = []
            allPermutations.forEach(permutation => {
              permutation.forEach(([i, j]) => {
                update(updated, i, j)
                update(allUpdated, i, j)
                BOMBS_REMAINING[i][j] = BOMB
              })
              let found
              singleUnknowns.forEach(([i, j]) => {
                if (found || BOMBS_REMAINING[i][j] === BOMB) return
                const allAdjacentBombs = getAllAdjacent(i, j).filter(
                  ({ bombs }) => bombs === BOMB
                )
                if (!allAdjacentBombs.length) found = true
              })

              if (found) {
                foundSafe.push(permutation)
              } else {
                foundUnsafe.push(permutation)
              }

              Object.entries(updated).forEach(([key, value]) => {
                const [i, j] = key.split(',')
                BOMBS_REMAINING[i][j] = value[0]
                deUpdate(updated, i, j)
                deUpdate(allUpdated, i, j)
              })
            })
            const unsafe = []
            const safe = []

            singleUnknowns.forEach(([i, j]) => {
              if (
                !foundUnsafe.some(perm =>
                  perm.some(([r, c]) => r === i && j === c)
                ) &&
                foundSafe.some(perm =>
                  perm.some(([r, c]) => r === i && j === c)
                )
              ) {
                safe.push([i, j])
              } else if (
                foundUnsafe.some(perm =>
                  perm.some(([r, c]) => r === i && j === c)
                ) &&
                !foundSafe.some(perm =>
                  perm.some(([r, c]) => r === i && j === c)
                )
              ) {
                unsafe.push([i, j])
              }
            })
            allUnsafe.push(unsafe)
            allSafe.push(safe)
          } else {
          }
        }
        return true
      }
      return false
    }

    if (!remaining.length) {
      const res = validateSolution()
      return res
    }

    if (bombCount >= n) {
      return false
    }

    const [row, col] = remaining[0]

    const adjacentUnknowns = getAllAdjacent(row, col)
      .filter(({ bombs, position }) => {
        if (bombs !== UNKNOWN) return false
        return getAllAdjacent(...position).every(
          ({ bombs }) => !isAClue(bombs) || bombs > 0
        )
      })
      .map(({ position }) => position)

    if (!BOMBS_REMAINING[row][col]) {
      throw new Error('How?')
    }

    const updated = {}

    const count = BOMBS_REMAINING[row][col]
    const allPermutations = getPermutations(adjacentUnknowns, count, invalids)

    if (!allPermutations.length) {
      return false
    }

    for (let xs of allPermutations) {
      let invalid = false
      for (let [i, j] of xs) {
        update(updated, i, j)
        update(allUpdated, i, j)
        BOMBS_REMAINING[i][j] = BOMB
        bombCount++
        const allAdjacent = getAllAdjacent(i, j).filter(({ bombs }) =>
          Number.isInteger(bombs)
        )

        for (let { position } of allAdjacent) {
          if (BOMBS_REMAINING[position[0]][position[1]] - 1 < 0) {
            invalid = true
            break
          }
          update(updated, position[0], position[1])
          update(allUpdated, position[0], position[1])
          BOMBS_REMAINING[position[0]][position[1]] -= 1
        }

        if (invalid) break
      }

      if (invalid) {
        Object.entries(updated).forEach(([key, value]) => {
          const [i, j] = key.split(',')
          BOMBS_REMAINING[i][j] = value[0]
          if (value[0] === UNKNOWN) {
            bombCount--
          }
          deUpdate(updated, i, j)
          deUpdate(allUpdated, i, j)
        })
      } else {
        const valid = placeNextBomb(
          remaining.filter(([i, j]) => BOMBS_REMAINING[i][j] > 0)
        )
        Object.entries(updated).forEach(([key, value]) => {
          const [i, j] = key.split(',')
          BOMBS_REMAINING[i][j] = value[0]
          if (value[0] === UNKNOWN) {
            bombCount--
          }
          deUpdate(allUpdated, i, j)
          deUpdate(updated, i, j)
        })
      }
    }
  }

  placeNextBomb(allClues)

  Object.entries(allUpdated).forEach(([key, value]) => {
    const [i, j] = key.split(',')
    BOMBS_REMAINING[i][j] = value[0]
    deUpdate(allUpdated, i, j)
  })

  const allAdjacentUnknowns = allClues.reduce((acc, [i, j]) => {
    const allAdjacentUnknowns = getAllAdjacent(i, j).forEach(
      ({ position: [i, j], bombs }) => bombs === UNKNOWN && acc.add(`${i},${j}`)
    )
    return acc
  }, new Set())
  if (
    solutions.length > 1 &&
    solutions.every(solution => {
      const bombs = solution.reduce(
        (acc, [position, clue]) => (clue === UNKNOWN ? acc + 1 : acc),
        0
      )
      return n === bombCount + bombs
    })
  ) {
    // edge case where all bombs remaining are used in the solutions
    // thus we know the bombs cannot be in all the other squares
    const solutionBombs = solutions.reduce((acc, solution) => {
      solution.forEach(([position, clue]) => {
        if (clue !== UNKNOWN) return
        acc.add(position)
      })
      return acc
    }, new Set())

    const safeSquares = BOMBS_REMAINING.reduce((acc, row, i) => {
      row.forEach(
        (clue, j) =>
          clue === UNKNOWN &&
          !solutionBombs.has(`${i},${j}`) &&
          acc.add(`${i},${j}`)
      )
      return acc
    }, new Set())

    return [false, safeSquares]
  }
  const safeSquares = difference(allAdjacentUnknowns, solutions)
  allSafe.length &&
    singleUnknowns.forEach(([i, j]) => {
      const key = `${i},${j}`
      if (
        allSafe.every(
          safes => safes.length && safes.some(([c, r]) => i === c && r === j)
        )
      ) {
        safeSquares.add(key)
      }
    })

  return solutions.length < 2 ? [true, solutions] : [false, safeSquares]
}

// const map = `? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// x ? x ? x ?
// 0 x x 0 0 0
// 0 0 0 0 0 x
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 x 0 0 x x
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 x 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0`

// const result = `? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// ? ? ? ? ? ?
// x ? x ? x ?
// 0 x x 0 0 0
// 0 0 0 0 0 x
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 x 0 0 x x
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 x 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0
// 0 0 0 0 0 0`
// const n = 18
// const result = `1 1 1 0 0 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0
// 1 x 2 2 1 3 x 2 0 0 0 0 0 0 0 0 0 0 0 0 0
// 1 2 x 2 x 3 x 2 0 0 0 0 0 0 0 0 0 0 0 0 0
// 0 1 1 2 1 2 1 1 0 0 1 2 2 1 0 0 0 0 0 0 0
// 1 1 2 1 1 1 1 1 0 0 1 x x 1 0 0 1 1 2 1 1
// 1 x 2 x 2 3 x 2 0 0 1 3 3 2 0 0 1 x 2 x 1
// 1 1 3 3 x 3 x 2 0 0 0 1 x 1 0 0 1 1 2 2 2
// 1 1 2 x 2 3 2 2 0 0 0 1 1 1 0 0 0 0 0 1 x
// 1 x 2 1 1 1 x 1 0 0 0 0 0 0 0 0 0 0 0 1 1`
// const map = `? ? ? 0 0 ? ? ? 0 0 0 0 0 0 0 0 0 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0 0 0 0 0 0 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0 0 0 0 0 0 0 0 0 0
// 0 ? ? ? ? ? ? ? 0 0 ? ? ? ? 0 0 0 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 ? ? ? ? 0 0 ? ? ? ? ?
// ? ? ? ? ? ? ? ? 0 0 ? ? ? ? 0 0 ? ? ? ? ?
// ? ? ? ? ? ? ? ? 0 0 0 ? ? ? 0 0 ? ? ? ? ?
// ? ? ? ? ? ? ? ? 0 0 0 ? ? ? 0 0 0 0 0 ? ?
// ? ? ? ? ? ? ? ? 0 0 0 0 0 0 0 0 0 0 0 ? ?`
// const n = 19
// const result = `x x x x x x x x x x x x
// x x x x x x x x x x x x
// x 4 4 x 4 4 x 4 3 3 3 2
// 2 2 2 2 2 2 2 2 0 0 0 0
// x 1 1 x 1 1 x 1 0 0 0 0
// 2 2 2 2 2 2 2 2 0 0 0 0
// x 1 1 x 1 1 x 1 0 0 0 0
// 2 2 2 1 1 1 1 1 0 0 0 0
// 1 x 2 1 1 1 1 0 0 0 0 0
// 2 3 x 2 2 x 2 1 0 0 0 0
// x 2 1 2 x 3 x 1 0 0 0 0`
// const map = `? ? ? ? ? ? ? ? ? ? ? ?
// ? ? ? ? ? ? ? ? ? ? ? ?
// ? ? ? ? ? ? ? ? ? ? ? ?
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? 0 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0
// ? ? ? ? ? ? ? ? 0 0 0 0`
// const n = 39
// const result = `0 0 0 0 1 1 1 1 1 1
// 0 0 0 1 2 x 2 2 x 1
// 0 1 1 2 x 2 2 x 2 1
// 1 2 x 2 1 1 1 1 1 0
// 1 x 2 1 0 0 0 0 0 0
// 1 1 1 0 0 0 0 0 0 0`
// const n = 6

// const map = `0 1 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 1 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?`
// const result = `0 1 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 2 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?
// 0 1 ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ? ?`
// const n = 41
const map = `? ? ? ? ? ? ? 0 0 0 0 0
? ? ? ? ? ? ? ? 0 0 0 0
? ? ? ? ? ? ? ? 0 0 0 0
? ? 0 ? ? ? ? ? 0 0 0 0
0 ? ? ? ? ? ? 0 0 0 ? ?
0 ? ? ? 0 0 0 0 ? ? ? ?
? ? ? ? 0 0 0 0 ? ? ? ?
? ? ? ? 0 0 0 0 ? ? ? ?
? ? ? ? 0 0 0 0 0 0 0 0
0 0 0 0 ? ? ? 0 0 0 0 0
0 0 0 0 ? ? ? 0 0 0 0 0
0 0 0 ? ? ? ? 0 0 0 0 0
0 0 0 ? ? ? 0 0 0 ? ? ?
0 0 0 ? ? ? ? ? 0 ? ? ?
? ? ? 0 0 ? ? ? 0 ? ? ?
? ? ? 0 0 ? ? ? ? ? ? ?
? ? ? 0 0 0 0 0 ? ? ? 0
? ? 0 0 0 0 0 0 ? ? ? ?
0 0 0 0 0 0 0 0 0 0 ? ?
0 0 0 0 0 ? ? ? 0 0 ? ?
0 0 0 0 0 ? ? ? 0 ? ? ?
0 0 ? ? ? ? ? ? 0 ? ? ?
0 0 ? ? ? 0 0 0 0 ? ? ?
? ? ? ? ? ? ? ? ? ? ? ?
? ? ? 0 0 ? ? ? ? ? 0 0`
const result = `1 x 2 1 1 1 1 0 0 0 0 0
2 3 x 2 2 x 2 1 0 0 0 0
x 2 1 2 x 4 x 1 0 0 0 0
1 1 0 1 2 x 2 1 0 0 0 0
0 1 1 1 1 1 1 0 0 0 1 1
0 1 x 1 0 0 0 0 1 1 3 x
1 3 2 2 0 0 0 0 1 x 3 x
x 2 x 1 0 0 0 0 1 1 2 1
1 2 1 1 0 0 0 0 0 0 0 0
0 0 0 0 1 1 1 0 0 0 0 0
0 0 0 0 1 x 1 0 0 0 0 0
0 0 0 1 2 2 1 0 0 0 0 0
0 0 0 1 x 1 0 0 0 1 1 1
0 0 0 1 1 2 1 1 0 1 x 2
1 1 1 0 0 1 x 1 0 1 2 x
2 x 1 0 0 1 1 1 1 1 2 1
x 2 1 0 0 0 0 0 1 x 1 0
1 1 0 0 0 0 0 0 1 1 2 1
0 0 0 0 0 0 0 0 0 0 1 x
0 0 0 0 0 1 1 1 0 0 1 1
0 0 0 0 0 1 x 1 0 1 1 1
0 0 1 1 1 1 1 1 0 2 x 3
0 0 1 x 1 0 0 0 0 2 x x
1 1 2 1 1 1 1 2 1 2 2 2
1 x 1 0 0 1 x 2 x 1 0 0`
const n = 30
const stringToPuzzle = map =>
  map.split('\n').map(row => row.split(' ').map((c, j) => (c === '?' ? c : +c)))

const answer = stringToPuzzle(result)
const game = {}
const open = (i, j) => {
  return answer[i][j]
}
console.log(solveMine(map, n))
