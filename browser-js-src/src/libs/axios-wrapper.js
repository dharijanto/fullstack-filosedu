require('es6-promise').polyfill()
var axios = require('axios')
var Config = require('../config.js')

module.exports = axios.create({
  timeout: Config.NETWORK_TIMEOUT
})
