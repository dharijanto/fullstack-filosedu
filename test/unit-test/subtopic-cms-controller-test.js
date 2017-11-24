var path = require('path')

var _ = require('lodash')
var chai = require('chai')
var expect = chai.expect
var log = require('npmlog')
log.level = 'info'
var request = require('supertest')
var Sequelize = require('sequelize')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../../app-config'))
var createSequelizeModel = require(path.join(__dirname, '../../db-structure'))
var CourseService = require(path.join(__dirname, '../../course-service'))
var MainController = require(path.join(__dirname, '../../cms/main-controller'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))

describe('Subtopic Controller', function () {
  var sequelize
  var models = {}
  var app
  const site = {
    hash: 'JustARandomValue'
  }

  beforeEach(function (done) {
    const db = {
      sequelize,
      models
    }

    this.timeout(10000)
    sequelize = new Sequelize(AppConfig.testDbPath, {logging: false})
    createSequelizeModel(sequelize, models)

    sequelize.sync({force: true}).then(() => {
      const mainController = new MainController({site, db, logTag: 'SubtopicController-Test'})
      app = mainController.getRouter()
      courseService = new CourseService(sequelize, models)

      courseService.create({modelName: 'Subject', data: {subject: 'Matematika'}}).then(resp => {
        expect(resp.status).to.be.ok
        courseService.create({modelName: 'Topic', data: {topic: 'Aljabar', topicId: resp.data.id}}).then(resp2 => {
          expect(resp2.status).to.be.ok
          courseService.create({modelName: 'Subtopic', data: {subtopic: 'Mengenal Aljabar', topicId: resp2.data.id}}).then(resp3 => {
            expect(resp3.status).to.be.ok
            done()
          })
        })
      })
    })
  })

  afterEach(function () {
    // Close connection so mocha exits gracefully
    sequelize.close().catch(err => {
      console.error(err)
    })
  })

  it('GET subtopic/[id] should work', function (done) {
    courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp => {
      expect(resp.status).to.be.ok
      const subtopicId = resp.data[0].id
      request(app).get(`/${site.hash}/subtopic/${subtopicId}`).expect(200, function (err) {
        done(err)
      })
    })
  })

  // Update only subtopicData and check if it is updated
  it('POST subtopic/submit/[id] should update subtopic detail', function (done) {
    courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp => {
      expect(resp.status).to.be.ok
      const subtopicId = resp.data[0].id
      request(app).post(`/${site.hash}/subtopic/submit/${subtopicId}`)
        // Write subtopic data
        .send({subtopicData: {
          youtube_url: 'https://www.youtube.com/watch?v=GBu2jofRJtk',
          detail: 'Aljabar adalah....'
        }})
        // .end((err, res) => {
          // done(err)
        // })
        .expect(200, function (err, res) {
          expect(res.body.status, res.body.errMessage).to.be.ok
          courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp2 => {
            expect(resp2.status).to.be.ok
            expect(resp2.data[0]).to.exist
            const subtopicData = JSON.parse(resp2.data[0].data)
            expect(subtopicData).to.have.all.keys(['youtube_url', 'detail'])
            expect(subtopicData.youtube_url).to.equal('https://www.youtube.com/watch?v=GBu2jofRJtk')
            expect(subtopicData.detail).to.equal('Aljabar adalah....')
            done(err)
          })
        })
    })
  })

  // Create only new exercises and check if they are created
  it('POST subtopic/submit/[id] should add new exercises', function (done) {
    courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp => {
      expect(resp.status).to.be.ok
      const subtopicId = resp.data[0].id
      request(app).post(`/${site.hash}/subtopic/submit/${subtopicId}`)
        .send({'new-exercise-1': 'hello this is new exercise 1'})
        .send({'new-exercise-2': 'hello this is new exercise 2'})
        .expect(200, function (err, res) {
          // Status should be true
          expect(res.body.status, res.body.errMessage).to.be.ok
          // newExerciseIds should be returned
          const newExerciseIds = res.body.data.newExerciseIds
          expect(newExerciseIds).to.exist
          expect(Object.keys(newExerciseIds), `IDs: ${newExerciseIds}`).to.have.length(2)
          const exerciseId1 = newExerciseIds['new-exercise-1']
          const exerciseId2 = newExerciseIds['new-exercise-2']
          expect(exerciseId1).to.be.a('number')
          expect(exerciseId2).to.be.a('number')
          courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}).then(resp => {
            expect(resp.status).to.be.ok
            expect(resp.data, `Exercises: ${JSON.stringify(resp.data)}`).to.have.length(2)
            expect(resp.data[0].data).to.equal('hello this is new exercise 1')
            expect(resp.data[1].data).to.equal('hello this is new exercise 2')
            // newExerciseIds should be correct
            expect(resp.data[0].id).to.equal(exerciseId1)
            expect(resp.data[1].id).to.equal(exerciseId2)
            done()
          })
        })
    })
  })

  it('POST subtopic/submit/[id] should update existing exercise', function(done) {
    courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp => {
      const subtopicId = resp.data[0].id
      // Create 2 new exercises
      Promise.join(
        courseService.create({modelName: 'Exercise', data: {data: 'Hello World 1', subtopicId}}),
        courseService.create({modelName: 'Exercise', data: {data: 'Hello World 2', subtopicId}})
      ).spread((resp1, resp2) => {
        expect(resp1.status).to.be.ok
        expect(resp2.status).to.be.ok
        const requestBody = {}
        requestBody[`exercise-${resp1.data.id}`] = 'World Hello 1'
        requestBody[`exercise-${resp2.data.id}`] = 'World Hello 2'
        // Update the 2 exercises
        request(app).post(`/${site.hash}/subtopic/submit/${subtopicId}`)
          .send(requestBody)
          .expect(200, function (err, res) {
            expect(res.body.status).to.be.ok
            expect(res.body.newExerciseIds).to.not.exist
            courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}).then(resp3 => {
              expect(resp3.status).to.be.ok
              expect(resp3.data).to.have.length(2)
              // Check if the update made it
              expect(resp3.data[0].data).to.equal('World Hello 1')
              expect(resp3.data[1].data).to.equal('World Hello 2')
              done()
            })
          })
      })
    })
  })

  it('POST subtopic/submit/[id] should add new and update existing exercises', function (done) {
    courseService.read({modelName: 'Subtopic', searchClause: {subtopic: 'Mengenal Aljabar'}}).then(resp => {
      const subtopicId = resp.data[0].id
      // Create an exercise manually
      courseService.create({modelName: 'Exercise', data: {data: 'Hello World 1', subtopicId}}).then(resp1 => {
        expect(resp1.status).to.be.ok
        const requestBody = {}
        // Create an exercise programmatically
        requestBody['new-exercise'] = 'New Exercise'
        // Update manually created exercise
        requestBody[`exercise-${resp1.data.id}`] = 'Existing Exercise'
        request(app).post(`/${site.hash}/subtopic/submit/${subtopicId}`)
          .send(requestBody)
          .expect(200, function (err, res) {
            // Test that create and update work
            expect(res.body.status).to.be.ok
            const newExerciseIds = res.body.data.newExerciseIds
            expect(newExerciseIds).to.exist
            expect(Object.keys(newExerciseIds)).to.have.length(1)
            expect(newExerciseIds['new-exercise']).to.exist
            courseService.read({modelName: 'Exercise', searchClause: {subtopicId}}).then(resp2 => {
              expect(resp2.status).to.be.true
              expect(resp2.data).to.have.length(2)
              expect(resp2.data[0].data).to.equal('Existing Exercise')
              expect(resp2.data[1].data).to.equal('New Exercise')
              expect(resp2.data[1].id).to.equal(newExerciseIds['new-exercise'])
              done()
            })
          })
      })
    })
  })

})
