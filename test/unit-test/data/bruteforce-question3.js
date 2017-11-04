/*
  Generate the question of format:
    5x + 5 = 20

  General form:
    ax + b = c
*/

var _ = require('lodash')
// var MathHelper = require('./math-helper')

const knowns = ['a', 'b', 'c']
const unknowns = ['x']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}

  // x = (c - b) / a
  result.unknowns.x = _.random(5, 15)
  // a = random
  result.knowns.a = _.random(2, 10)
  // (c - b) = x * a
  const c_min_b = result.knowns.a * result.unknowns.x
  // c = random < c_min_b
  result.knowns.c = _.random(1, c_min_b)
  // b = -1 * ( (c - b) - c)
  result.knowns.b = -1 * (c_min_b - result.knowns.c)

  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a, b, c}, {x}) => {
  return x === (c - b) / a
}

// Describe how the question will be printed
const printFn = ({a, b, c}) => {
  var plusOrMinus = val => val >= 0 ? '+' : '-'
  return _.sample([`${a}x ${plusOrMinus(b)} ${Math.abs(b)} = ${c}`])
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (unknowns1, unknowns2) => {
  // For this example, exact match is the only match
  return _.isEqual(unknowns1, unknowns2)
}

module.exports = {
  quantity: 20, // The number of questions to be generated
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
