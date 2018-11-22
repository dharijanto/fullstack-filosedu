/*
  Generate the question of format:
    X - 5 = 3

  General form:
    X - a = b

  Constraints:
    7 < b < 20
    b < a < 25
*/

var _ = require('lodash')

const knowns = ['a', 'b']
const unknowns = ['x']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}
  result.knowns.b = _.random(7, 20)
  result.knowns.a = _.random(result.knowns.b, 25)
  result.unknowns.x = result.knowns.a + result.knowns.b
  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a, b}, {x}) => {
  return x - a === b
}

// Describe how the question will be printed
const printFn = ({a, b}) => {
  const formatted = [`x - ${a} = ${b}`]
  return _.sample(formatted)
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (unknowns1, unknowns2) => {
  // For this example, exact match is the only match
  return _.isEqual(unknowns1, unknowns2)
}

module.exports = {
  quantity: 10, // The number of questions to be generated
  solver: {
    type: 'bruteforce_solver', // The questions are generated using bruteforce
    randomGeneratorFn, // 'bruteforce_solver' uses random generator to generate each of the variables
    isEqualFn, // Return true if 2 equations are the same
    timeout: 1000 // Maximum time to generate all of the questions
  },
  knowns, // 'Given' variables
  unknowns, // 'Question' variables
  isAnswerFn, // Return true if the combination of 'knowns' and 'unknowns' solve the problem
  printFn // Print the question
}