import * as Promise from 'bluebird'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import CRUDService from './crud-service-neo'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let moment = require('moment')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const TAG = 'ExerciseService'

/*
  Important Note:
    generatedExercises and generatedTopicExercises has 'onCloud' column
    which indicate that the data is already on the cloud and we don't need to
    send them again when syncing. Since all rows with onCloud === true
    wouldn't be synced to the server, we shouldn't restore generatedExercises
    or generatedTopicExercises whose onCloud != AppConfig.CLOUD_SERVER.
    Remember to set the value properly!
*/
class ExerciseService extends CRUDService {
  getExercise (exerciseId): Promise<NCResponse<Exercise>> {
    return this.readOne<Exercise>({
      modelName: 'Exercise',
      searchClause: { id: exerciseId },
      include: [
        {
          model: this.getModels('Subtopic'),
          include: [
            { model: this.getModels('Topic') }
          ]
        }
      ]
    })
  }

  // TODO: Should call formatExercise()
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
          knowns,  // Already stringified
          unknowns, // Already stringified
          userAnswer, // DONE
          exerciseId: 40,
          idealTime: 60,
          subtopicName: 'Pengenalan Hasil Bilangan 1-5'
        }
        formatted: {
          renderedQuestions, // HTML-rendered question array
          unknowns, // Variable for inputs
          subtopicName: 'Penjumlahan Hasil Bilangan 1-5'
        }
      }
    }
  */
  generateExercise (exercise: Exercise, subtopicOrTopic = false): Promise<NCResponse<any>> {
    let exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data) as BruteforceSolver
    let questions: GeneratedQuestionData[] = []

    if (subtopicOrTopic) {
      questions = exerciseSolver.generateTopicQuestions()
    } else {
      questions = exerciseSolver.generateQuestions()
    }

    let knowns: Array<{}> = []
    let unknowns: Array<{}> = []
    let unknownsVariables: Array<{}> = []
    let formattedQuestionsPromises: Array<Promise<string>> = []
    /*
      questions content:
      [ { knowns: { a: 23, b: 13 }, unknowns: { x: 36 } },
        { knowns: { a: 10, b: 12 }, unknowns: { x: 22 } } ]
    */
    questions.forEach(question => {
      formattedQuestionsPromises.push(exerciseSolver.formatQuestion(question.knowns))
      knowns.push(question.knowns)
      unknowns.push(question.unknowns)
      unknownsVariables.push(Object.keys(question.unknowns))
    })

    return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
      return {
        status: true,
        data: {
          exerciseData: {
            knowns: JSON.stringify(knowns),
            unknowns: JSON.stringify(unknowns),
            userAnswer: [],
            exerciseId: exercise.id,
            idealTime: exerciseSolver.getExerciseIdealTime()
          },
          formatted: {
            renderedQuestions,
            unknowns: unknownsVariables
          }
        }
      }
    })
  }

  /*
    generatedExercise:
    {
      id: 140,
      exerciseHash: '306e75a560185c08fa9937e1095d9af3',
      knowns: '[{"a":10,"b":3},{"a":10,"b":1},{"a":10,"b":5},{"a":10,"b":9},{"a":10,"b":6},{"a":10,"b":2}]',
      unknowns: '[{"x":13},{"x":11},{"x":15},{"x":19},{"x":16},{"x":12}]',
      userAnswer: null,
      submitted: false,
      score: null,
      timeFinish: null,
      createdAt: 2018-04-10T02:26:51.000Z,
      updatedAt: 2018-04-10T02:26:51.000Z,
      idealTime: 15,
      exerciseId: 34,
      userId: 99
    }

    return:
    {
      "formatted": {
        "renderedQuestions": [
            "\n<span><img src='http://app-filosedu.nusantara-local.com/images/1519379519782_tens.jpeg' width='5%' /></span>\n<span><table class=\"image-repeat\" style=\"width: 23.333333333333332%;\"><tbody><tr><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td><td style=\"padding:5px;\"><img src=\"http://app-filosedu.nusantara-local.com/images/1519379524931_unit.jpeg\" width=\"100%\"/></td></tr></tbody></table></span>\n\nBerapa jumlah balok diatas? (dalam angka)\n",
        ],
        "unknowns": [
            ["x"],
        ]
      },
      "exerciseId": 34
      "idealTime": 5
    }
  */
  formatExercise (generatedExercise, exerciseSolver) {
    let knowns = JSON.parse(generatedExercise.knowns)
    let unknowns = JSON.parse(generatedExercise.unknowns)

    return Promise.join(
      Promise.map(knowns, known => {
        return exerciseSolver.formatQuestion(known)
      }),
      Promise.map(unknowns, unknown => {
        return Object.keys(unknown)
      })
    ).spread((formattedQuestions, unknowns) => {
      let data = {
        formatted: {
          renderedQuestions: formattedQuestions,
          unknowns
        },
        exerciseId: generatedExercise.exerciseId,
        idealTime: generatedExercise.idealTime
      }

      return data
    })
  }

  // Given a generated exercise data, create an entry in generatedExercise table
  // If the user already has a generatedExercise, delete it first before adding a new entry
  saveGeneratedExercise (userId, generatedExercise, exerciseHash) {
    return this.getModels('GeneratedExercise').destroy({where: {
      userId,
      exerciseId: generatedExercise.exerciseId,
      submitted: false,
      onCloud: AppConfig.CLOUD_SERVER
    }}).then(() => {
      return this.create<GeneratedExercise>({
        modelName: 'GeneratedExercise',
        data: {
          exerciseHash,
          knowns: generatedExercise.knowns,
          unknowns: generatedExercise.unknowns,
          exerciseId: generatedExercise.exerciseId,
          userId,
          idealTime: generatedExercise.idealTime,
          onCloud: AppConfig.CLOUD_SERVER
        }
      })
    })
  }

  /*
    Input:
      id: 1,
      score: 2,
      userAnswer: '[{x: "3"}]',
      submitted: true,
      timeFinish: 23.09
  */
  updateGeneratedExercise (data) {
    return this.update<GeneratedExercise>({
      modelName: 'GeneratedExercise',
      data
    })
  }

  // Get exercise that is curently active
  getGeneratedExercise ({ userId, exerciseId }) {
    return this.readOne<GeneratedExercise>({
      modelName: 'GeneratedExercise',
      searchClause: { userId, exerciseId, submitted: false, onCloud: AppConfig.CLOUD_SERVER }
    })
  }

  // Get all exercises that have been submitted
  getSubmittedExercises ({ userId, exerciseId }) {
    return this.read<GeneratedExercise>({
      modelName: 'GeneratedExercise',
      searchClause: { userId, exerciseId, submitted: true }
    })
  }

  // Get user score of an exercise
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  getExerciseStars (userId, id) {
    return this.getSequelize().query(`
SELECT score FROM generatedExercises
WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${id}
ORDER BY score DESC LIMIT 4;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const stars = datas.reduce((acc, data) => {
        if (parseInt(data.score, 10) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      return { status: true, data: { stars } }
    })
  }

  /*
    if renderStar is true
      will return {
        status: true,
        data: {
          html: ' <span><img /></span>'
          stars: 0-4
        }
      }
    else
      {
        status: true,
        data: {
          stars: 0-4
        }
      }
  */
  getRenderedExerciseStars (userId, id) {
    return this.getExerciseStars(userId, id).then(resp => {
      if (resp.status) {
        const stars = resp.data.stars
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/stars.pug'), { stars })
        return { status: true, data: html }
      } else {
        return resp
      }
    })
  }

  // Specially called from course controller
  getSubtopicStar (userId, subtopicId): Promise<NCResponse<any>> {
    return this.read<Exercise>({
      modelName: 'Exercise', searchClause: { subtopicId }
    }).then(resp => {
      return Promise.map(resp.data || [], (exercise: Exercise) => {
        return this.getExerciseStars(userId, exercise.id)
      }).then(datas => {
        const stars = datas.reduce((acc, resp) => {
          return acc + resp.data.stars
        }, 0) / (datas.length || 1)
        return { status: true, data: { stars } }
      })
    })
  }

  // Get user score of an exercise
  //
  // Return:
  // 0 - 4: How many of the submitted scores are > 80%
  getExerciseTimers (userId, exerciseId) {
    return this.getSequelize().query(`
SELECT score FROM generatedExercises
WHERE submitted = 1 AND userId = ${userId} AND exerciseId = ${exerciseId}
AND timeFinish < idealTime AND score = 100
ORDER BY score DESC LIMIT 4;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const timers = datas.reduce((acc, data) => {
        if (parseInt(data.score, 10) >= 100) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)
      return { status: true, data: { timers } }
    })
  }

  getRenderedExerciseTimers (userId, id) {
    return this.getExerciseTimers(userId, id).then(resp => {
      if (resp.status) {
        const timers = resp.data.timers
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/timers.pug'), { timers })
        return { status: true, data: html }
      } else {
        return (resp)
      }
    })
  }

  getSubtopicExerciseTimers (userId, subtopicId) {
    return this.read<Exercise>({
      modelName: 'Exercise', searchClause: { subtopicId }
    }).then(resp => {
      return Promise.map(resp.data || [], (exercise: Exercise) => {
        return this.getExerciseTimers(userId, exercise.id)
      }).then(datas => {
        const timers = datas.reduce((acc, resp) => {
          return acc + resp.data.timers
        }, 0) / (datas.length || 1)
        return { status: true, data: { timers } }
      })
    })
  }

  // Get leaderboard data
  getExerciseRanking (exerciseId) {
    return this.getSequelize().query(
`SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
FROM generatedExercises INNER JOIN users ON users.id = generatedExercises.userId INNER JOIN schools ON schools.id = users.schoolId
WHERE submitted = TRUE AND exerciseId = ${exerciseId} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish) LIMIT 10;`,
    { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getExerciseLeaderboard (exerciseId) {
    return this.getExerciseRanking(exerciseId).then(resp => {
      if (resp.status) {
        const exerciseData = resp.data
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ranking.pug'), { exerciseData })
        return { status: true, data: html }
      } else {
        return (resp)
      }
    })
  }

  // Get the number of rank in leaderboard
  getCurrentRanking (timeFinish, exerciseId) {
    return new Promise((resolve, reject) => {
      let queryDB = `SELECT COUNT(*) AS total
  FROM (SELECT COUNT(*) FROM generatedExercises
  WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND
        exerciseId = ${exerciseId} AND score = 100 AND timeFinish IS NOT NULL
  GROUP BY userId
  ORDER BY MIN(timeFinish)) AS totalrow;`
      return this.getSequelize().query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
          resolve({ status: true, data: { count: resp[0].total } })
        }).catch(err => {
          reject(err)
        })
    })
  }

  // Get the number of submissions in the leaderboard
  getTotalRanking (exerciseId) {
    return new Promise((resolve, reject) => {
      let queryDB = `SELECT COUNT(*) AS total
FROM (SELECT COUNT(*) FROM generatedExercises WHERE submitted = TRUE AND exerciseId = ${exerciseId}
                      AND score = 100 AND timeFinish IS NOT NULL
GROUP BY userId
ORDER BY MIN(timeFinish)) AS totalrow;`
      return this.getSequelize().query(queryDB,
        { type: Sequelize.QueryTypes.SELECT }).then(resp => {
          resolve({ status: true, data: { count: resp[0].total } })
        }).catch(err => {
          reject(err)
        })
    })
  }
}

export default new ExerciseService()
