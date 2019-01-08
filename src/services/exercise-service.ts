import * as Promise from 'bluebird'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import CRUDService from './crud-service-neo'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'
import ExerciseHelper from '../app/utils/exercise-helper'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let moment = require('moment')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const Utils = require(path.join(__dirname, '../lib/utils'))
const TAG = 'ExerciseService'

export type ExerciseAnswer = Array<{[key: string]: string}>
export interface ExerciseGrade {
  numQuestions: number
  numCorrectAnswers: number
  correctAnswers: Array<{[key: string]: any}>
  isCorrect: Array<boolean>
  score: number
  timeFinish: string
}

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
  // Get a GeneratedExercise in a format ready for use. If there's previously generated
  // that hasn't been submitted, this will restore it. Otherwise, it'll generate one.
  getFormattedExercise (exerciseId, userId): Promise<NCResponse<FormattedSubtopicExercise>> {
    return Promise.join<any>(
      this.getExercise(exerciseId),
      this.getGeneratedExercise(userId, exerciseId)
    ).spread((resp1: NCResponse<Exercise> , resp2: NCResponse<GeneratedExercise>) => {
      if (resp1.status && resp1.data) {
        const exercise = resp1.data
        const exerciseHash = ExerciseGenerator.getHash(exercise.data)
        // There's unsubmitted GeneratedExercise that can be restored
        if (resp2.status && resp2.data && resp2.data.exerciseHash === exerciseHash) {
          const generatedExercise = resp2.data
          return this.formatExercise(exercise, generatedExercise)
          // Unsubmitted GeneratedExercise can no longer be used or there's none
        } else if ((resp2.status && resp2.data && resp2.data.exerciseHash !== exerciseHash) || !resp2.status) {
          // TODO: We wanna combine generateExercise and saveGeneratedExercise altogether
          return this.generateAndSaveExercise(exercise, userId).then(resp => {
            if (resp.status && resp.data) {
              return this.formatExercise(exercise, resp.data)
            } else {
              return { status: false, errMessage: resp.errMessage }
            }
          })
        } else {
          throw new Error(`Unexpected error: resp1=${JSON.stringify(resp1)} resp2=${JSON.stringify(resp2)}`)
        }
      } else {
        throw new Error('Failed to retrieve exercise: ' + resp1.errMessage)
      }
    })
  }

  // END OF NEW CODE
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

  // Create a new GeneratedExercise and save it to database
  generateAndSaveExercise (exercise, userId: number): Promise<NCResponse<GeneratedExercise>> {
    return this.generateExercise(exercise).then(resp => {
      if (resp.status && resp.data) {
        const unsavedGeneratedExercise = resp.data
        return this.getModels('GeneratedExercise').destroy({where: {
          userId,
          exerciseId: exercise.id,
          submitted: false,
          onCloud: AppConfig.CLOUD_SERVER
        }}).then(() => {
          return this.create<GeneratedExercise>({
            modelName: 'GeneratedExercise',
            data: {
              exerciseHash: unsavedGeneratedExercise.exerciseHash,
              knowns: unsavedGeneratedExercise.knowns,
              unknowns: unsavedGeneratedExercise.unknowns,
              exerciseId: unsavedGeneratedExercise.exerciseId,
              userId,
              idealTime: unsavedGeneratedExercise.idealTime,
              onCloud: AppConfig.CLOUD_SERVER
            }
          })
        })
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  // Format a GeneratedExercise to a form ready to use
  formatExercise (exercise: Exercise, generatedExercise: GeneratedExercise): Promise<NCResponse<FormattedSubtopicExercise>> {
    const solver = ExerciseGenerator.getExerciseSolver(exercise.data)
    const knowns = JSON.parse(generatedExercise.knowns)
    const unknowns = JSON.parse(generatedExercise.unknowns)

    return Promise.join<any>(
      Promise.map(knowns, known => {
        return solver.formatQuestion(known)
      }),
      Promise.map(unknowns, unknown => {
        return Object.keys(unknown)
      })
    ).spread((renderedQuestions: string[], unknowns: string[][]) => {
      return {
        status: true,
        data: {
          exerciseId: exercise.id,
          idealTime: generatedExercise.idealTime,
          elapsedTime: Utils.getElapsedTime(generatedExercise.createdAt),
          formattedExercise: {
            renderedQuestions,
            unknowns
          }
        }
      }
    })
  }

  // Created GeneratedExercise ready to be saved
  generateExercise (exercise, topicOrSubtopic = false): Promise<NCResponse<Partial<GeneratedExercise>>> {
    let exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data) as BruteforceSolver
    // Generate X number of questions, which depends whether it's topic or subTopic
    let questions: GeneratedQuestionData[] = topicOrSubtopic ?
        exerciseSolver.generateTopicQuestions() :
        exerciseSolver.generateQuestions()

    let knowns: Array<{}> = []
    let unknowns: Array<{}> = []
    let unknownsVariables: Array<{}> = []
    let formattedQuestionsPromises: Array<Promise<string>> = []

    questions.forEach(question => {
      knowns.push(question.knowns)
      unknowns.push(question.unknowns)
      unknownsVariables.push(Object.keys(question.unknowns))
    })

    return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
      return {
        status: true,
        data: {
          exerciseHash: ExerciseGenerator.getHash(exercise.data),
          knowns: JSON.stringify(knowns), // Stringified JSON
          unknowns: JSON.stringify(unknowns), // Stringified JSON
          submitted: false,
          idealTime: exerciseSolver.getExerciseIdealTime(),
          exerciseId: exercise.id
        }
      }
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
  getGeneratedExercise (userId: number, exerciseId: number) {
    return this.readOne<GeneratedExercise>({
      modelName: 'GeneratedExercise',
      searchClause: { userId, exerciseId, submitted: false, onCloud: AppConfig.CLOUD_SERVER }
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
  getRenderedExerciseStars (userId, id): Promise<NCResponse<string>> {
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

  getRenderedExerciseTimers (userId, id): Promise<NCResponse<string>> {
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

  finishExercise (exerciseId: number, userId: number, answers: ExerciseAnswer): Promise<NCResponse<ExerciseGrade>> {
    return this.getGeneratedExercise(userId, exerciseId).then(resp => {
      if (resp.status && resp.data) {
        const generatedExercise = resp.data
        return this.gradeExercise(generatedExercise, answers).then(resp2 => {
          if (resp2.status && resp2.data) {
            const grade: ExerciseGrade = resp2.data
            // Save to database
            return this.updateGeneratedExercise({
              id: generatedExercise.id,
              score: grade.score,
              userAnswer: JSON.stringify(answers),
              submitted: true,
              submittedAt: moment().local().format('YYYY-MM-DD HH:mm:ss'),
              timeFinish: grade.timeFinish
            }).then(resp => {
              if (resp.status) {
                return { status: true, data: grade } as NCResponse<ExerciseGrade>
              } else {
                return { status: false, errMessage: 'Failed to update generatedExercise: ' + resp.errMessage }
              }
            })
          } else {
            return { status: false, errMessage: 'Failed to grade exercise: ' + resp2.errMessage }
          }
        })
      } else {
        return { status: false, errMessage: 'Failed to get generatedExercise: ' + resp.errMessage }
      }
    })
  }

  private gradeExercise (generatedExercise: GeneratedExercise, answers: ExerciseAnswer): Promise<NCResponse<ExerciseGrade>> {
    return this.getExercise(generatedExercise.exerciseId).then(resp => {
      if (resp.status && resp.data) {
        const exercise = resp.data
        const knowns = JSON.parse(generatedExercise.knowns)
        const unknowns = JSON.parse(generatedExercise.unknowns)
        const solver = ExerciseGenerator.getExerciseSolver(exercise.data)

        if (knowns.length !== answers.length) {
          return { status: false, errMessage: 'Unexpected number of answers!' }
        } else {
          const { numCorrectAnswers, correctAnswers, isCorrect } = knowns.reduce((acc, known, index) => {
            const isCorrectAnswer = solver.isAnswer(known, answers[index])
            acc.isCorrect.push(isCorrectAnswer)
            acc.numCorrectAnswers += isCorrectAnswer ? 1 : 0
            acc.correctAnswers.push(unknowns[index])
            return acc
          }, { numCorrectAnswers: 0, correctAnswers: [], isCorrect: [] })
          const numQuestions = knowns.length
          const grade: ExerciseGrade = {
            numQuestions,
            numCorrectAnswers,
            correctAnswers,
            isCorrect,
            timeFinish: ExerciseHelper.countTimeFinish(generatedExercise.createdAt),
            score: parseFloat(numCorrectAnswers) / numQuestions * 100
          }

          return { status: true, data: grade }
        }
      } else {
        return { status: false, errMessage: 'Faile to get exercise: ' + resp.errMessage }
      }
    })
  }
}

export default new ExerciseService()
