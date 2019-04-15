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

  isEqual (otherFrac) {
    const gcd1 = gcd(this.num, this.denom)
    const gcd2 = gcd(otherFrac.num, otherFrac.denom)

    return this.num / gcd1 === otherFrac.num / gcd2 && this.denom / gcd1 === otherFrac.denom / gcd2
  }

  static fromMixedFrac (val, num, denom) {
    return new Frac(denom * val + num, denom)
  }

  static fromVal (num, denom) {
    return new Frac(num, denom)
  }
}


module.exports = {
  getRandomInt,
  getRandomIntInclusive,
  gcd,
  Frac
}
