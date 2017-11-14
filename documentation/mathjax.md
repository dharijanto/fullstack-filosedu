Documentation for Mathjax

Kondisi mathjax saat ini mentok di asynchronous dan synchronous
Mathjax sudah bisa berjalan dari nodejs di lempar ke view dalam bentuk SVG

di bawah ini adalah contoh mathjax :

var mathjax = require('mathjax-node')
mathjax.typeset({
	math: '\\sum_{i=0}^n i^2 = \\frac{(n^2+n)(2n+1)}{6}',
	format: 'TeX',
	svg: true
})

res.locals.mathjax = mathjax

res.locals.mathResultSVG = mathResult.svg
