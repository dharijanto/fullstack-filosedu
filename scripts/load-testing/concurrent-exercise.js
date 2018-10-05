const axios = require('axios')
const sleep = require('sleep-promise')
const _ = require('lodash')
const Promise = require('bluebird')

const BASE_URL = 'http://app-filosedu.nusantara-local.com'

const accounts = [
{
  username: 'admin',
  password: 'kelinciloncat2'
}
// ,{
//   username: 'admin2',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin3',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin4',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin5',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin6',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin7',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin8',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin9',
//   password: 'kelinciloncat2'
// }
// ,{
// username: 'admin10',
//   password: 'kelinciloncat2'
// }
]

accounts.forEach(account => {

})

function executeExercise (axiosInstance, iteration, fullURL) {
  return () => {
    console.time(`Iteration=${iteration} successfully load the page!`)
    return axiosInstance.get(fullURL).then(rawResp => {
      console.timeEnd(`Iteration=${iteration} successfully load the page!`)
      const resp = rawResp.data
      console.dir(resp)
      return sleep(3000).then(() => {
        console.time(`Iteration=${iteration} successfully submitted in!`)
        return axiosInstance(fullURL, {
          method: "POST",
          data: {},
          withCredentials: true
        }).then(rawResp => {
          const resp = rawResp.data
          console.timeEnd(`Iteration=${iteration} successfully submitted in!`)
          return sleep(3000)
        })
      })
    })
  }
}

Promise.map(accounts, account => {
  const axiosInstance = axios.create({withCredentials: true})
  console.time(`loginTime-${account.username}`)
  return axiosInstance(`${BASE_URL}/login`, {
    method: "POST",
    data: {
      schoolId: 3,
      username: account.username,
      password: account.password
    },
    withCredentials: true
  }).then(rawResp => {
    // axiosInstance.get(`${BASE_URL}/`, {withCredentialse: true}).then(rawResp => {
    //   const resp = rawResp.data
    //   console.dir(resp)
    // })
    const resp = rawResp.data
    console.timeEnd(`loginTime-${account.username}`)
    console.dir(resp.indexOf('Admin'))
    console.dir(rawResp)
    // // 100 times
    // const promises = _.range(100).map(i => {
    //   const path = '12/penjumlahan/16/penjumlahan-hasil-bilangan-6-10/29/latihan-1'
    //   const fullURL = `${BASE_URL}/${path}`
    //   return executeExercise(axiosInstance, i, fullURL)
    // })

    // promises.reduce((acc, promise) => {
    //   return acc.then(() => {
    //     return promise()
    //   })
    // }, Promise.resolve())
    
  })
}, {
  concurrency: 10
})