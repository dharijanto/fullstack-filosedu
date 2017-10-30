const express = require('express')
const path = require('path')
const log = require('npmlog')

class SubtopicController {
  constructor () {
    this._router = express.Router()
  }
  getRouter () {
    return this._router
  }
}

const instance = new SubtopicController
module.exports = instance
