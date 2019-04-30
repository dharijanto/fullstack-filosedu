import * as path from 'path'

import * as Promise from 'bluebird'
import * as moment from 'moment'

const TAG = 'SchoolService'

let AppConfig = require(path.join(__dirname, '../app-config'))
import CRUDService from './crud-service-neo'

class SchoolService extends CRUDService {

  // Check whether the school is already expired
  validateSchool (): Promise<NCResponse<null>> {
    if (!AppConfig.CLOUD_SERVER) {
      return super.readOne<School>({
        modelName: 'School',
        searchClause: { identifier: AppConfig.LOCAL_SCHOOL_INFORMATION.identifier }
      }).then(resp => {
        if (resp.status && resp.data) {
          const now = moment()
          const expirationDate = moment(resp.data.expirationDate)
          if (expirationDate.isAfter(now)) {
            return { status: true }
          } else {
            return { status: false, errMessage: 'Server is already expired! Please contact Filosedu customer support.' }
          }
        } else {
          return { status: false, errMessage: 'Invalid school or expiration date!' }
        }
      })
    } else {
      return Promise.resolve({ status: true })
    }
  }

  getAll () {
    if (AppConfig.CLOUD_SERVER) {
      return super.read<School>({ modelName: 'School', searchClause: {} })
    } else {
      return super.read<School>({ modelName: 'School',
        searchClause: { identifier: AppConfig.LOCAL_SCHOOL_INFORMATION.identifier } })
    }
  }

  getByIdentifier (identifier): Promise<NCResponse<School>> {
    return super.readOne<School>({ modelName: 'School', searchClause: { identifier } })
  }

  addSchool (data: Partial<School>) {
    return super.create({ modelName: 'School', data })
  }

  editSchool (data: Partial<School>) {
    return super.update({ modelName: 'School', data })
  }

  deleteById (id): Promise<NCResponse<number>> {
    return super.delete({ modelName: 'School', data: { id } })
  }
}

export default new SchoolService()
