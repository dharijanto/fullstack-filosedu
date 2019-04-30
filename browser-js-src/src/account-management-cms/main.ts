import * as $ from 'jquery'
import * as axios from '../libs/axios-wrapper'
import * as Config from '../config'

import 'nc-input-library'

function getSchoolNames () {
  return axios.get(window['rootPath'] + 'school/management/get').then(resp => {
    if (resp.data.status) {
      return resp.data.data.map((data) => {
        return data.name
      })
    } else {
      return resp
    }
  })
}

$(document).ready(function () {
  let selectedSchool: School
  const ncSchool = $('#schools').NCInputLibrary({
    design: {
      title: 'School'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'hidden', disabled: true },
        { id: 'name', desc: 'School Name', dataTable: true, input: 'hidden' },
        { id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'hidden', disabled: true },
        { id: 'createdAt', desc: 'Created At', dataTable: true, input: 'hidden', disabled: true }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: window['rootPath'] + 'account-management/school/get',
        onRowClicked: (data: School) => {
          selectedSchool = data
          ncAccount.reloadTable()
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

  const ncAccount = $('#accounts').NCInputLibrary({
    design: {
      title: 'Account Management'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true },
        { id: 'fullName', desc: 'Full Name', dataTable: true, input: 'text' },
        { id: 'username', desc: 'User Name', dataTable: true, input: 'text', disabled: false },
        { id: 'email', desc: 'E-mail', dataTable: true, input: 'text', disabled: false },
        { id: 'grade', desc: 'Grade', dataTable: true, input: 'select', selectData: () => ['1', '2', '3', '4', '5', '6'] },
        { id: 'updatedAt', desc: 'Last Modified', dataTable: true, input: 'date' },
        { id: 'password', desc: 'Password', dataTable: false, input: 'password' },
        { id: 'passwordConfirm', desc: 'Password Confirm', dataTable: false, input: 'password' },
        { id: 'teacher', desc: 'Teacher', dataTable: true, input: 'select', selectData: () => ['true', 'false'] }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: () => `${window['rootPath']}account-management/user/get?schoolId=${selectedSchool ? selectedSchool.id : 0}`
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
      },
      ui: [
        { id: 'add', desc: 'Add', postTo: () => `${window['rootPath']}account-management/user/add?schoolId=${selectedSchool ? selectedSchool.id : 0}` },
        { id: 'edit', desc: 'Edit', postTo: window['rootPath'] + 'account-management/user/edit' },
        { id: 'delete', desc: 'Delete', postTo: window['rootPath'] + 'account-management/user/delete', confirm: 'Delete user account?' }
      ]
    }
  })

  ncSchool.reloadTable()
})
