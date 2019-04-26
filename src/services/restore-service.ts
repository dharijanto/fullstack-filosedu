import * as path from 'path'
import * as zlib from 'zlib'
import Axios from 'axios'

import { spawn, exec } from 'child_process'
import CRUDService from './crud-service-neo'

const AppConfig = require(path.join(__dirname, '../app-config'))
/*
Used by local server to get cloud data backup and restore it locally
*/
class RestoreService extends CRUDService {
  restoreCloudData () {
    const schoolIdentifier = AppConfig.LOCAL_SCHOOL_INFORMATION.identifier
    Axios.post
  }
}

export default new RestoreService()
