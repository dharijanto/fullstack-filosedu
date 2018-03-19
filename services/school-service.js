const path = require('path')

const TAG = 'SchoolService'

var AppConfig = require(path.join(__dirname, '../app-config'))
var CRUDService = require(path.join(__dirname, 'crud-service'))

class SchoolService extends CRUDService {
  getAll () {
    if (AppConfig.CLOUD_SERVER) {
      return this._models.School.findAll().then(schools => {
        return ({status: true, data: schools})
      }).catch(err => {
        return (err)
      })
    } else {
      return {status: true, data: [AppConfig.LOCAL_SCHOOL_INFORMATION]}
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
