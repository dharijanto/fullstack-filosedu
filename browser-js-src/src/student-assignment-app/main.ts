let Config = require('../config')
import 'nc-input-library'
import * as toastr from 'toastr'
import axios from 'axios'
import { assertExpressionStatement } from 'babel-types'

let rootPath = require('cmsRootPath')

$(document).ready(function () {
  let userId = null

  let showAllStudents = false
  const ncStudentsSummary = $('#students-summary').NCInputLibrary({
    design: {
      title: 'Students Summary'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'hidden', disabled: false },
        { id: 'name', desc: 'Name', dataTable: true, input: 'hidden', disabled: false },
        { id: 'grade', desc: 'Grade', dataTable: true, input: 'hidden', disabled: false },
        { id: 'points', desc: 'Points', dataTable: true, input: 'hidden', disabled: false },
        { id: 'numOutstandingAssignments', desc: '# Outstanding Assignments', dataTable: true, input: 'hidden' },
        { id: 'numFinishedAssignments', desc: '# Finished Assignments', dataTable: true, input: 'hidden' }
      ],
      conf: {
        order: [['name', 'asc']],
        getURL: () => `/student-assignment/students-summary`,
        onRowClicked: (data: any) => {
          // ncLastSubtopicSubmissions.reloadTable()
          userId = data.id
          ncStudentDetail.reloadTable()
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

  function getTopicIds (): Promise<string[]> {
    // return Promise.resolve([])
    return axios.get('/student-assignment/topic-ids').then(rawResp => {
      const resp = rawResp.data
      if (resp.status && resp.data) {
        return [''].concat(resp.data)
      } else {
        console.error('Failed to retrieve topic-ids: ' + resp.errMessage)
        return []
      }
    })
  }

  function getSubtopicIds (): Promise<Array<string>> {
    // return Promise.resolve([])
    return axios.get('/student-assignment/subtopic-ids').then(rawResp => {
      const resp = rawResp.data
      if (resp.status && resp.data) {
        return [''].concat(resp.data)
      } else {
        console.error('Failed to retrieve subtopic-ids: ' + resp.errMessage)
        return []
      }
    })
  }

  const ncStudentDetail = $('#student-detail').NCInputLibrary({
    design: {
      title: 'Student Detail'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'hidden' },
        { id: 'assignment', desc: 'Assignment', dataTable: true, input: 'hidden' },
        { id: 'type', desc: 'Type', dataTable: true, input: 'hidden' },
        { id: 'due', desc: 'Due Date', dataTable: true, input: 'date', data: { dateFormat: 'YYYY-MM-DD' } },
        { id: 'starsCompleted', desc: 'Stars Completed', dataTable: true, input: 'hidden' },
        { id: 'timersCompleted', desc: 'Timers Completed', dataTable: true, input: 'hidden' },
        { id: 'points', desc: 'Points', dataTable: true, input: 'hidden' },
        { id: 'topic.id', desc: 'Topic Id', dataTable: true, input: 'select', selectData: getTopicIds },
        { id: 'subtopic.id', desc: 'Subtopic Id', dataTable: true, input: 'select', selectData: getSubtopicIds },
        { id: 'createdAt', desc: 'Created At', dataTable: true, input: 'hidden' },
        { id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'hidden' }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `/student-assignment/assignments?userId=${userId}`,
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
      ui: [
        { id: 'add', desc: 'Add', postTo: () => `/student-assignment/assignment?userId=${userId}` },
        { id: 'edit', desc: 'Edit', postTo: () => `/student-assignment/assignment/edit?userId=${userId}` },
        { id: 'delete', desc: 'Delete', postTo: () => `/student-assignment/assignment/delete?userId=${userId}` }
      ]
    }
  })

  ncStudentsSummary.reloadTable()

  const ncStudentSummaryCustomView = $<HTMLInputElement>(
`<div class="row">
  <div class="col-md-12">
    <button id="btn-student-progress" class="btn btn-primary"> View Progress </button>
  </div>
</div
`)

  ncStudentSummaryCustomView.find('#btn-student-progress').on('click', () => {
    window.open(`/student-assignment/badge-page?userId=${userId}`, '_blank')
  })
  ncStudentsSummary.setFirstCustomView(ncStudentSummaryCustomView)
})
