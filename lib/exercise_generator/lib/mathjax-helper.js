var mathjax = require('mathjax-node')
// var marked = require('marked')

// mathjax.typeset({
//   math: '\\frac{(n^2+n)(2n+1)}{6}',
//   format: 'TeX',
//   svg: true
//   // html: true
// }).then(data => {
//   console.log(marked(`
// **Equation is:**
// ${data.svg}

// **What is X?**
// `))
// })

module.exports = mathjaxEquation => {
  return new Promise((resolve, reject) => {
    mathjax.typeset({
      math: mathjaxEquation,
      format: 'TeX',
      svg: true
    // html: true
    }).then(result => {
      resolve({status: true, data: {svg: result.svg}})
    }).catch(reject)
  })
}
