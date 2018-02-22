/*
  Generate the question of format:
    x = [1-5]

  General form:
    x = a
*/

var _ = require('lodash')

var mathjax = require(path.join(__dirname, './lib/mathjax-helper'))
var imageHelper = require(path.join(__dirname, './lib/image-helper'))

const knowns = ['a', 'b']
const unknowns = ['x']

const FINGERS = ['', '1519266820539_1.jpeg', '1519266828430_2.jpeg', '1519266833470_3.jpeg' , '1519266838184_4.jpeg', '1519266842903_5.jpeg']

const randomGeneratorFn = () => {
  const result = {knowns: {}, unknowns: {}}
  result.knowns.a = _.random(1, 4)
  result.knowns.b = _.random(1, 5 - result.knowns.a)
  result.unknowns.x = result.knowns.a + result.knowns.b
  return result
}

// param1: knowns
// param2: unknowns
const isAnswerFn = ({a, b}, {x}) => {
  a = parseInt(a)
  x = parseInt(x)

  return x === a
}

// Describe how the question will be printed
const printFn = ({a, b}) => {
return `
${imageHelper.single(FINGERS[a], 15)}
${imageHelper.single(FINGERS[b], 15)}

Berapa jumlah jari yang terangkat? (dalam angka)
`
}

// In addition to exact matches, this describe the other matches
// unknowns1 = {a, b}
// unknowns2 = {a, b}
const isEqualFn = (unknowns1, unknowns2) => {
  // For this example, exact match is the only match
  return _.isEqual(unknowns1, unknowns2)
}

module.exports = {
  quantity: 5, // The number of questions to be generated
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
