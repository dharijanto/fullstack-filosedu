import * as axios from '../libs/axios-wrapper'
import * as toastr from 'toastr'
import * as $ from 'jquery'
let Utils = require('../libs/utils')

function errHandler (err) {
  console.error(err)
  toastr.error('Error: ' + err.message)
}

$(document).ready(() => {
  $('#btn-start-topic').on('click', () => {
    axios.post('/competency-exercise/start-topic').then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        window.location.reload()
      } else {
        toastr.error('Gagal memulai uji kompetensi: ' + resp.errMessage)
        console.error(resp.errMessage)
      }
    }).catch(errHandler)
  })

  $('#btn-abandon-exercise').on('click', () => {
    if (confirm('Semua progres akan hilang. Apakah anda yakin?')) {
      axios.post('/competency-exercise/abandon-exercise').then(rawResp => {
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

  $('#btn-skip-exercise').on('click', () => {
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

  function submit (name, email, phone) {
    axios.post('/competency-exercise/submit', { name, email, phone }).then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        window.location.reload()
      } else {
        console.error(new Error('Failed to submit exercise: ' + resp.errMessage))
        toastr.error('Gagal memproses submission: ' + resp.errMessage)
      }
    }).catch(errHandler)
  }

  $('#btn-contact-us').on('click', () => {
    const name = $('#input-name').val()
    const email = $('#input-email').val()
    const phone = $('#input-phone').val()

    if ((!name && !phone) || (!name && !email)) {
      alert('Nama dan nomor telepon/email harus diisi')
    } else {
      if (email && !Utils.validateEmail(email)) {
        alert('Format email salah')
      }

      submit(name, email, phone)
    }
  })

  $('#btn-dont-contact-us').on('click', () => {
    const name = $('#input-name').val()
    const email = $('#input-email').val()
    const phone = $('#input-phone').val()

    submit(name + ' (do not contact)', email, phone)
  })

  $('#btn-skip-topic').on('click', () => {
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

  $('#btn-retake-exercise').on('click', () => {
    axios.post('/competency-exercise/retake-exercise').then(rawResp => {
      const resp = rawResp.data
      if (resp.status) {
        window.location.reload()
      } else {
        toastr.error('Gagal membatalkan uji kompetensi: ' + resp.errMessage)
        console.error(resp.errMessage)
      }
    }).catch(errHandler)
  })
})
