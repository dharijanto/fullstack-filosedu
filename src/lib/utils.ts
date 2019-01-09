import * as moment from 'moment-timezone'
import * as flatToTrees from 'flatToTrees'

// since: SQL date or Javascript Date
export function getElapsedTime (since) {
  return moment().diff(since) / 1000
}

// Convert flat SQL array into Object. Delimiter is "."
// NOTE: flatToTrees always convert sub-child into array, i.e. a.b: 3' into a.b = [3]
// Due to this, we need to manually parse the array into object
export function objectify (flatArray) {
  const result = flatToTrees(flatArray, {
    removeDuplicateLeaves: true
  })

  return result
}
