const path = require('path')
const { position } = require('promise-path')
const fromHere = position(__dirname)
const report = (...messages) => console.log(`[${require(fromHere('../../package.json')).logName} / ${__dirname.split(path.sep).pop()} / intcode]`, ...messages)

const IMMEDIATE = 1
const RELATIVE = 2

const opcodes = {
  1: addValues,
  2: multiplyValues,
  3: saveInputToPosition,
  4: outputValue,
  5: jumpIfTrue,
  6: jumpIfFalse,
  7: lessThan,
  8: equals,
  9: modifyBase,
  99: endProgram
}

function readValue ({ memory, mode, parameter, base }) {
  // report('Mode:', mode, 'Parameter:', parameter, 'Position:', memory[parameter] || 0, 'Immediate:', parameter, 'Relative:', memory[base.position + parameter] || 0)
  if (mode === IMMEDIATE) {
    // report('Immediate', parameter)
    return parameter
  } else if (mode === RELATIVE) {
    // report('Relative', memory[base.position + parameter] || 0)
    return memory[base.position + parameter] || 0
  } else {
    if (parameter < 0) {
      throw new Error('Accessed memory location cannot be negative: ' + parameter)
    }
    // report('Position', memory[parameter] || 0)
    return memory[parameter] || 0
  }
}

function interpretWriteAddress ({ memory, mode, parameter, base }) {
  if (mode === IMMEDIATE) {
    throw new Error('Invalid address mode')
  } else if (mode === RELATIVE) {
    return base.position + parameter
  } else {
    return parameter
  }
}

function addValues ({ memory, position, mode1, mode2, mode3, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  const value3 = interpretWriteAddress({ memory, mode: mode3, parameter: memory[position + 3], base })
  memory[value3] = value1 + value2
  return position + 4
}

function multiplyValues ({ memory, position, mode1, mode2, mode3, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  const value3 = interpretWriteAddress({ memory, mode: mode3, parameter: memory[position + 3], base })
  memory[value3] = value1 * value2
  return position + 4
}

function saveInputToPosition ({ id, memory, position, mode1, inputs, outputs, base }) {
  const value1 = interpretWriteAddress({ memory, mode: mode1, parameter: memory[position + 1], base })
  const input = inputs.shift()
  if (input !== undefined) {
    // report(id, 'Read input', input, inputs, outputs)
    memory[value1] = input
    return position + 2
  } else {
    // report(id, 'Waiting for input', inputs, outputs)
    return position
  }
}

function outputValue ({ id, memory, position, inputs, outputs, mode1, outputSignal, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  outputs.push(value1)
  // report(id, 'Output value', value1, inputs, outputs)
  outputSignal(value1)
  return position + 2
}

function jumpIfTrue ({ memory, position, mode1, mode2, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  if (value1 !== 0) {
    return value2
  }
  return position + 3
}

function jumpIfFalse ({ memory, position, mode1, mode2, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  if (value1 === 0) {
    return value2
  }
  return position + 3
}

function lessThan ({ memory, position, mode1, mode2, mode3, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  const value3 = interpretWriteAddress({ memory, mode: mode3, parameter: memory[position + 3], base })
  if (value1 < value2) {
    memory[value3] = 1
  } else {
    memory[value3] = 0
  }
  return position + 4
}

function equals ({ memory, position, mode1, mode2, mode3, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  const value2 = readValue({ memory, mode: mode2, parameter: memory[position + 2], base })
  const value3 = interpretWriteAddress({ memory, mode: mode3, parameter: memory[position + 3], base })
  if (value1 === value2) {
    memory[value3] = 1
  } else {
    memory[value3] = 0
  }
  return position + 4
}

function modifyBase ({ memory, position, mode1, base }) {
  const value1 = readValue({ memory, mode: mode1, parameter: memory[position + 1], base })
  base.position = base.position + value1
  return position + 2
}

function endProgram () {
  return -1
}

function executeProgram ({ id, memory, position, inputs, outputs, outputSignal, base }) {
  const instruction = (memory[position] + '').split('')
  // report('Instruction', instruction)
  const opcode = Number.parseInt([instruction.pop(), instruction.pop()].reverse().join(''))
  const mode1 = Number.parseInt(instruction.pop() || 0)
  const mode2 = Number.parseInt(instruction.pop() || 0)
  const mode3 = Number.parseInt(instruction.pop() || 0)

  try {
    // report('Opcode', opcode, `[${opcodeNames[opcode]}]`, 'at', position, 'Modes:', mode1, mode2, mode3, 'Memory:', memory.slice(position, position + 4).join(', '), 'Base:', base.position)
    return opcodes[opcode]({ id, memory, position, inputs, outputs, mode1, mode2, mode3, outputSignal, base })
  } catch (ex) {
    report('Unable to execute instruction at', position, `(Opcode: ${opcode}, Modes: 1:${mode1}, 2:${mode2}, 3:${mode3})`, `[${memory[position]}]`, 'memory dump:', memory.join(' '))
    report(ex.message)
    return -1
  }
}

async function compute (instructions, inputs = [], outputs = [], outputSignal, id, base = 0) {
  const memory = instructions.split(',').map(n => Number.parseInt(n))
  const basePointer = {
    position: base
  }
  outputSignal = outputSignal || function () {}

  let programComplete
  const promise = new Promise((resolve, reject) => {
    programComplete = resolve
  })

  function stepProgram () {
    do {
      position = newPosition
      newPosition = executeProgram({ id, memory, position, inputs, outputs, outputSignal, base: basePointer })
      if (newPosition === position) {
        setTimeout(stepProgram, 0)
      } else if (newPosition === -1) {
        // report('Program complete at', newPosition)
        programComplete({
          memory,
          inputs,
          outputs,
          position
        })
        return
      }
    } while (newPosition !== position)
  }

  let position = 0; let newPosition = 0
  stepProgram()

  return promise
}

module.exports = compute