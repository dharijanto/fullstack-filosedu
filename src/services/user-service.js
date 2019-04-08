'use strict'

const Sequelize = require('sequelize')
const Promise = Sequelize.Promise
const log = require('npmlog')
const path = require('path')
const Crypto = require(path.join(__dirname, '../lib/utils/crypto'))
const Formatter = require(path.join(__dirname, '../lib/formatter'))

const TAG = 'UserService'
/*
  Invariant:
    This class assumes that the models passed has table User that is
    formated just like one under sites/root/db-structure.js
*/
class UserService {
  constructor (sequelize, models) {
    this._sequelize = sequelize
    this._models = models
    if (this._models.User == null) {
      log.error(TAG, "constructor(): models doesn't have UserAccount defined!")
    }
  }

  login (credential) {
    const username = credential.username
    const pass = credential.password
    const schoolId = credential.schoolId

    return this._models.User.findOne({where: {username, schoolId}}).then(user => {
      if (!user) {
        return {status: false, errMessage: 'Invalid username or password.', errCode: 1}
      } else if (('active' in user) && !user.active) {
        return {
          status: false,
          errMessage: 'Account is not activated yet. Check your email to activate.',
          errCode: 2,
          errData: {
            userId: user.id
          }
        }
      } else {
        const saltedPass = Crypto.saltPass(pass, user.salt)
        if (saltedPass === user.saltedPass) {
          return {status: true, user}
        } else {
          return {status: false, errMessage: 'Invalid username or password.', errCode: 1}
        }
      }
    })
  }

  validateRegistrationCredential (credential, isPasswordOptional = false, isExistingUser = false) {
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
      const errMessages = []
      const data = {}
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

      const whereClause = isExistingUser ? {id: credential.id} : Sequelize.and({username}, {schoolId})
      return this._models.User.findOne({where: whereClause}).then(user => {
        if (isExistingUser && !user) {
          errMessages.push('Username tidak ditemukan')
        } else if (!isExistingUser && user){
          errMessages.push('Username sudah terdaftar')
        }
        if (errMessages.length) {
          resolve({status: false, errMessage: errMessages.join(', ')})
        } else {
          resolve({status: true, data})
        }
      })
    })
  }

  register (credential, active = true) {
    return this.validateRegistrationCredential(credential, false).then(resp => {
      if (resp.status) {
        return this._models.User.create(resp.data).then(user => {
          return {status: true, user}
        })
      } else {
        return resp
      }
    })
  }

  getAll () {
    return this._models.User.findAll({include: [{model: this._models.School}]}).then(users => {
      return ({status: true, data: users})
    }).catch(err => {
      return (err)
    })
  }

  deleteById (id) {
    return this._models.User.destroy({
      where: {
        id
      }
    })
  }

  // TODO: We shouldn't allow edit so that the user
  // have the same username and schoolId as an existing user. Should use SQL composite key
  updateCredential (credential) {
    const isPasswordOptional = !('password' in credential && (credential.password.length > 0))
    return this._models.User.findOne({where: {id: credential.id}}).then(user => {
      if (!user) {
        return { status: false, errMessage: `User with id=${credential.id} is not found!` }
      } else {
        credential.schoolId = user.schoolId
        return this.validateRegistrationCredential(credential, isPasswordOptional, true).then(resp => {
          if (resp.status) {
            return this._models.User.update(resp.data, {where: {id: credential.id}}).then(resp => {
              return {status: true, data: resp}
            }).catch(err => {
              console.error(err)
              if (err.name === 'SequelizeUniqueConstraintError') {
                resolve({status: false, errMessage: err.message})
              } else if (err.name === 'SequelizeForeignKeyConstraintError') {
                resolve({status: false, errMessage: err.message})
              } else {
                throw err
              }
            })
          } else {
            return resp
          }
        })
      }
    })
  }
}

module.exports = UserService
