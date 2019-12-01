import * as $ from 'jquery'
const axios = require('../libs/axios-wrapper')
const Config = require('../config')
const rootPath = require('cmsRootPath')
const toastr = require('toastr')

import 'nc-input-library'

const syncNCInput = $('#local-to-cloud-sync').NCInputLibrary({
  design: {
    title: 'Local-to-Cloud Sync'
  },
  table: {
    ui: [
      { id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true },
      { id: 'status', desc: 'Status', dataTable: true, input: 'hidden' },
      { id: 'date', desc: 'Sync Date (Local-Server Time)', dataTable: true, input: 'hidden' },
      { id: 'createdAt', desc: 'Created At', dataTable: true, input: 'hidden' },
      { id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'hidden' }
    ],
    conf: {
      order: [['updatedAt', 'desc']],
      getURL: rootPath + 'synchronization/local-to-cloud/histories'
    }
  },
  buttons: {
    conf: {
      networkTimeout: Config.NETWORK_TIMEOUT
    },
    ui: [
      { id: 'sync', desc: 'Sync', postTo: rootPath + '/synchronization/local-to-cloud/start' }
    ]
  }
})

const reloadButton = $('<button class="btn btn-primary" id="reload"> Reload</button>')
reloadButton.on('click', () => {
  syncNCInput.reloadTable()
})
syncNCInput.setFirstCustomView(reloadButton)
syncNCInput.reloadTable()

setInterval(() => {
  syncNCInput.reloadTable()
}, 10000)

let cloudToLocalLogTimer
$('#btn-cloud-to-local-sync').on('click', () => {
  const resp = confirm('Have you synced the local data to the cloud? Unsynced data will be gone otherwise!')
  if (resp) {
    // Clear out sync log
    $('#console').val('')
    axios.get(rootPath + '/synchronization/cloud-to-local/start').then(rawResp => {
      const resp = rawResp.data
      if (typeof resp === 'object' && 'status' in resp) {
        console.dir('resp=' + resp)
        if (resp.status) {
          toastr.success('Syncing...')
          if (cloudToLocalLogTimer) {
            clearInterval(cloudToLocalLogTimer)
          }
          // Pull sync logs every 2 seconds
          cloudToLocalLogTimer = setInterval(() => {
            axios.get(rootPath + '/synchronization/cloud-to-local/log').then(rawResp => {
              const resp = rawResp.data
              if (resp.status && resp.data) {
                $('#console').val($('#console').val() + resp.data)
              } else {
                console.error(resp.errMessage)
              }
            })
          }, 2000)
        } else {
          toastr.error('Failed to sync: ' + resp.errMessage)
        }
      } else {
        toastr.error('Failed to sync: unexpected response!')
        console.error('Unexpected response: ' + JSON.stringify(resp))
      }
    }).catch(err => {
      console.error(err)
      toastr.error('Failed to sync: ' + err.message)
    })
  }
})

