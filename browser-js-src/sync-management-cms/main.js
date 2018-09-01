const NCInputLibrary = require('nc-input-library')
const rootPath = require('cmsRootPath')

const syncNCInput = $('#syncManagement').NCInputLibrary({
  design: {
    title: 'Sync Histories',
    panelColor: 'green'
  },
  table: {
    ui: [
      {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
      {id: 'status', desc: 'Status', dataTable: true, input: 'hidden'},
      {id: 'date', desc: 'Sync Date', dataTable: true, input: 'hidden'},
      {id: 'createdAt', desc: 'Created At', dataTable: true, input: 'hidden'},
      {id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'hidden'}
    ],
    conf: {
      orderBy: 'updatedAt',
      orderType: 'DESC',
      getURL: rootPath + 'synchronization/histories'
    }
  },
  buttons: {
    conf: {
      networkTimeOut: 10000
    },
    ui: [
      {id: 'sync', desc: 'Sync', postTo: rootPath + '/synchronization/start' }
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
}, 5000)