var $ = require('jquery')

require('nc-input-library')

var rootPath = require('cmsRootPath')

$(document).ready(function () {
  var ncStats = $('#stats').NCInputLibrary({
    design: {
      title: 'Last 1-Hour Statistics',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'name', desc: 'Name', dataTable: true, input: 'hidden', disabled: false},
        {id: 'submissions', desc: '# Submissions', dataTable: true, input: 'hidden'},
        {id: 'avgTimeliness', desc: 'Avg Timeliness', dataTable: true, input: 'hidden'},
        {id: 'avgScore', desc: 'Avg Score', dataTable: true, input: 'hidden'},
        {id: 'lastSubtopic', desc: 'Last Subtopic', dataTable: true, input: 'hidden'},
        {id: 'userId', desc: 'User ID', dataTable: true, input: 'hidden', disabled: true}
      ],
      conf: {
        order: [['avgTimeliness', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-hour-summary`,
        onRowClicked: (data) => {

        },
        numColumn: 3
      }
    },
    buttons: {
      conf: {
        networkTimeOut: 20000
      },
      ui: [
        {id: 'add', desc: 'Add', postTo: ''},
        {id: 'edit', desc: 'Edit', postTo: ''},
        {id: 'delete', desc: 'Delete', postTo: ''}
      ]
    }
  })
  const reloadBtn = $('<button class="btn btn-primary"> Reload </button>')
  reloadBtn.on('click', () => {
    ncStats.reloadTable()
  })
  ncStats.setFirstCustomView(reloadBtn)
  ncStats.reloadTable()
})


