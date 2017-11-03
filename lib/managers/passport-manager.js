var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy

var log = require('npmlog')
var path = require('path')

const CourseService = require(path.join(__dirname, '../../course-service'))

// Contains all the logic related to passport
class PassportManager {

}

const instance = new PassportManager()
module.exports = instance
