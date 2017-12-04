var mathjax = require('mathjax-node')
var marked = require('marked')
mathjax.typeset({
  math: '\\frac{(n^2+n)(2n+1)}{6}',
  format: 'TeX',
  svg: true
  // html: true
}).then(data => {
  console.log(marked(`
**Equation is:**
${data.svg}

**What is X?**
`))
})
