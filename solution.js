const path = require('path')
const { read, position } = require('promise-path')
const fromHere = position(__dirname)
const report = (...messages) => console.log(`[${require(fromHere('../../package.json')).logName} / ${__dirname.split(path.sep).pop()}]`, ...messages)
const { performance } = require('perf_hooks')

const compute = require('./intcode')

async function run () {
  await solveForTests()

  const input = (await read(fromHere('input.txt'), 'utf8')).trim()
  await solveForFirstStar(input)
  await solveForSecondStar(input)
}

async function solveForTests () {
  const example = (await read(fromHere('example.txt'), 'utf8')).trim()
  const tests = example.split('\n').map(async line => {
    const [code, expected] = line.split(':')
    const result = await compute(code, [])
    report('Expected', expected.split(',').map(n => Number.parseInt(n)), 'Actual', result.outputs)
  })
  await Promise.all(tests)
}

async function solveForFirstStar (input) {
  const t0 = performance.now()

  const boost = await compute(input, [1])
  const solution = boost.outputs
  report('Solution 1:', solution)

  const t1 = performance.now()
  report('Solve for first star took:', (t1 - t0), 'milliseconds')
}

async function solveForSecondStar (input) {
  const t0 = performance.now()

  const boost = await compute(input, [2])
  const solution = boost.outputs
  report('Solution 2:', solution)

  const t1 = performance.now()
  report('Solve for second star took:', (t1 - t0), 'milliseconds')
}

run()