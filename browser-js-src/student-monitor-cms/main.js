var $ = require('jquery')

var Config = require('../config')
require('nc-input-library')

var rootPath = require('cmsRootPath')

$(document).ready(function () {
  let schoolId
  let userId
  const ncSchool = $('#schools').NCInputLibrary({
    design: {
      title: 'School',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'id', desc: 'ID', dataTable: false, input: 'hidden', disabled: true},
        {id: 'identifier', desc: 'Identifier', dataTable: false, input: 'hidden', disabled: false},
        {id: 'name', desc: 'School Name', dataTable: true, input: 'hidden'},
        {id: 'address', desc: 'Address', dataTable: true, input: 'hidden'},
        {id: 'phone', desc: 'Phone', dataTable: true, input: 'hidden'}
      ],
      conf: {
        orderBy: [['id', 'asc']],
        orderType: 'DESC',
        getURL: `${rootPath}/school/management/get`,
        onRowClicked: (data) => {
          schoolId = data.id
          ncSummary.reloadTable()
        }
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
      },
      ui: []
    }
  })

  let showAllStudents = false
  const ncSummary = $('#summary').NCInputLibrary({
    design: {
      title: 'Last 1-Hour Summary',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'name', desc: 'Name', dataTable: true, input: 'hidden', disabled: false},
        {id: 'submissions', desc: '# Submissions', dataTable: true, input: 'hidden'},
        {id: 'avgTimeliness', desc: 'Avg Timeliness', dataTable: true, input: 'hidden'},
        {id: 'avgScore', desc: 'Avg Score', dataTable: true, input: 'hidden'},
        {id: 'lastTopic', desc: 'Last Topic', dataTable: true, input: 'hidden'},
        {id: 'lastSubtopic', desc: 'Last Subtopic', dataTable: true, input: 'hidden'},
        {id: 'username', desc: 'Username', dataTable: true, input: 'hidden', disabled: false},
        {id: 'userId', desc: 'User ID', dataTable: false, input: 'hidden', disabled: true}
      ],
      conf: {
        order: [['avgTimeliness', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-hour-summary?schoolId=${schoolId}&showAllStudents=${showAllStudents}`,
        onRowClicked: (data) => {
          userId = data.userId
          ncLastSubmissions.reloadTable()
        },
        numColumn: 3
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
      },
      ui: []
    }
  })

  const ncLastSubmissions = $('#last-submissions').NCInputLibrary({
    design: {
      title: 'Last Submissions',
      panelColor: 'green'
    },
    table: {
      ui: [
        {id: 'topic', desc: 'Topic', dataTable: true, input: 'hidden'},
        {id: 'subtopic', desc: 'Subtopic', dataTable: true, input: 'hidden'},
        {id: 'score', desc: 'Score', dataTable: true, input: 'hidden'},
        {id: 'timeliness', desc: 'Timeliness', dataTable: true, input: 'hidden'},
        {id: 'idealTime', desc: 'Ideal Time', dataTable: true, input: 'hidden'},
        {id: 'timeFinish', desc: 'Time Finish', dataTable: true, input: 'hidden'},
        {id: 'updatedAt', desc: 'Last Update', dataTable: true, input: 'hidden'}
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-submissions?userId=${userId}`,
        onRowClicked: (data) => {

        },
        numColumn: 3
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
      },
      ui: []
    }
  })

  ncSchool.reloadTable()
  const summaryTableCustomView = $(
`<div class="row">
  <div class="col-md-12">
    <input id="check-all-students" type="checkbox">All Students<br>
  </div>
  <div class="col-md-12">
    <button id="btn-reload-summary" class="btn btn-primary"> Reload </button>
  </div>
</div
`)
  summaryTableCustomView.find('#check-all-students').on('change', event => {
    const checkbox = event.target
    showAllStudents = checkbox.checked
    ncSummary.reloadTable()
  })
  summaryTableCustomView.find('#btn-reload-summary').on('click', () => {
    ncSummary.reloadTable()
  })
  ncSummary.setFirstCustomView(summaryTableCustomView)
})
