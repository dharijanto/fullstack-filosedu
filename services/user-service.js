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

    return this._models.User.findOne({where: {username: username}}).then(user => {
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

  // Quirks: siteId is -1 for CMS registration
  // TODO: Check if username is already taken
  register (credential, active = true) {
    const username = credential.username
    const password = credential.password
    const passwordConfirm = credential.passwordConfirm
    const email = credential.email
    const siteId = credential.siteId
    const fullName = credential.fullName
    return new Promise((resolve, reject) => {
      if (!username || !password || !passwordConfirm || !email) {
        resolve({status: false, errMessage: 'Incomplete credentials!', errCode: 1})
      } else {
        if (password !== passwordConfirm) {
          resolve({status: false, errMessage: 'Passwords do not match', errCode: 2})
        } else if (!Formatter.validateEmail(email)) {
          resolve({status: false, errMessage: 'Invalid email format', errCode: 2})
        } else {
          const activationKey = Crypto.genSaltedPass(username).passwordHash
          const salted = Crypto.genSaltedPass(password)
          const data = {
            username: username,
            active,
            activationKey,
            saltedPass: salted.passwordHash,
            salt: salted.salt,
            email: email,
            fullName: fullName}
          if (siteId) {
            data.siteId = siteId
          }
          this._models.User.findOne({where: Sequelize.or({username}, {email})}).then(user => {
            if (!user) {
              return this._models.User.create(data).then(user => {
                resolve({status: true, user})
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
              resolve({status: false, errMessage: 'Username / Email is already used.', errCode: 3})
            }
          }).catch(err => {
            reject(err)
          })
        }
      }
    })
  }

  getAll () {
    return this._models.User.findAll().then(users => {
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

  updateCredential (credential) {
    const username = credential.username
    const password = credential.password
    const passwordConfirm = credential.passwordConfirm
    const email = credential.email
    const fullName = credential.fullName
    return new Promise((resolve, reject) => {
      // If either password or confirm password is entered, they have to match in order
      // for anything to be updated
      if (password || passwordConfirm) {
        if (!username || !password || !passwordConfirm || !email) {
          resolve({status: false, errMessage: 'Incomplete credentials!', errCode: 1})
        } else {
          if (password !== passwordConfirm) {
            resolve({status: false, errMessage: 'Passwords do not match', errCode: 2})
          } else if (!Formatter.validateEmail(email)) {
            resolve({status: false, errMessage: 'Invalid email format', errCode: 2})
          } else {
            const salted = Crypto.genSaltedPass(password)
            const data = {
              username: username,
              saltedPass: salted.passwordHash,
              salt: salted.salt,
              email: email,
              fullName: fullName}
            return this._models.User.update(data, {where: {id: credential.id}}).then(resp => {
              resolve({status: true, data: resp})
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
          }
        }
      } else {
        const data = {
          username: username,
          email: email,
          fullName: fullName}
        this._models.User.update(data, {where: {id: credential.id}}).then(resp => {
          resolve({status: true, data: resp})
        }).catch(err => {
          console.error(err)
        })
      }
    })
  }
}

module.exports = UserService
