import * as axios from '../libs/axios-wrapper'
import * as toastr from 'toastr'
import * as $ from 'jquery'

function errHandler (err) {
  console.error(err)
  toastr.error('Error: ' + err.message)
}

$(document).ready(() => {
  $('#btn-start-exercise').on('click', () => {
    axios.post('/competency-exercise/start').then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        window.location.replace('/competency-exercise')
      } else {
        toastr.error('Gagal memulai uji kompetensi: ' + resp.errMessage)
        console.error(resp.errMessage)
      }
    }).catch(errHandler)
  })

  $('#btn-abandon-exercise').on('click', () => {
    if (confirm('Semua progres akan hilang. Apakah anda yakin?')) {
      axios.post('/competency-exercise/abandon-topic').then(rawResp => {
        const resp = rawResp.data
        if (resp.status) {
          window.location.replace('/competency-exercise/abandoned')
        } else {
          toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage)
          console.error(resp.errMessage)
        }
      }).catch(errHandler)
    }
  })

  $('#btn-skip').on('click', () => {
    if (confirm('Topik ini akan di lewati. Apakah anda yakin?')) {
      axios.post('/competency-exercise/skip-topic').then(rawResp => {
        const resp = rawResp.data
        if (resp.status) {
          window.location.reload()
        } else {
          toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage)
          console.error(resp.errMessage)
        }
      }).catch(errHandler)
    }
  })
})
