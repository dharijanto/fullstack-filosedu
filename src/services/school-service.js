const path = require('path')

const TAG = 'SchoolService'

var AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

class SchoolService extends CRUDService {
  getAll () {
    if (AppConfig.CLOUD_SERVER) {
      return this._models.School.findAll().then(schools => {
        return ({status: true, data: schools})
      })
    } else {
      return this.read({
        modelName: 'School',
        searchClause: {
          identifier: AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
        }})
    }
  }

  deleteById (id) {
    return this._models.School.destroy({
      where: {
        id
      }
    })
  }
}

module.exports = SchoolService
