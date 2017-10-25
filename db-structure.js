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
    data: {type: Sequelize.TEXT}
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

  models.Question = sequelize.define('question', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    subtopicId: {type: Sequelize.INTEGER},
    data: {type: Sequelize.TEXT}
  })
  models.Question.belongsTo(models.Subtopic)

  models.Exercise = sequelize.define('exercise', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    userId: {type: Sequelize.INTEGER},
    questionId: {type: Sequelize.INTEGER},
    questionHash: {type: Sequelize.STRING},
    knowns: {type: Sequelize.TEXT},
    unknowns: {type: Sequelize.TEXT}
  })

  return models
}

module.exports = addTables
