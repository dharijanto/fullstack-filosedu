const Sequelize = require('sequelize')

function addTables (sequelize, models) {
  // models.User = sequelize.define('User', ...)

  models.Subject = sequelize.define('subject', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    subject: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING}
  })

  models.Topic = sequelize.define('topic', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    topic: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING},
    topicNo: {type: Sequelize.INTEGER}
  })
  models.Topic.belongsTo(models.Subject)

  models.Subtopic = sequelize.define('subtopics', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    subtopic: {type: Sequelize.STRING, unique: true},
    description: {type: Sequelize.STRING},
    data: {type: Sequelize.TEXT('long')},
    subtopicNo: {type: Sequelize.INTEGER}
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
      },
      unique: 'compositeIndex'
    },
    dependencyId: {
      type: Sequelize.INTEGER,
      references: {
        model: models.Topic,
        key: 'id'
      },
      unique: 'compositeIndex'
    },
    description: Sequelize.STRING
  })

  models.School = sequelize.define('schools', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    identifier: {type: Sequelize.STRING, unique: true},
    name: {type: Sequelize.TEXT},
    address: {type: Sequelize.TEXT},
    phone: {type: Sequelize.STRING},
    logo: {type: Sequelize.TEXT}
  })

  models.User = sequelize.define('users', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    username: {type: Sequelize.STRING}, // The pair of (username, schoolId) should be unique, we should use MySQL composite key for this
    saltedPass: {type: Sequelize.STRING},
    salt: {type: Sequelize.STRING},
    email: {type: Sequelize.STRING},
    fullName: {type: Sequelize.STRING},
    grade: {type: Sequelize.STRING}
  })
  models.User.belongsTo(models.School)

  models.Exercise = sequelize.define('exercises', {
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
    submittedAt: {type: Sequelize.DATE},
    score: {type: Sequelize.FLOAT},
    timeFinish: {type: Sequelize.FLOAT},
    idealTime: {type: Sequelize.FLOAT},
    onCloud: {type: Sequelize.BOOLEAN, defaultValue: true}
  })
  models.GeneratedExercise.belongsTo(models.Exercise)
  models.GeneratedExercise.belongsTo(models.User)

  // Locally hosted videos
  models.Videos = sequelize.define('videos', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    filename: {type: Sequelize.STRING, unique: true},
    sourceLink: {type: Sequelize.TEXT}
  })
  models.Videos.belongsTo(models.Subtopic)

  models.WatchedVideo = sequelize.define('watchedVideos', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    date: {type: Sequelize.DATE, defaultValue: sequelize.fn('NOW')},
    onCloud: {type: Sequelize.BOOLEAN, defaultValue: true}
  })
  models.WatchedVideo.belongsTo(models.Videos)
  models.WatchedVideo.belongsTo(models.User)

  models.Images = sequelize.define('images', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    filename: {type: Sequelize.STRING, unique: true},
    sourceLink: {type: Sequelize.TEXT}
  })

  models.Analytics = sequelize.define('analytics', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    type: {type: Sequelize.Sequelize.ENUM(['video', 'exercise'])},
    key: {type: Sequelize.STRING},
    value: {type: Sequelize.INTEGER},
    userId: Sequelize.INTEGER,
    videoId: Sequelize.INTEGER,
    exerciseId: Sequelize.INTEGER,
    onCloud: {type: Sequelize.BOOLEAN, defaultValue: true}
  })

  models.GeneratedTopicExercise = sequelize.define('generatedTopicExercises', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    submitted: {type: Sequelize.BOOLEAN, defaultValue: false},
    submittedAt: {type: Sequelize.DATE},
    score: {type: Sequelize.FLOAT},
    timeFinish: {type: Sequelize.FLOAT},
    topicExerciseHash: {type: Sequelize.STRING},
    exerciseDetail: {type: Sequelize.TEXT},
    idealTime: {type: Sequelize.FLOAT},
    onCloud: {type: Sequelize.BOOLEAN, defaultValue: true}
  })
  models.GeneratedTopicExercise.belongsTo(models.Topic)
  models.GeneratedTopicExercise.belongsTo(models.User)

  models.Synchronization = sequelize.define('synchronization', {
    schoolIdentifier: {type: Sequelize.STRING}, // Identify which school
    serverHash: {type: Sequelize.STRING}, // Identify which version of school server
    localId: {type: Sequelize.INTEGER},
    cloudId: {type: Sequelize.INTEGER},
    tableName: {type: Sequelize.STRING}
  })

  models.SyncHistory = sequelize.define('syncHistories', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    schoolIdentifier: {type: Sequelize.STRING},
    status: {type: Sequelize.ENUM(['Syncing', 'Success', 'Failed'])},
    // Date of last synchronization. Intentionally STRING type instead of DATE
    // because we're storing local server's date, not ours. And to avoid confusion
    // with timezone conversion, STRING is way easier to work with in this case
    date: {type: Sequelize.STRING}
  })

  // Information that belongs only to local server and never synced to cloud.
  // When we sync from cloud to local, we essentially do mysql dump and then
  // restore it on the local server, hence this table is empty again on a newly synced local.
  /*
    Currently this is used to store:
    {
      key: 'SERVER_HASH'
      value: [hash_value]
    }
  */
  models.LocalMetaData = sequelize.define('localMetaData', {
    id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
    key: {type: Sequelize.STRING, unique: true},
    value: {type: Sequelize.STRING}
  })

  return models
}

module.exports = addTables
