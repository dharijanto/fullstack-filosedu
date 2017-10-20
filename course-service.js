class CourseService {
  constructor (sequelize, models) {
    this._sequelize = sequelize
    this._models = models
  }

  create ({modelName, data}) {
    return this._models[modelName].create(data)
  }

  read ({modelName, searchClause}) {
    return this._models[modelName].findAll({where: searchClause})
  }

  update ({modelName, data}) {
    return this._models[modelName].update(data, {where: {id: data.id}})
  }

  delete ({modelName, data}) {
    return this._models[modelName].destroy({where: {id: data.id}})
  }

  getTopicDependencies (courseId, whereClause = null) {
    whereClause = Object.assign({courseId}, whereClause)
    return this._models.TopicDependency.findAll(whereClause).then(dependencies => {
      return this.getCourses({id: dependencies.map(dependency => dependency.topicId)})
    })
  }
}

module.exports = CourseService
