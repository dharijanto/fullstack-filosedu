import * as path from 'path'

import * as Promise from 'bluebird'
import * as log from 'npmlog'
import * as Sequelize from 'sequelize'

const Crypto = require(path.join(__dirname, '../lib/utils/crypto'))
const Formatter = require(path.join(__dirname, '../lib/formatter'))

import CRUDService from './crud-service-neo'

const TAG = 'UserService'
/*
  Invariant:
    This class assumes that the models passed has table User that is
    formated just like one under sites/root/db-structure.js
*/
class UserService extends CRUDService {

  login (credential): Promise<NCResponse<User>> {
    const username = credential.username
    const pass = credential.password
    const schoolId = credential.schoolId

    return super.readOne<User>({ modelName: 'User', searchClause: { username, schoolId } }).then(resp => {
      if (resp.status && resp.data) {
        const user = resp.data
        const saltedPass = Crypto.saltPass(pass, user.salt)
        if (saltedPass === user.saltedPass) {
          return { status: true, data: user }
        } else {
          return { status: false, errMessage: 'Invalid username or password!', errCode: 1 }
        }
      } else {
        return { status: false, errMessage: 'Invalid username or password.', errCode: 1 }
      }

    })
  }

  validateRegistrationCredential (credential, isPasswordOptional = false, isExistingUser = false): Promise<NCResponse<Partial<User>>> {
    const username = credential.username
    const password = credential.password
    const passwordConfirm = credential.passwordConfirm
    const email = credential.email
    const fullName = credential.fullName
    const schoolId = credential.schoolId
    const grade = credential.grade
    const teacher = credential.teacher

    log.verbose(TAG, 'validateRegistrationCredential(): credential=' + JSON.stringify(credential))
    // If either password or confirm password is entered, they have to match in order
    // for anything to be updated
    return new Promise((resolve, reject) => {
      const errMessages: string[] = []
      const data: Partial<User> = {}
      if (!Formatter.validateUsername(username)) {
        errMessages.push('Username harus dimulai dengan huruf antara 5-16 karakter')
      } else {
        data.username = username.toLowerCase()
      }

      if (!isPasswordOptional) {
        if (password !== passwordConfirm) {
          errMessages.push('Password tidak sama!')
        } else if (password.length < 4) {
          errMessages.push('Password minimal 4 karakter!')
        } else {
          const salted = Crypto.genSaltedPass(password)
          data.saltedPass = salted.passwordHash
          data.salt = salted.salt
        }
      }

      if (email) {
        if (!Formatter.validateEmail(email)) {
          errMessages.push('Format email salah')
        } else {
          data.email = email
        }
      }

      if (!fullName) {
        errMessages.push('Nama lengkap harus diisi')
      } else {
        data.fullName = fullName
      }

      if (!schoolId) {
        errMessages.push('Sekolah harus dipilih')
      } else {
        data.schoolId = schoolId
      }

      if (!grade) {
        errMessages.push('Kelas harus dipilih')
      } else {
        data.grade = grade
      }

      // If it's not defined, we dont wanna change it
      if (teacher !== undefined) {
        data.teacher = teacher
      }

      const searchClause = isExistingUser ? { id: credential.id } : { [Sequelize.Op.and]: { username, schoolId } }

      super.readOne({ modelName: 'User', searchClause }).then(resp => {
        if (resp.status && resp.data) {
          if (!isExistingUser) {
            errMessages.push('Username sudah terdaftar')
          }
        } else {
          if (isExistingUser) {
            errMessages.push('Username tidak ditemukan')
          }
        }
        if (errMessages.length) {
          resolve({ status: false, errMessage: errMessages.join(', ') })
        } else {
          resolve({ status: true, data })
        }
      }).catch(err => {
        reject(err)
      })
    })
  }

  register (credential, active = true): Promise<NCResponse<Partial<User>>> {
    return this.validateRegistrationCredential(credential, false).then(resp => {
      if (resp.status && resp.data) {
        return super.create({ modelName: 'User', data: resp.data }).then(resp2 => {
          if (resp2.status && resp.data) {
            return { status: true, data: resp2.data }
          } else {
            return { status: false, errMessage: resp2.errMessage }
          }
        })
      } else {
        return { status: false, errMessage: resp.errMessage }
      }
    })
  }

  getUsers (schoolId: number): Promise<NCResponse<User[]>> {
    if (schoolId) {
      return super.read<User>({ modelName: 'User', searchClause: { schoolId } })
    } else {
      return Promise.resolve({ status: false, errMessage: 'schoolId is required!' })
    }
  }

  deleteById (id) {
    return super.getModels('User').destroy({
      where: {
        id
      }
    })
  }

  // TODO: We shouldn't allow edit so that the user
  // have the same username and schoolId as an existing user. Should use SQL composite key
  updateCredential (credential): Promise<NCResponse<null>> {
    const isPasswordOptional = !('password' in credential && (credential.password.length > 0))
    return super.getModels('User').findOne({ where: { id: credential.id } }).then(user => {
      if (!user) {
        return { status: false, errMessage: `User with id=${credential.id} is not found!` }
      } else {
        credential.schoolId = user.schoolId
        return this.validateRegistrationCredential(credential, isPasswordOptional, true).then(resp => {
          if (resp.status && resp.data) {
            return super.getModels('User').update(resp.data, { where: { id: credential.id } }).spread(count => {
              return { status: true, data: null } as NCResponse<null>
            }).catch(err => {
              if (err.name === 'SequelizeUniqueConstraintError') {
                return { status: false, errMessage: err.message }
              } else if (err.name === 'SequelizeForeignKeyConstraintError') {
                return { status: false, errMessage: err.message }
              } else {
                throw err
              }
            })
          } else {
            return { status: false, errMessage: resp.errMessage }
          }
        })
      }
    })
  }
}

export default new UserService()
