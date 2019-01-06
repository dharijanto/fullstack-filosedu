import * as Promise from 'bluebird'
import BruteforceSolver, { GeneratedQuestionData } from '../lib/exercise_generator/exercise_solvers/bruteforce-solver'
import CRUDService from './crud-service-neo'
import ExerciseGenerator from '../lib/exercise_generator/exercise-generator'
import ExerciseService from './exercise-service'

let path = require('path')

let log = require('npmlog')
let pug = require('pug')
let moment = require('moment')
let Sequelize = require('sequelize')

const AppConfig = require(path.join(__dirname, '../app-config'))
const Utils = require(path.join(__dirname, '../lib/utils'))

const TAG = 'TopicExerciseService'

export interface GeneratedTopicExerciseDetail {
  knowns: string, // stringified JSON
  unknowns: string, // stringified JSON
  userAnswer: string, // stringified JSON
  exerciseHash: string
  exerciseId: number
}

export interface TopicExerciseGrade {
  numQuestions: number
  numCorrectAnswers: number
  correctAnswers: Array<{[key: string]: any}>
  isCorrect: Array<boolean>
  score: number
}

export type TopicExerciseAnswer = Array<{[key: string]: any}>

class TopicExerciseService extends CRUDService {
  // TODO: We should use version on courseService instead of this
  private getTopic (topicId): Promise<NCResponse<Topic>> {
    return this.readOne<Topic>({ modelName: 'Topic', searchClause: { id: topicId } })
  }

  getFormattedExercise (topicId, userId): Promise<NCResponse<FormattedTopicExercise>> {
    if (topicId && userId) {
      return Promise.join<any>(
        this.getExercises(topicId),
        this.getGeneratedTopicExercise(userId, topicId),
        this.getExercisesHash(topicId),
        this.getTopic(topicId)
      ).spread((resp: NCResponse<Exercise[]>, resp2: NCResponse<GeneratedTopicExercise>,
                resp3: NCResponse<string>, resp4: NCResponse<Topic>) => {
        if (resp3.status && resp4.status) {
          const topicExerciseHash = resp3.data
          // If there's valid exercise to be restored
          if (resp2.status && resp2.data && resp2.data.topicExerciseHash === topicExerciseHash) {
            return this.formatGeneratedTopicExercise(resp2.data)
          } else if (resp.status && resp.data &&
                    ((resp2.status && resp2.data && resp2.data.topicExerciseHash !== topicExerciseHash) ||
                    !resp2.status)) {
            // If there's expired generated exercise or no generated exercise to be restored
            return this.generateTopicExercise(topicId, userId, resp.data).then(resp5 => {
              if (resp5.status && resp5.data) {
                return this.formatGeneratedTopicExercise(resp5.data)
              } else {
                return { status: false, errMessage: resp5.errMessage }
              }
            })
          } else {
            // We should never get here..
            throw new Error('Unexpected error!')
          }
        } else {
          throw new Error(`Failed to retrieve topic or topicExerciseHash: ${resp3.errMessage || resp4.errMessage}`)
        }
      })
    } else {
      return Promise.resolve({ status: false, errMessage: 'topicId and userId are required!' })
    }
  }

  private getExercises (topicId): Promise<NCResponse<Exercise[]>> {
    return this.getSequelize().query(`
SELECT exercises.id, exercises.data, exercises.createdAt, exercises.updatedAt, exercises.subtopicId
FROM exercises AS exercises
INNER JOIN subtopics AS subtopic ON exercises.subtopicId = subtopic.id AND subtopic.topicId = ${topicId}
ORDER BY subtopic.subtopicNo ASC, exercises.id ASC;`, { type: Sequelize.QueryTypes.SELECT }
    ).then(resp => {
      return { status: true, data: resp }
    })
  }

  // Given topicId, computes hash value of the associated TopicExercise.
  // The hash is computed from each of the building subtopic Exercises.
  // In other words, if any subtopic Exercise changes, hash for respective
  // TopicExercise that depends on it also changes.
  private getExercisesHash (topicId): Promise<NCResponse<string>> {
    return this.getExercises(topicId).then(resp => {
      if (resp.status && resp.data) {
        const combinedHash = resp.data.reduce((acc, hash) => {
          return acc + ExerciseGenerator.getHash(hash)
        }, '')
        let topicExerciseHash = ExerciseGenerator.getHash(combinedHash)
        return { status: true, data: topicExerciseHash }
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  generateTopicExercise (topicId, userId, exercises: Exercise[]): Promise<NCResponse<GeneratedTopicExercise>> {
    return this.getExercisesHash(topicId).then(resp => {
      if (resp.status && resp.data) {
        const topicExerciseHash = resp.data
        return Promise.map(exercises, exercise => {
          return ExerciseService.generateExercise(exercise, true).then(resp => {
            if (resp.status) {
              // Check this has questions
              const parsedKnowns = JSON.parse(resp.data.exerciseData.knowns)
              if (parsedKnowns.length > 0) {
                return {
                  exerciseData: resp.data.exerciseData
                }
              } else {
                // Skip over empty questions
                return null
              }
            } else {
              return null
            }
          })
        }).then(results => {
          const exerciseDetail: any[] = []
          let idealTime = 0

          // Needed for TS to typecheck
          function notEmpty<TValue> (value: TValue | null | undefined): value is TValue {
            return value !== null && value !== undefined
          }

          results.filter(notEmpty).forEach(result => {
            idealTime += result.exerciseData.idealTime
            exerciseDetail.push(result.exerciseData)
          })

          // In case that the exercise is no longer up-to-date, we have to delete stale generated exercise
          return this.getModels('GeneratedTopicExercise').destroy({where: {
            topicId,
            userId,
            submitted: false,
            onCloud: AppConfig.CLOUD_SERVER
          }}).then(() => {
            return this.create<GeneratedTopicExercise>({
              modelName: 'GeneratedTopicExercise',
              data: {
                topicId,
                userId,
                exerciseDetail: JSON.stringify(exerciseDetail),
                topicExerciseHash,
                idealTime,
                onCloud: AppConfig.CLOUD_SERVER
              }
            })
          })
        })
      } else {
        return { status: false, errMessage: 'Failed to retrieve exercise hash!' }
      }
    })

  }

  // Format GeneratedTopicExercise for controller uses.
  private formatGeneratedTopicExercise (generatedTopicExercise: GeneratedTopicExercise): Promise<NCResponse<FormattedTopicExercise>> {
    const topicId = generatedTopicExercise.topicId
    const generatedExercises: GeneratedExercise[] = JSON.parse(generatedTopicExercise.exerciseDetail)
    return Promise.map(generatedExercises, generatedExercise => {
      return this.readOne<Exercise>({ modelName: 'Exercise', searchClause: { id: generatedExercise.exerciseId } }).then(resp2 => {
        if (resp2.status && resp2.data) {
          let exerciseSolver = ExerciseGenerator.getExerciseSolver(resp2.data.data)
          let unknowns: Array<string[]> = []
          let formattedQuestionsPromises: Array<Promise<string>> = []
          JSON.parse(generatedExercise.knowns).forEach(knowns => {
            formattedQuestionsPromises.push(exerciseSolver.formatQuestion(knowns))
          })
          JSON.parse(generatedExercise.unknowns).forEach(_unknowns => {
            unknowns.push(Object.keys(_unknowns))
          })
          return Promise.all(formattedQuestionsPromises).then(renderedQuestions => {
            return {
              renderedQuestions,
              unknowns
            } as FormattedExercise
          })
        } else {
          throw new Error(resp2.errMessage)
        }
      })
    }).then(formattedExercises => {
      return this.readOne<Topic>({ modelName: 'Topic', searchClause: { id: topicId } }).then(resp => {
        if (resp.status && resp.data) {
          return {
            status: true,
            data: {
              topicName: resp.data.topic,
              formattedExercises,
              idealTime: generatedTopicExercise.idealTime,
              elapsedTime: Utils.getElapsedTime(generatedTopicExercise.createdAt)
            }
          }
        } else {
          return { status: false, errMessage: '' }
        }
      })
    })
  }

  // Grade a TopicExercise
  gradeExercise (generatedExerciseDetails: GeneratedTopicExerciseDetail[], answers: TopicExerciseAnswer): Promise<NCResponse<TopicExerciseGrade>> {
    return Promise.map(generatedExerciseDetails, exerciseDetail => {
      return this.readOne<Exercise>({ modelName: 'Exercise', searchClause: { id: exerciseDetail.exerciseId } }).then(resp => {
        if (resp.status && resp.data) {
          const exercise = resp.data
          const exerciseSolver = ExerciseGenerator.getExerciseSolver(exercise.data)
          const knowns = JSON.parse(exerciseDetail.knowns)
          const unknowns = JSON.parse(exerciseDetail.unknowns)
          return knowns.map((known, index) => {
            return { known, correctAnswer: unknowns[index], isAnswerFn: exerciseSolver.isAnswer.bind(exerciseSolver) }
          })
        } else {
          throw new Error('Exercise with id=' + exerciseDetail.exerciseId + ' could not be found!')
        }
      })
    }).then(topicExerciseArray => {
      // Now, we have 3 level arrays:
      // 1 -> Topic Exercise. 2 -> Exercise. 3 -> Question
      // But since userAnswer is a 1-level array of question, we need to flatten what we have to be easily used
      return topicExerciseArray.reduce((acc, exerciseArray) => {
        return acc.concat(exerciseArray)
      }, []).reduce((acc, questionArray) => {
        return acc.concat(questionArray)
      }, [])
    }).then(results => {
      console.dir(results)
      const { numCorrectAnswers, correctAnswers, isCorrect } = results.reduce((acc, result, index) => {
        const isCorrect = result.isAnswerFn(result.known, answers[index])
        acc.numCorrectAnswers += isCorrect ? 1 : 0
        acc.correctAnswers.push(result.correctAnswer)
        acc.isCorrect.push(isCorrect)
        return acc
      }, { numCorrectAnswers: 0, correctAnswers: [], isCorrect: [] })
      const numQuestions = results.length
      const grade: TopicExerciseGrade = {
        numQuestions,
        numCorrectAnswers,
        correctAnswers,
        isCorrect,
        score: parseFloat(numCorrectAnswers) / numQuestions * 100
      }
      return { status: true, data: grade }
    })
  }

  // Update GeneratedTopicExercise as submitted
  finishExercise (generatedTopicExerciseId: number, score: number, timeFinish: string,
                  exerciseDetails: GeneratedTopicExerciseDetail[], answers: TopicExerciseAnswer[]): Promise<NCResponse<number>> {
    // This is a bit annoying..
    // So answer is what a student would submit. It's a one dimensional array of answers for each of the exercises
    // We want to save user answer into exerciseDetail so that we can debug problems. (i.e. wrong scoring)
    // In order to make sure each answer goes to correct exercise detail, we have wind them up
    // in the same order when we unwind. If you're confused about this code:
    // 1. Try to look at MySQL table structure for generatedTopicExercises
    // 2. Remember that exerciseDetail there is stringified version of each of generatedExercises that makes up
    //    a topic exercise.
    let answerIndex = 0
    const exerciseDetail = JSON.stringify(exerciseDetails.map(exerciseDetail => {
      console.dir(exerciseDetail)
      const exerciseDetailAnswers: Array<any> = []
      JSON.parse(exerciseDetail.knowns).forEach(_ => {
        exerciseDetailAnswers.push(answers[answerIndex])
        answerIndex++
      })
      exerciseDetail.userAnswer = JSON.stringify(exerciseDetailAnswers)
      return exerciseDetail
    }))
    return this.update<GeneratedTopicExercise>({
      modelName: 'GeneratedTopicExercise',
      data: {
        id: generatedTopicExerciseId,
        submitted: true,
        submittedAt: moment().local().format('YYYY-MM-DD HH:mm:ss'),
        onCloud: AppConfig.CLOUD_SERVER,
        score,
        timeFinish,
        exerciseDetail
      }
    })
  }

  // When user wants to do TopicExercise, a GeneratedTopicExercise meta information is created
  // to store local information about that particular exercise (i.e. random questions)
  // For each user, there's exactly one GeneratedTopicExercise with submitted = false for each
  // TopicExercises
  getGeneratedTopicExercise (userId, topicId): Promise<NCResponse<GeneratedTopicExercise>> {
    return this.readOne<GeneratedTopicExercise>({
      modelName: 'GeneratedTopicExercise',
      searchClause: {
        userId,
        topicId,
        submitted: false,
        onCloud: AppConfig.CLOUD_SERVER
      }
    })
  }

  getStarBadges (userId, topicId) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${topicId} AND userId = ${userId}
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

  getRenderedStarBadges (userId, topicId) {
    return this.getStarBadges(userId, topicId).then(resp => {
      if (resp.status) {
        const stars = resp.data.stars
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/stars.pug'), { stars })
        return { status: true, data: { html, stars } }
      } else {
        return resp
      }
    })
  }

  getCheckmarkBadge (userId, topicId, render = false) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${topicId} AND userId = ${userId} AND score > 80
ORDER BY score DESC LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const isChecked = datas.length > 0
      if (render) {
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ceckmark.pug'), { isChecked })
        return { status: true, data: html }
      } else {
        return { status: true, data: { isChecked } }
      }
    })
  }

  getTimerBadges (userId, topicId) {
    return this.getSequelize().query(`
SELECT score FROM generatedTopicExercises
WHERE submitted = 1 AND topicId = ${topicId} AND userId = ${userId}
AND timeFinish < idealTime AND score = 100
ORDER BY score DESC LIMIT 1;`,
    { type: Sequelize.QueryTypes.SELECT }).then(datas => {
      const timers = datas.reduce((acc, data) => {
        if (parseInt(data.score, 10) >= 80) {
          return acc + 1
        } else {
          return acc
        }
      }, 0)

      return { status: true, data: { timers } }
    })
  }

  getRenderedTimerBadges (userId, topicId) {
    return this.getTimerBadges(userId, topicId).then(resp => {
      if (resp.status) {
        const timers = resp.data.timers
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/timers.pug'), { timers })
        return { status: true, data: html }
      } else {
        return (resp)
      }
    })
  }

    // Get leaderboard data
  getRanking (topicId) {
    return this.getSequelize().query(
`SELECT MIN(timeFinish) AS timeFinish, userId, users.fullName AS fullName, users.grade AS grade, schools.name AS schoolName
FROM generatedTopicExercises INNER JOIN users ON users.id = generatedTopicExercises.userId INNER JOIN schools ON schools.id = users.schoolId
WHERE submitted = TRUE AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL GROUP BY userId ORDER BY MIN(timeFinish) LIMIT 10;`,
    { type: Sequelize.QueryTypes.SELECT }).then(resp => {
      return { status: true, data: resp }
    })
  }

  getLeaderboard (topicId) {
    return this.getRanking(topicId).then(resp => {
      if (resp.status) {
        const exerciseData = resp.data
        const html = pug.renderFile(path.join(__dirname, '../app/views/non-pages/ranking.pug'), { exerciseData })
        return { status: true, data: html }
      } else {
        return resp
      }
    })
  }

  // Get the number of rank in leaderboard
  getCurrentRanking (timeFinish, topicId) {
    return new Promise((resolve, reject) => {
      const queryDB = `SELECT COUNT(*) AS total
FROM (SELECT COUNT(*) FROM generatedTopicExercises
WHERE submitted = TRUE AND timeFinish < ${timeFinish} AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL
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
  getTotalRanking (topicId) {
    return new Promise((resolve, reject) => {
      let queryDB = `SELECT COUNT(*) AS total
FROM (SELECT COUNT(*) FROM generatedTopicExercises WHERE submitted = TRUE AND topicId = ${topicId} AND score = 100 AND timeFinish IS NOT NULL
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

export default new TopicExerciseService()
