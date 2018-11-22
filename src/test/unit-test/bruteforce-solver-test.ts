let path = require('path')

let _ = require('lodash')
let chai = require('chai')
let expect = chai.expect

let data = require(path.join(__dirname, 'data'))// data.bruteforceQuestionPositiveQuestions
import ExerciseGenerator from '../../lib/exercise_generator/exercise-generator'

describe('Bruteforce Solver', function () {
  it('Should parse a specified question properly', function (done) {
    // console.log(data)
    data.bruteforcePositiveQuestions.forEach(item => {
      const q1 = require(path.join(__dirname, `data/${item}`))
      let exerciseSolver = ExerciseGenerator.getExerciseSolver(q1)
      // Since this is a bruteforce method, makes sense to try it multiple times
      _.range(0, 10).forEach(() => {
        let questions = exerciseSolver.generateQuestions()
        // Number of generated questions should be the same as what's asked
        expect(questions).to.have.length(q1.quantity)
        // Check that each question is correct
        questions.forEach(question => {
          // Specified knowns should be generated
          expect(Object.keys(question.knowns)).to.include.members(q1.knowns)
          // Specified unknowns should be generated
          expect(Object.keys(question.unknowns)).to.include.members(q1.unknowns)
          // Formatted question should be a string
          // exerciseSolver.formatQuestion(question.knowns).then(result => result.to.be.a('string'))
          // Questions should be answered correctly
          expect(exerciseSolver.isAnswer(question.knowns, question.unknowns)).to.be.ok()
        })
      })
    })
    done()
  })
})
