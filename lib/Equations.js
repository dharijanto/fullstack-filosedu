const math = require('mathjs')
const BT = require('./BinaryTree')

/*
TODO:
1. Add formatting library: toFormattedString()
*/

class Equation {
  constructor (data, resolveType) {
    this._data = data
    this.resolveType = resolveType
    this._validate()
  }

  _validate () {
    this._unimplemented()
  }

  resolve () {
    this._unimplemented()
  }

  getBuildingEquations () {
    // Primitive returns itself
    return this
  }

  toString () {
    this._unimplemented()
  }

  // Whether the equation is primitive
  isPrimitive () {
    return true
  }

  _unimplemented () {
    throw new Error('Not implemented!')
  }
}

// new Sum({eq1: new Real(7), eq2: new Fraction(8)}, Fraction)
class Sum extends Equation {
  _validate () {
    if (Object.keys(this._data).length !== 2) {
      throw new Error('Sum should consists of 2 equations')
    }
    if (!('eq1' in this._data) || !('eq2' in this._data)) {
      throw new Error("Sum should have 'eq1' and 'eq2'!")
    }
  }

  getBuildingEquations () {
    return new BT.Node(null, this._data.left, this._data.right)
  }

  isPrimitive () {
    return false
  }

  resolve () {
    var eq1 = this._data.eq1
    var eq2 = this._data.eq2

    if (eq1.constructor.name === Real.name && eq2.constructor.name === Real.name) {
      console.log('1')
      return (new Real(eq1.getValue() + eq2.getValue())).resolve()
    } else if (eq1.constructor.name === Fraction.name && eq2.constructor.name === Fraction.name) {
      console.log('2')
      return (new Fraction({
        num: (eq1.getNum() * eq2.getDenom()) + (eq2.getNum() * eq1.getDenom()),
        denom: eq1.getDenom() * eq2.getDenom()})).resolve(Real.name)
    } else if (eq1.constructor.name === Fraction.name && eq2.constructor.name === Real.name) {
      console.log('3')
      eq2 = new Fraction({num: eq2.getValue(), denom: 1})
      return (new Sum(eq1, eq2)).resolve()
    } else if (eq1.constructor.name === Real.name && eq2.constructor.name === Fraction.name) {
      console.log('4')
      return (new Sum(eq2, eq1)).resolve()
    }
  }
}

// new Real(5)
class Real extends Equation {
  _validate () {
    if (typeof this._data !== 'number') {
      throw new Error('Real should consist of an integer')
    }
    // TODO: Ensure data is really real number, because 'number' can be float or integer
  }

  getValue () {
    return this._data
  }

  toString () {
    return '' + this._data
  }

  resolve () {
    return this._data
  }
}

class Fraction extends Equation {
  _validate () {
    if (Object.keys(this._data).length !== 2) {
      throw new Error('Sum should consist of 2 members')
    }
    if (!('num' in this._data) || !('denom' in this._data)) {
      throw new Error("Fraction should consist of 'num' and 'denom'")
    }
  }

  getNum () {
    return this._data.num
  }

  getDenom () {
    return this._data.denom
  }

  toString () {
    return '(' + this._data.num + '/' + this._data.denom + ')'
  }

  resolve (type) {
    if (type && type.name === Real.name) {
      return new Real(this._data.num / this._data.denom)
    } else {
      return this
    }
  }

  simplify () {
    const gcd = math.gcd(this._data.num, this._data.denom)
    return new Fraction({num: this._data.num / gcd, denom: this._data.denom / gcd})
  }
}

module.exports.Equation = Equation
module.exports.Sum = Sum
module.exports.Real = Real
module.exports.Fraction = Fraction