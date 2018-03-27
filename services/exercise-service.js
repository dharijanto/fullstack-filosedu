var path = require('path')

// var Promise = require('bluebird')
var log = require('npmlog')
var marked = require('marked')
var Promise = require('bluebird')
var Sequelize = require('sequelize')

var CRUDService = require(path.join(__dirname, 'crud-service'))
var ExerciseGenerator = require(path.join(__dirname, '../lib/exercise_generator/exercise-generator'))
var ExerciseHelper = require(path.join(__dirname, '../app/utils/exercise-helper'))

const TAG = 'ExerciseService'
class ExerciseService extends CRUDService {
  /*
    return:
      { status: true,
        data: {
        id,
        data: [nodeJsCodeForExercise1, nodeJsCodeForExercise2]
      }
  */
  getTopicExercises (topicId) {
    log.verbose(TAG, `course.service.getExerciseRelatedWithTopicId.GET (topicId): ${topicId}`)
    return this._sequelize.query(`
SELECT exercises.id, exercises.data
FROM exercises AS exercises
INNER JOIN subtopics AS subtopic ON exercises.subtopicId = subtopic.id AND subtopic.topicId = ${topicId}
ORDER BY subtopic.subtopicNo ASC, exercises.id ASC;`, { type: Sequelize.QueryTypes.SELECT }
    ).then(resp => {
      return {status: true, data: resp}
    })
  }

  /*
    exercise: {
      id: 13,
      data: // NodeJS Code describing the exercise
      createdAt: 2018-02-21T08:50:28.000Z,
      updatedAt: 2018-03-04T13:38:48.000Z,
      subtopicId: 13,
      subtopic: 'Pengenalan Bilangan 1 - 5',
      description: '',
      subtopicData: '{"detail":""}',
      subtopicNo: 101,
      topicId: 12
    }

    return: {
      status: true,
      data :{
        exerciseData: {
          knowns,  // DONE
          unknowns, // DONE
          exerciseHash, // DONE
          userAnswer, // DONE
          exerciseId
        }
        formatted: {
          renderedQuestions, // HTML-rendered question array
          unknowns, // Variable for inputs
          userAnswer
        }
      }
    }
  */
  generateExercise (exerciseData) {
    var exerciseHash = ExerciseGenerator.getHash(exerciseData.data)
    var exerciseSolver = ExerciseGenerator.getExerciseSolver(exerciseData.data)
    var questions = exerciseSolver.generateTopicQuestions()

    var knowns = []
    var unknowns = []
    var formattedQuestionsPromises = []
    var answerUnknowns = []
    /*
      questions content:
      [ { knowns: { a: 23, b: 13 }, unknowns: { x: 36 } },
        { knowns: { a: 10, b: 12 }, unknowns: { x: 22 } } ]
    */
    questions.forEach(question => {
      formattedQuestionsPromises.push(exerciseSolver.formatQuestion(question.knowns))
      knowns.push(question.knowns)
      answerUnknowns.push(question.unknowns)
      unknowns.push(Object.keys(question.unknowns))
    })

    return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
      return {
        status: true,
        data: {
          exerciseData: {
            knowns: JSON.stringify(knowns),
            unknowns: JSON.stringify(answerUnknowns),
            exerciseHash,
            userAnswer: [],
            exerciseId: exerciseData.id
          },
          formatted: {
            renderedQuestions,
            unknowns
          }
        }
      }
    })
  }

  /*
  Input:
    questionDataFromDB: [{
      knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
      unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
      userAnswer: [],
      exerciseHash: '0c9a610a26d61394bfde9e877533e9b9',
      exerciseId: 14
    }]

  Output:
    [{
      "status": true,
      "data": {
        "exerciseData": {
            "knowns": "[{\"a\":2,\"b\":3},{\"a\":1,\"b\":2}]",
            "unknowns": "[[\"x\"],[\"x\"]]",
            "exerciseHash": "111753fbfe7ff0c9c59bfe98cb2e61e9",
            "userAnswer": [],
            "exerciseId": 26
        },
        "formatted": {
            "renderedQuestions": ["\n2 + 3 = ?\n", "\n1 + 2 = ?\n"],
            "unknowns": [
                ["x"],
                ["x"]
            ]
        }
      }
    }]
  */
  getRenderedQuestion (questionDataFromDB) {
    var formattedQuestionsPromises = []
    return Promise.map(questionDataFromDB, exerciseDetail => {
      var questionknowns = JSON.parse(exerciseDetail.knowns)
      var questionunknowns = JSON.parse(exerciseDetail.unknowns)
      var exerciseId = exerciseDetail.exerciseId
      var exerciseHash = exerciseDetail.exerciseHash

      return new Promise((resolve, reject) => {
        return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseId}}).then(exercise => {
          var exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data.data)
          return questionknowns.forEach(questionknown => {
            formattedQuestionsPromises.push(exerciseSolver.formatQuestion(questionknown))
            return exerciseSolver.formatQuestion(questionknown).then(renderedQuestion => {
              resolve({
                renderedQuestion,
                questionknown,
                questionunknowns,
                exerciseId,
                exerciseHash
              })
            })
          })
        }).catch(err => {
          reject(err)
        })
      })
    }).then(questionRender => {
      return Promise.map(questionRender, result => {
        return new Promise((resolve, reject) => {
          resolve({
            status: true,
            data: {
              exerciseData: {
                knowns: result.questionknown,
                unknowns: result.questionunknowns,
                exerciseHash: result.exerciseHash,
                userAnswer: [],
                exerciseId: result.exerciseId
              },
              formatted: {
                renderedQuestions: result.renderedQuestion,
                unknowns: Object.keys(result.questionunknowns[0])
              }
            }
          })
        })
      }).then(finalResult => {
        return finalResult
      })
    })
  }

  /*
  Input:
    questionDataFromDB: [{
      knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
      unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
      userAnswer: [],
      exerciseHash: '0c9a610a26d61394bfde9e877533e9b9',
      exerciseId: 14
    }]
  Output:
    true/false
  */
  checkHash (exerciseData) {
    return new Promise((resolve, reject) => {
      var status = true
      Promise.map(exerciseData, data => {
        if (status) {
          return this.readOne({modelName: 'Exercise', searchClause: {id: data.exerciseId}}).then(resp => {
            if (resp.status) {
              var exerciseHash = ExerciseGenerator.getHash(resp.data.data)
              if (exerciseHash === data.exerciseHash) {
                status = true
              } else {
                status = false
              }
            } else {
              return {status: false, errMessage: 'Exercise is not avaiable'}
            }
          })
        } else {
          status = false
        }
      }).then(() => {
        resolve({status})
      })
    })
  }

  /*
  Input:
    knowns: {
      a: 6,
      b: 8
    },
    unknowns: {
      x: '9'
    }
  Output:
    status: true/false
    data: {
      isCorrect: true/false
    }
  */
  checkAnswer (exerciseId, knowns, unknowns) {
    return this.readOne({modelName: 'Exercise', searchClause: {id: exerciseId}}).then(resp => {
      if (resp.status) {
        const exercise = resp.data
        const exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
        var isCorrect = exerciseSolver.isAnswer(knowns, {x: unknowns})
        return {status: true, data: {isCorrect}}
      } else {
        return {status: false, errMessage: 'Exercise is not avaiable'}
      }
    })
  }

  /*
  {
    status: true,
    data:
     [ { id: 3,
         submitted: false,
         score: null,
         timeFinish: null,
         exerciseDetail:
            [ { knowns: '[{"a":2,"b":2},{"a":2,"b":1}]',
                unknowns: '[{"x":"Empat"},{"x":"Tiga"}]',
                userAnswer: [],
                exerciseHash: '0c9a610a26d61394bfde9e877533e9b9',
                exerciseId: 14 } ],
         createdAt: 2018-03-23T07:51:34.000Z,
         updatedAt: 2018-03-23T07:51:34.000Z,
         topicId: 12,
         userId: 14 } ]
   }
  */
  getGeneratedTopicExercise (userId, topicId) {
    return this.readOne({
      modelName: 'generatedTopicExercise',
      searchClause: {
        userId,
        topicId,
        submitted: false
      }
    })
  }

  createGeneratedTopicExercise (generatedTopicExerciseData) {
    return this.create({
      modelName: 'generatedTopicExercise',
      data: generatedTopicExerciseData
    })
  }
}

module.exports = ExerciseService
