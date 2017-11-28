var path = require('path')

var _ = require('lodash')
var chai = require('chai')
var expect = chai.expect
var log = require('npmlog')
log.level = 'verbose'
var Sequelize = require('sequelize')
var Promise = require('bluebird')

var AppConfig = require(path.join(__dirname, '../../app-config'))
var createSequelizeModel = require(path.join(__dirname, '../../db-structure'))
var CourseService = require(path.join(__dirname, '../../services/course-service'))

describe('Course Service', function () {
  var sequelize
  var models = {}
  var courseService

  beforeEach(function (done) {
    this.timeout(10000)
    // console.log('Begin initialization....')
    sequelize = new Sequelize(AppConfig.testDbPath, {logging: false})
    models = createSequelizeModel(sequelize, models)
    sequelize.sync({force: true}).then(() => {
      courseService = new CourseService(sequelize, models)
      // console.log('Completed initialization!')
      done()
    })
  })

  afterEach(function () {
    sequelize.close().catch(err => {
      console.error(err)
    })
  })

  function create (id) {
    return courseService.create({
      modelName: 'Subject',
      data: {
        id: `${id}`,
        subject: `Test Subject ${id}`,
        description: `Test Description ${id}`
      }
    })
  }

  function update (id) {
    return courseService.update({
      modelName: 'Subject',
      data: {
        id: `${id}`,
        subject: `Updated Subject ${id}`,
        description: `Updated Description ${id}`
      }
    })
  }

  it('create() should work', function (done) {
    create(1).then(resp => {
      expect(resp.status).to.be.ok
      expect(resp.data.id).to.exist
      expect(resp.data.subject).to.equal('Test Subject 1')
      expect(resp.data.description).to.equal('Test Description 1')
    })
    done()
  })

  it ('parallel create() should work', function (done) {
    Promise.join(
      create(1),
      create(2),
      create(3),
      create(4)).then(results => {
        results.forEach((resp, index) => {
          expect(resp.status).to.be.ok
          expect(resp.data.id).to.exist
          expect(resp.data.subject).to.equal(`Test Subject ${index + 1}`)
          expect(resp.data.description).to.equal(`Test Description ${index + 1}`)
        })
        done()
      })
  })

  it('read() should work', function (done) {
    create(1).then(resp => {
      // Searching by any of this clause should be successful
      const searchClauses = [
        {id: resp.data.id},
        {subject: resp.data.subject},
        {description: resp.data.description}
      ]
      Promise.map(searchClauses, searchClause => {
        return courseService.read({modelName: 'Subject', searchClause})
      }).then(resp2 => {
        expect(resp2.length).to.equal(searchClauses.length)
        resp2.forEach(resp3 => {
          expect(resp3.status).to.be.ok
          expect(resp3.data).to.exist
          expect(resp3.data).to.have.length(1)
          const data = resp3.data[0]
          expect(data.id).to.equal(resp.data.id)
          expect(data.subject).to.equal(resp.data.subject)
          expect(data.description).to.equal(resp.data.description)
        })
        done()
      })
    })
  })

  it('parallel read() should work', function (done) {
    const ids = [1, 2, 3, 4]
    Promise.map(ids, id => create(id)).then(results => {
      expect(results).to.have.length(ids.length)
      Promise.map(ids, id => {
        return courseService.read({modelName: 'Subject', searchClause: {subject: `Test Subject ${id}`}})
      }).then(results => {
        results.forEach((result, index) => {
          expect(result.status).to.be.ok
          expect(result.data).to.have.length(1)
          expect(result.data[0].subject).to.equal(`Test Subject ${index + 1}`)
        })
        done()
      })
    })
  })

  it('update() should work', function (done) {
    create(1).then(resp => {
      const data = resp.data
      courseService.update({modelName: 'Subject',
        data: {
          id: data.id,
          subject: 'Updated Subject',
          description: 'Updated Description'}
      }).then(resp2 => {
        expect(resp2.status).to.be.ok
        courseService.read({modelName: 'Subject', searchClause: {id: resp.data.id}}).then(resp3 => {
          expect(resp3.status).to.be.ok
          expect(resp3.data[0].subject).to.equal('Updated Subject')
          expect(resp3.data[0].description).to.equal('Updated Description')
          done()
        })
      })
    })
  })

  it ('parallel update() should work', function (done) {
    const ids = [1, 2, 3, 4]
    Promise.map(ids, id => create(id)).then(resp => {
      expect(resp).to.have.length(ids.length)
      Promise.map(ids, id => update(id)).then(resp2 => {
        expect(resp2).to.have.length(ids.length)
        ids.map(id => {
          courseService.read({modelName: 'Subject', searchClause: {id}}).then(resp3 => {
            expect(resp3.status).to.be.ok
            expect(resp3.data[0].subject).to.equal(`Updated Subject ${id}`)
            expect(resp3.data[0].description).to.equal(`Updated Description ${id}`)
          })
        })
        done()
      })
    })
  })

  it('delete() should work', function (done) {
    create(1).then(resp => {
      const data = resp.data
      courseService.delete({modelName: 'Subject',
        data: {
          id: data.id
        }
      }).then(resp2 => {
        expect(resp2.status).to.be.ok
        courseService.read({modelName: 'Subject', searchClause: {id: 1}}).then(resp3 => {
          // False mean the data has been deleted.
          expect(resp3.status).to.be.false
          done()
        })
      })
    })
  })

  it ('parallel delete() should work', function (done) {
    const ids = [1, 2, 3, 4]
    Promise.map(ids, id => create(id)).then(resp => {
      expect(resp).to.have.length(ids.length)
      Promise.map(ids, id => {
        return courseService.delete({modelName: 'Subject', data: {id}})
      }).then(results => {
        results.forEach(result => {
          expect(result.status).to.be.ok
        })

        ids.map(id => {
          courseService.read({modelName: 'Subject', searchClause: {id}}).then(resp3 => {
            expect(resp3.status).to.be.false
          })
        })
        done()
      })
    })
  })
})
