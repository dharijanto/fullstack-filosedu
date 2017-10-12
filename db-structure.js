const Sequelize = require('sequelize')
  
function addTables (sequelize, models) {
  // models.User = sequelize.define('User', ...)
  models.Course = sequelize.define('course', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    name: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING}
  })

  models.CourseDependency = sequelize.define('courseDependency', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    courseId: {
      type: Sequelize.INTEGER,
      references: {
        model: models.Course,
        key: 'id'
      }
    },
    dependencyId: {
      type: Sequelize.INTEGER,
      references: {
        model: models.Course,
        key: 'id'
      }
    }
  })

  return models
}

module.exports = addTables
