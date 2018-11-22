var mathjax = require('mathjax-node')
var Promise = require('bluebird')

module.exports = mathjaxEquation => {
  return new Promise((resolve, reject) => {
    mathjax.typeset({
      math: mathjaxEquation,
      format: 'TeX',
      svg: true
    }).then(result => {
      resolve({status: true, data: {svg: result.svg}})
    }).catch(err => {
      reject(err)
    })
  })
}
