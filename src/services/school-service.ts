import * as path from 'path'

import * as Promise from 'bluebird'

const TAG = 'SchoolService'

let AppConfig = require(path.join(__dirname, '../app-config'))
import CRUDService from './crud-service-neo'

class SchoolService extends CRUDService {
  getAll () {
    if (AppConfig.CLOUD_SERVER) {
      return super.read<School>({ modelName: 'School', searchClause: {} })
    } else {
      return super.read<School>({ modelName: 'School',
        searchClause: { identifier: AppConfig.LOCAL_SCHOOL_INFORMATION.identifier } })
    }
  }

  getByIdentifier (identifier): Promise<NCResponse<School>> {
    return super.readOne<School>({ modelName: 'School', searchClause: { identifier }})
  }

  deleteById (id): Promise<NCResponse<number>> {
    return super.delete({ modelName: 'School', data: { id } })
  }
}

export default new SchoolService()
