function getRandomInt (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min)) + min
}

function getRandomIntInclusive (min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  // The maximum is inclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function gcd (a, b) {
  if (!b) {
    return a
  }
  return gcd(b, a % b)
}


class Frac {
  constructor (num, denom) {
    this.num = num
    this.denom = denom
  }

  add (otherFrac) {
    const num = this.num * otherFrac.denom + otherFrac.num * this.denom
    const denom = this.denom * otherFrac.denom
    return new Frac(num, denom)
  }

  subtract (otherFrac) {
    return this.add(new Frac(-otherFrac.num, otherFrac.denom))
  }

  multiply (otherFrac) {
    return new Frac(this.num * otherFrac.num, this.denom * otherFrac.denom)
  }

  divide (otherFrac) {
    return new Frac(this.num * otherFrac.denom, this.denom * otherFrac.num)
  }

  simplify () {
    const gcd1 = gcd(this.num, this.denom)
    return new Frac(this.num / gcd1, this.denom / gcd1)
  }

  isEqual (otherFrac) {
    const simplifiedSelf = this.simplify()
    const simplifiedOther = otherFrac.simplify()

    return simplifiedSelf.num === simplifiedOther.num && simplifiedSelf.denom === simplifiedOther.denom
  }

  static fromMixedFrac (val, num, denom) {
    return new Frac(denom * val + num, denom)
  }

  static fromVal (num, denom) {
    return new Frac(num, denom)
  }
}

class Decimal {
  static isEqual (a, b) {
    return Math.abs(a - b) <= Number.EPSILON
  }
}


module.exports = {
  getRandomInt,
  getRandomIntInclusive,
  gcd,
  Frac,
  Decimal
}
