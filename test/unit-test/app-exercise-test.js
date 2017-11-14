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
var MainController = require(path.join(__dirname, '../../app/main-controller'))
var ExerciseGenerator = require(path.join(__dirname, '../../lib/exercise_generator/exercise-generator'))

describe('Subtopic Controller', function () {
  var sequelize
  var models = {}
  var app
  const site = {
    hash: 'JustARandomValue'
  }
  var Cookies

  beforeEach(function (done) {
    const db = {
      sequelize,
      models
    }

    this.timeout(10000)
    sequelize = new Sequelize(AppConfig.testDbPath, {logging: false})
    createSequelizeModel(sequelize, models)

    sequelize.sync({force: true}).then(() => {
      const mainController = new MainController({site, db, logTag: 'AppExercise-Test'})
      app = mainController.getRouter()
      courseService = new CourseService(sequelize, models)

      courseService.create({modelName: 'Subject', data: {subject: 'Matematika'}}).then(resp => {
        expect(resp.status).to.be.ok
        courseService.create({modelName: 'Topic', data: {topic: 'Aljabar', topicId: resp.data.id}}).then(resp2 => {
          expect(resp2.status).to.be.ok
          courseService.create({modelName: 'Subtopic', data: {subtopic: 'Mengenal Aljabar', topicId: resp2.data.id}}).then(resp3 => {
            expect(resp3.status).to.be.ok
            courseService.create({modelName: 'Exercise', data: {data: '/* Generate the question of format: 5x + 5 = 20 General form: ax + b = c */ var _ = require("lodash") // var MathHelper = require("./math-helper") const knowns = ["a", "b", "c"] const unknowns = ["x"] const randomGeneratorFn = () => { const result = {knowns: {}, unknowns: {}} // x = (c - b) / a result.unknowns.x = _.random(5, 15) // a = random result.knowns.a = _.random(2, 10) // (c - b) = x * a const c_min_b = result.knowns.a * result.unknowns.x // c = random < c_min_b result.knowns.c = _.random(1, c_min_b) // b = -1 * ( (c - b) - c) result.knowns.b = -1 * (c_min_b - result.knowns.c) return result } // param1: knowns // param2: unknowns const isAnswerFn = ({a, b, c}, {x}) => { return parseFloat(x) === (c - b) / a } // Describe how the question will be printed const printFn = ({a, b, c}) => { var plusOrMinus = val => val >= 0 ? "+" : "-" return _.sample([`${a}x ${plusOrMinus(b)} ${Math.abs(b)} = ${c}`]) } // In addition to exact matches, this describe the other matches // unknowns1 = {a, b} // unknowns2 = {a, b} const isEqualFn = (unknowns1, unknowns2) => { // For this example, exact match is the only match return _.isEqual(unknowns1, unknowns2) } module.exports = { name: "Pengenalan Aljabar", quantity: 20, // The number of questions to be generated solver: { type: "bruteforce_solver", // The questions are generated using bruteforce randomGeneratorFn, // "bruteforce_solver" uses random generator to generate each of the variables isEqualFn, // Return true if 2 equations are the same timeout: 1000 // Maximum time to generate all of the questions }, knowns, // "Given" variables unknowns, // "Question" variables isAnswerFn, // Return true if the combination of "knowns" and "unknowns" solve the problem printFn // Print the question }', subtopicId: resp3.data.id}}).then(resp4 => {
                expect(resp4.status).to.be.ok
                done()
            })
          })
        })
      })
    })
  })

  // it('should login form', function(done) {
  //   var agent = request.agent(app);

  //   agent
  //     .post('/submitlogin')
  //     .type('form')
  //     .send({ email: 'email' })
  //     .send({ password: 'password' })
  //     .expect(302)
  //     .expect('Location', '/')
  //     .expect('set-cookie', /connect.sid/)
  //     .end(function(err, res) {
  //       if (err) return done(err);
  //       agent.saveCookies(res);
  //       return done();
  //     });
  // });


  // it('should create user session for valid user', function (done) {
  //   request(app)
  //     .post('/login')
  //     .set('Accept','application/json')
  //     .send({"email": "user_test@example.com", "password": "123"})
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       expect(res.body.id).to.equal('1');
  //       expect(res.body.short_name).to.equal('Test user');
  //       expect(res.body.email).to.equal('user_test@example.com');
  //       // Save the cookie to use it later to retrieve the session
  //       Cookies = res.headers['set-cookie'].pop().split(';')[0];
  //       done();
  //     });
  // });

  // it('should get user session for current user', function (done) {
  //   var req = request(app).get('/login');
  //   // Set cookie to get saved user session
  //   req.cookies = Cookies;
  //   req.set('Accept','application/json')
  //     .expect('Content-Type', /json/)
  //     .expect(200)
  //     .end(function (err, res) {
  //       expect(res.body.id).to.equal('1');
  //       expect(res.body.short_name).to.equal('Test user');
  //       expect(res.body.email).to.equal('user_test@example.com');
  //       done();
  //     });
  // });

  it('GET /generateExercise should produce some of question', function (done) {
    done()
  })
})