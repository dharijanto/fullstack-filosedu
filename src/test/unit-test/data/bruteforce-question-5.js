/*
  Generate the question of format:
    5x + 5 = 20

  General form:
    ax + b = c
*/

var _ = require('lodash')
// var MathHelper = require('./math-helper')

const knowns = ['a']
const unknowns = ['x', 'y', 'z']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}

  result.unknowns.x = _.random(1, 5)
  result.unknowns.y = _.random(1, 5)
  result.unknowns.z = _.random(1, 5)
  
  // a = random
  result.knowns.a = result.unknowns.x + result.unknowns.y + result.unknowns.z

  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a}, {x, y, z}) => {
  return (parseFloat(x)+parseFloat(y)+parseFloat(z)) === a
}

// Describe how the question will be printed
const printFn = ({a}) => {
  return _.sample([`x + y + z = ${a}`])
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (unknowns1, unknowns2) => {
  // For this example, exact match is the only match
  return _.isEqual(unknowns1, unknowns2)
}

module.exports = {
  name: 'Pengenalan Aljabar 2',
  quantity: 3, // The number of questions to be generated
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
