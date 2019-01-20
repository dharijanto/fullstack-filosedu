import * as moment from 'moment-timezone'
import * as flatToTrees from 'flatToTrees'

// since: SQL date or Javascript Date
export function getElapsedTime (since) {
  // console.dir('since=' + since)
  // console.dir(typeof since)
  // since comes from createdAt, which in turns can have two format: JS Date, or string
  // TODO: Perhaps we should handle this on the service that whatever passed is of date format?
  if (typeof since === 'object') {
    return moment().diff(since) / 1000
  } else {
    const momentSince = moment.tz(since, 'Asia/Jakarta').utc().format('YYYY-MM-DD HH:mm:ss')
    return moment().diff(momentSince) / 1000
  }
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
