import 'nc-input-library'
import * as Config from '../config'

require('../nc-image-picker')
let rootPath = require('cmsRootPath')

let school: Partial<School>
$(document).ready(function () {
  let ncSchool = $('#schoolEditor').NCInputLibrary({
    design: {
      title: 'School'
    },
    table: {
      ui: [
        { id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true },
        { id: 'identifier', desc: 'Identifier', dataTable: true, input: 'text', disabled: false },
        { id: 'expirationDate', desc: 'Expiration Date', dataTable: true, type: 'date', input: 'date', data: { dateFormat: 'YYYY-MM-DD' } },
        { id: 'name', desc: 'School Name', dataTable: true, input: 'text' },
        { id: 'logo', desc: 'Logo', dataTable: true, input: 'text' },
        { id: 'address', desc: 'Address', dataTable: true, input: 'text' },
        { id: 'phone', desc: 'Phone', dataTable: true, input: 'text' },
        { id: 'updatedAt', desc: 'Updated At', dataTable: true, input: 'date', disabled: true }
      ],
      conf: {
        order: [['updatedAt', 'desc']],
        getURL: `${rootPath}school/management/get`,
        onRowClicked: (data) => {
          school = data
        }
      }
    },
    buttons: {
      conf: {
        networkTimeout: Config.NETWORK_TIMEOUT
      },
      ui: [
        { id: 'add', desc: 'Add', postTo: `${rootPath}school/management/add` },
        { id: 'edit', desc: 'Edit', postTo: `${rootPath}school/management/edit` },
        { id: 'delete', desc: 'Delete', postTo: `${rootPath}school/management/delete`, confirm: 'Are you sure?' }
      ]
    }
  })

  // WAR: Since nc-image-picker that we're using is a fork of what's on github
  // TODO: We should use what's on GitHub
  const logopicker: any = $('input[name="logo"]')
  logopicker.NCImagePicker({
    callbackFn: (imgSrc) => {
      $('input[name=logo]').val(imgSrc)
    },
    getURL: rootPath + 'school/images/get',
    postURL: rootPath + 'school/images/add',
    deleteURL: rootPath + 'school/images/delete'
  })
  ncSchool.reloadTable()
})
