const path = require('path')

const log = require('npmlog')
const Promise = require('bluebird')
const marked = require('marked')

const BaseController = require(path.join(__dirname, 'base-controller'))
const CourseService = require(path.join(__dirname, '../../services/course-service'))
const ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))
const ImageService = require(path.join(__dirname, '../../services/image-service'))
const VideoService = require(path.join(__dirname, '../../services/video-service'))

const TAG = 'SubtopicController'

class SubtopicController extends BaseController {
  constructor (initData) {
    super(initData)
    const courseService = new CourseService(this.getDb().sequelize, this.getDb().models)
    const videoService = new VideoService(this.getDb().sequelize, this.getDb().models)
    const imageService = new ImageService(this.getDb().sequelize, this.getDb().models)
    this.addInterceptor((req, res, next) => {
      log.verbose(TAG, 'SubtopicController: req.path=' + req.path)
      res.locals.site = req.site
      res.locals.user = req.user
      res.locals.marked = marked
      next()
    })

    // Retrieve information about subtopic
    this.routeGet('/subtopic/:id', (req, res, next) => {
      log.verbose(TAG, 'subtopic/[id]/GET')
      const subtopicId = req.params.id
      return Promise.join(
        courseService.read({modelName: 'Subtopic', searchClause: {id: subtopicId}}),
        courseService.read({modelName: 'Exercise', searchClause: {subtopicId}})).spread((sResp, eResp) => {
          if (sResp.status) {
            res.locals.subtopic = sResp.data[0]
            res.locals.exercises = eResp.data || []
            res.locals.subtopicData = res.locals.subtopic.data ? JSON.parse(res.locals.subtopic.data) : {}
            return courseService.read({modelName: 'Topic', searchClause: {id: res.locals.subtopic.topicId}}).then(tResp => {
              if (tResp.status) {
                res.locals.topic = tResp.data[0]
                res.render('subtopic')
              } else {
                next() // 404 not found
              }
            })
          } else {
            next() // 404 not found
          }
        }).catch(err => {
          next(err)
        })
    })

    // When subtopic is submitted, there 3 informations:
    // 1. Updated subtopic detail: req.body.subtopicData
    // 2. New exercises: req.body.new-exercise-*
    // 3. Updated exercises: req.body.exercise-*
    this.routePost('/subtopic/:id/submit', (req, res, next) => {
      log.verbose(this.getTag(), 'req.body=' + JSON.stringify(req.body))
      const subtopicId = req.params.id
      var reqBodyKeys = Object.keys(req.body || {})
      var newExercises = []
      var existingExercises = []

      // Process exercises
      reqBodyKeys.forEach(key => {
        // New exercise is identified with key new-exercise-[ID]
        if (key.startsWith('new-exercise')) {
          // frontendKey is used to map POST's key to actual question key
          newExercises.push({subtopicId, data: req.body[key], frontendKey: key})
        }
        // Existing exercise is identified with key exercise-[ID]
        if (key.startsWith('exercise-')) {
          const exerciseId = key.split('-')[1]
          existingExercises.push({subtopicId, id: exerciseId, data: req.body[key]})
        }
      })

      const updateSubtopicPromise = courseService.update({modelName: 'Subtopic',
        data: {
          id: subtopicId,
          data: JSON.stringify(req.body.subtopicData)
        }
      })

      const createExercisePromise = Promise.map(newExercises, newExercise => {
        return courseService.create({modelName: 'Exercise', data: newExercise})
      })

      const updateExercisePromises = Promise.map(existingExercises, existingExercise => {
        return courseService.update({modelName: 'Exercise', data: existingExercise})
      })

      log.verbose(this.getTag(), `newExercises = ${JSON.stringify(newExercises)}`)
      log.verbose(this.getTag(), `existingExercises = ${JSON.stringify(existingExercises)}`)

      // Pre-requisite of returning 'status: true'
      // 1. updateSubtopicPromise (resp1) has to succeed
      // 2. createExercisePromise (resp2) and updateExercisePromises (resp3) has to either be null or all succeeded
      //
      // Return: {status: true, data: {newExerciseIds: {new-exercise-3: 5}}}
      // newExerciseIds is used by frontend to map temporary id to real id
      Promise.join(updateSubtopicPromise, createExercisePromise, updateExercisePromises).spread((resp1, resp2, resp3) => {
        if (resp1.status) {
          var data = {newExerciseIds: {}} // newExercises: {frontendKey: exerciseId}, this is used by frontend to map temporary key to actual key
          var success = true
          var errMessage = null
          // If new exercise(s) is added, all of them has to succeed
          if (newExercises.length) {
            success = resp2.reduce((acc, resp, index) => {
              errMessage = resp.status === false ? resp.errMessage : errMessage
              const frontendKey = newExercises[index].frontendKey
              data.newExerciseIds[frontendKey] = resp.data.id
              return acc && resp.status
            }, success)
          }
          // If any exercise(s) is updated, all of them has to succeed
          if (existingExercises.length) {
            success = resp3.reduce((acc, resp) => {
              errMessage = resp.status === false ? resp.errMessage : errMessage
              return acc && resp.status
            }, success)
          }
          // errMessage is one of the returned
          res.send(Object.assign({status: success, data}, errMessage && {errMessage}))
        } else {
          res.send({status: false,
            errMessage: resp1.errMessage})
        }
      })
    })

    this.routePost('/generateExercise', (req, res, next) => {
      var code = req.body.code
      try {
        var exerciseSolver = ExerciseGenerator.getExerciseSolver(code)
        var questions = exerciseSolver.generateQuestions()
        return Promise.map(questions, question => {
          console.log(question)
          return exerciseSolver.formatQuestion(question.knowns).then(formattedQuestion => {
            return {question: formattedQuestion, answer: question.unknowns}
          })
        }).then(data => {
          res.json({status: true, data})
        }).catch(err => {
          res.json({status: false, errMessage: err.message || err})
        })
      } catch (err) {
        res.json({status: false, errMessage: err.message || err})
      }
    })

    // Because uploading videos can take sometime
    function extendTimeout (req, res, next) {
      res.setTimeout(480000)
      next()
    }

    this.routePost('/subtopic/:id/videoUpload', extendTimeout, (req, res, next) => {
      log.verbose(TAG, 'videoUpload.POST(): req.path=' + req.path)
      const subtopicId = req.params.id
      VideoService.getUploadMiddleware()(req, res, err => {
        if (err) {
          res.json({status: false, errMessage: err.message})
        } else {
          return videoService.addVideo(req.file.filename, subtopicId).then(resp => {
            res.json(resp)
          }).catch(err => {
            next(err)
          })
        }
      })
    })

    this.routeGet('/subtopic/:id/video', (req, res, next) => {
      const subtopicId = req.params.id
      videoService.getVideo(subtopicId).then(resp => {
        res.json(resp)
      }).catch(err => {
        next(err)
      })
    })

    this.routeGet('/subtopic/images', (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}`)
      imageService.getImages().then(resp => {
        if (resp.status) {
          resp.data.resources = resp.data.resources.map(data => {
            return {
              url: super.rootifyPath(data.url), // '/hash_url/images/meme.jpg'
              public_id: '/images/' + data.public_id
            }
          })
          return res.json(resp.data)
        } else {
          return res.json({status: false})
        }
      }).catch(err => {
        next(err)
      })
    })

    this.routePost('/subtopic/add', extendTimeout, (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}` )
      ImageService.uploadImageMiddleware()(req, res, err => {
        if (err) {
          res.json({status: false, errMessage: err.message})
        } else {
            res.json({status: true, data: {
              url: super.rootifyPath('/images/' + req.file.filename),
              public_id: '/images/'+req.file.filename,
              originalName: req.file.filename,
              created_at: req.file.filename.split('_')[0]
            }
          })
        }
      })
    })

    this.routeGet('/subtopic/delete', (req, res, next) => {
      log.verbose(TAG, `req.path = ${req.path}` )
      imageService.deleteImage(req.query.publicId).then(resp => {
        res.json(resp)
      })
    })
  }
  getRouter () {
    return this._router
  }
}

module.exports = SubtopicController
