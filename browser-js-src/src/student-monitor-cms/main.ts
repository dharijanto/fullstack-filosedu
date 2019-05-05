let Config = require('../config')
import 'nc-input-library'

let rootPath = require('cmsRootPath')

$(document).ready(function () {
  let schoolId
  let userId
  const ncSchool = $('#schools').NCInputLibrary({
    design: {
      title: 'School'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'hidden', disabled: true },
        { id: 'identifier', desc: 'Identifier', dataTable: false, input: 'hidden', disabled: false },
        { id: 'name', desc: 'School Name', dataTable: true, input: 'hidden' },
        { id: 'address', desc: 'Address', dataTable: true, input: 'hidden' },
        { id: 'phone', desc: 'Phone', dataTable: true, input: 'hidden' }
      ],
      conf: {
        order: [['id', 'asc']],
        getURL: `${rootPath}/student-monitor/schools`,
        onRowClicked: (data: School) => {
          schoolId = data.id
          ncSubtopicSummary.reloadTable()
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
  const ncSubtopicSummary = $('#subtopic-summary').NCInputLibrary({
    design: {
      title: 'Last 1-Hour Summary (Subtopic)'
    },
    table: {
      ui: [
        { id: 'name', desc: 'Name', dataTable: true, input: 'hidden', disabled: false },
        { id: 'submissions', desc: '# Submissions', dataTable: true, input: 'hidden' },
        { id: 'avgTimeliness', desc: 'Avg Timeliness', dataTable: true, input: 'hidden' },
        { id: 'avgScore', desc: 'Avg Score', dataTable: true, input: 'hidden' },
        { id: 'lastTopic', desc: 'Last Topic', dataTable: true, input: 'hidden' },
        { id: 'lastSubtopic', desc: 'Last Subtopic', dataTable: true, input: 'hidden' },
        { id: 'username', desc: 'Username', dataTable: true, input: 'hidden', disabled: false },
        { id: 'userId', desc: 'User ID', dataTable: true, input: 'hidden', disabled: true }
      ],
      conf: {
        order: [['avgTimeliness', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-hour-subtopic-summary?schoolId=${schoolId}&showAllStudents=${showAllStudents}`,
        onRowClicked: (data: any) => {
          userId = data.userId
          ncLastSubtopicSubmissions.reloadTable()
          ncLastTopicSubmissions.reloadTable()
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

  const ncLastSubtopicSubmissions = $('#last-subtopic-submissions').NCInputLibrary({
    design: {
      title: 'Submissions (Subtopic)'
    },
    table: {
      ui: [
        { id: 'topic', desc: 'Topic', dataTable: true, input: 'hidden' },
        { id: 'subtopic', desc: 'Subtopic', dataTable: true, input: 'hidden' },
        { id: 'score', desc: 'Score', dataTable: true, input: 'hidden' },
        { id: 'timeliness', desc: 'Timeliness', dataTable: true, input: 'hidden' },
        { id: 'idealTime', desc: 'Ideal Time', dataTable: true, input: 'hidden' },
        { id: 'timeFinish', desc: 'Time Finish', dataTable: true, input: 'hidden' },
        { id: 'updatedAt', desc: 'Last Update', dataTable: true, input: 'hidden' }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-subtopic-submissions?userId=${userId}`,
        onRowClicked: (data) => {
          return
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

  const ncLastTopicSubmissions = $('#last-topic-submissions').NCInputLibrary({
    design: {
      title: 'Submissions (Subtopic)'
    },
    table: {
      ui: [
        { id: 'topic', desc: 'Topic', dataTable: true, input: 'hidden' },
        { id: 'score', desc: 'Score', dataTable: true, input: 'hidden' },
        { id: 'timeliness', desc: 'Timeliness', dataTable: true, input: 'hidden' },
        { id: 'idealTime', desc: 'Ideal Time', dataTable: true, input: 'hidden' },
        { id: 'timeFinish', desc: 'Time Finish', dataTable: true, input: 'hidden' },
        { id: 'updatedAt', desc: 'Last Update', dataTable: true, input: 'hidden' }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `${rootPath}/student-monitor/last-topic-submissions?userId=${userId}`,
        onRowClicked: (data) => {
          return
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
  const summaryTableCustomView = $<HTMLInputElement>(
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
    ncSubtopicSummary.reloadTable()
  })
  summaryTableCustomView.find('#btn-reload-summary').on('click', () => {
    ncSubtopicSummary.reloadTable()
  })
  ncSubtopicSummary.setFirstCustomView(summaryTableCustomView)
})
