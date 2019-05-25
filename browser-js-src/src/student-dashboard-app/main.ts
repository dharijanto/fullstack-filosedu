let Config = require('../config')
import 'nc-input-library'
import * as toastr from 'toastr'

let rootPath = require('cmsRootPath')

$(document).ready(function () {
  let userId

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
        getURL: () => `/student-dashboard/monitor/last-hour-subtopic-summary?showAllStudents=${showAllStudents}`,
        onRowClicked: (data: any) => {
          if (userId && data.userId === userId) {
            window.open(`/student-dashboard/badge-page?userId=${userId}`)
          } else {
            toastr.success('Click the row one more time to open student page')
          }
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
        { id: 'updatedAt', desc: 'Last Update', dataTable: true, type: 'date', input: 'hidden', data: { dateFormat: 'YYYY-MM-DD HH:mm:ss' } }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `/student-dashboard/monitor/last-subtopic-submissions?userId=${userId}`,
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
      title: 'Submissions (Topic)'
    },
    table: {
      ui: [
        { id: 'topic', desc: 'Topic', dataTable: true, input: 'hidden' },
        { id: 'score', desc: 'Score', dataTable: true, input: 'hidden' },
        { id: 'timeliness', desc: 'Timeliness', dataTable: true, input: 'hidden' },
        { id: 'idealTime', desc: 'Ideal Time', dataTable: true, input: 'hidden' },
        { id: 'timeFinish', desc: 'Time Finish', dataTable: true, input: 'hidden' },
        { id: 'updatedAt', desc: 'Last Update', dataTable: true, input: 'hidden', type: 'date', data: { dateFormat: 'YYYY-MM-DD HH:mm:ss' } }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `/student-dashboard/monitor/last-topic-submissions?userId=${userId}`,
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

  const ncNumSubmissionsSince = $('#num-submissions-since').NCInputLibrary({
    design: {
      title: '# Subtopic Submissions'
    },
    table: {
      ui: [
        { id: 'userId', desc: 'userId', dataTable: false, input: 'hidden' },
        { id: 'fullName', desc: 'Name', dataTable: true, input: 'hidden' },
        { id: 'sinceDate', desc: 'Since Date', dataTable: false, input: 'date', type: 'date', data: { dateFormat: 'YYYY-MM-DD' } },
        { id: 'untilDate', desc: 'Until Date', dataTable: false, input: 'date', type: 'date', data: { dateFormat: 'YYYY-MM-DD' } },
        { id: 'numSubmissions', desc: '# Submissions', dataTable: true, input: 'hidden' },
        { id: 'lastUpdate', desc: 'Last Update', dataTable: true, input: 'hidden', type: 'date', data: { dateFormat: 'YYYY-MM-DD HH:mm:ss' } }
      ],
      conf: {
        order: [['lastUpdate', 'desc']],
        getURL: () => `/student-dashboard/monitor/num-submissions-within?sinceDate=${sinceDate}&untilDate=${untilDate}`,
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

  // const dateInput = $(`<input type="text"> </input>`)
  const setButton = $(`<button id="btn-set-date" class="btn btn-primary"> Set Date </button>`)
  let sinceDate = ''
  let untilDate = ''
  setButton.on('click', () => {
    // console.log($(`input[name="sinceDate"]`).val())
    sinceDate = '' + $(`input[name="sinceDate"]`).val()
    untilDate = '' + $(`input[name="untilDate"]`).val()
    ncNumSubmissionsSince.reloadTable()
  })
  ncNumSubmissionsSince.setFirstCustomView(setButton)

  ncSubtopicSummary.reloadTable()
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
