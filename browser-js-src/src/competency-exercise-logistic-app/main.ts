import * as axios from '../libs/axios-wrapper'
import * as toastr from 'toastr'
import * as $ from 'jquery'

$(document).ready(() => {
  $('#btn-start-exercise').on('click', () => {
    axios.post('/start-competency-exercise').then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        window.location.replace('/uji-kompetensi')
      } else {
        toastr.error('Gagal memulai uji kompetensi: ' + resp.errMessage)
        console.error(resp.errMessage)
      }
    })
  })

  $('#btn-abandon-exercise').on('click', () => {
    if (confirm('Bila dibatalkan, uji kompetensi harus diulang dari awal. Semua progres kamu akan hilang. Apakah kamu yakin?')) {
      axios.post('/abandon-competency-exercise').then(rawResp => {
        const resp = rawResp.data
        if (resp.status) {
          window.location.replace('/abandoned-competency-exercise')
        } else {
          toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage)
          console.error(resp.errMessage)
        }
      })
    }
  })
})
