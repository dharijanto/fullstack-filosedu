const Sequelize = require('sequelize')

function addTables (sequelize, models) {
  // models.User = sequelize.define('User', ...)

  models.Subject = sequelize.define('subject', {

  })
  models.Subject = sequelize.define('subject', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    subject: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING}
  })

  models.Topic = sequelize.define('topic', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    topic: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING}
  })
  models.Topic.belongsTo(models.Subject)

  models.Subtopic = sequelize.define('subtopic', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    subtopic: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING},
    data: {type: Sequelize.TEXT('long')}
  })
  models.Subtopic.belongsTo(models.Topic)

  models.Tag = sequelize.define('tag', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    tag: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING}
  })
  models.Tag.belongsTo(models.Topic)

  models.TopicDependency = sequelize.define('topicDependency', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    topicId: {
      type: Sequelize.INTEGER,
      references: {
        model: models.Topic,
        key: 'id'
      }
    },
    dependencyId: {
      type: Sequelize.INTEGER,
      references: {
        model: models.Topic,
        key: 'id'
      }
    }
  })

  models.User = sequelize.define('users', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    username: {type: Sequelize.STRING, unique: true},
    saltedPass: {type: Sequelize.STRING},
    salt: {type: Sequelize.STRING},
    email: {type: Sequelize.STRING, unique: true},
    siteId: {type: Sequelize.INTEGER, defaultValue: -1} // siteId is needed only by App
  })

  models.Exercise = sequelize.define('exercise', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    data: {type: Sequelize.TEXT}
  })
  models.Exercise.belongsTo(models.Subtopic)

  models.GeneratedExercise = sequelize.define('generatedExercise', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    exerciseHash: {type: Sequelize.STRING},
    knowns: {type: Sequelize.TEXT}, // JSON: array of knowns i.e. [{x: 5}, {x: 3}, {x: 7}] (this is answer key)
    unknowns: {type: Sequelize.TEXT}, // JSON: array of unknowns i.e. [{a: 1, b: 3}, {a: 7, b: 3}]
    userAnswer: {type: Sequelize.TEXT}, // JSON: array of knowns i.e. [{x: 5}, {x: 3}, {x: 7}]
    submitted: {type: Sequelize.BOOLEAN, defaultValue: false}, // Whether this generated exercise is complete or not
    score: {type: Sequelize.INTEGER}
  })
  models.GeneratedExercise.belongsTo(models.Exercise)
  models.GeneratedExercise.belongsTo(models.User)

  return models
}

module.exports = addTables
