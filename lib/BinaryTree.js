class Node {
  constructor (value, left, right) {
    this.value = value
    this.left = left
    this.right = right
  }

  isLeaf () {
    return (this.left == null && this.right == null)
  }
}

module.exports.Node = Node
