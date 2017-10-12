const path = require('path')
const BaseController = require(path.join(__dirname, 'base-controller'))
const log = require('npmlog')

const TAG = 'FiloseduAppController'
class Controller extends BaseController {
  constructor (initData) {
    super(__dirname, initData, true)

    this.getRouter().get('/', (req, res, next) => {
      res.send('Hello!')
    })
  }
}

module.exports = Controller
