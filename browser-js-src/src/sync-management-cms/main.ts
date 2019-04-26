import * as $ from 'jquery'
const Config = require('../config')
const rootPath = require('cmsRootPath')

import 'nc-input-library'

const syncNCInput = $('#local-to-cloud-sync').NCInputLibrary({
  design: {
    title: 'Local-to-Cloud Sync Histories'
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
      getURL: rootPath + 'synchronization/histories'
    }
  },
  buttons: {
    conf: {
      networkTimeout: Config.NETWORK_TIMEOUT
    },
    ui: [
      { id: 'sync', desc: 'Sync', postTo: rootPath + '/synchronization/start' }
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
