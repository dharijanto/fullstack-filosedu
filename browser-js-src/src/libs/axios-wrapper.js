require('es6-promise').polyfill()
let axios = require('axios')
let Config = require('../config.js')

module.exports = axios.create({
  timeout: Config.NETWORK_TIMEOUT
})