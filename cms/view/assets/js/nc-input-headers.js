function _getModelURL(model) {
  return rootPath + 'get/' + model
}

function getSubjectURL () {
  return _getModelURL('Subject')
}

function getTopicURL () {
  const topicURL = _getModelURL('Topic?subjectId=') + selectedIds.subject
  console.log('topicURL=' + topicURL)
  return topicURL
}

function getTopicDependencyURL () {
  return rootPath + 'getTopicDendency/' + selectedIds.topic
}

function getSubtopicURL () {
  return _getModelURL('Subtopic?topicId=') + selectedIds.topic
}

var postTo = {
  subject: {
    add: function() {
      return rootPath + 'add/Subject'
    },
    edit: function() {
      return rootPath + 'edit/Subject'
    },
    delete: function() {
      return rootPath + 'delete/Subject'
    }
  },
  topic: {
    add: function() {
      const topicAddURL = rootPath + 'add/Topic?subjectId=' + selectedIds.subject
      console.log('topicAddURL=' + topicAddURL)
      return topicAddURL
    },
    edit: function() {
      return rootPath + 'edit/Topic'
    },
    delete: function() {
      return rootPath + 'delete/Topic'
    }
  },
  topicDependency: {
    add: function() {
      return rootPath + 'add/Topic?subjectId=' + selectedIds.topic
    },
    edit: function() {
      return rootPath + 'edit/Topic'
    },
    delete: function() {
      return rootPath + 'delete/Topic'
    }
  },
  subtopic: {
    add: function() {
      return rootPath + 'add/Subtopic?topicId=' + selectedIds.topic
    },
    edit: function() {
      return rootPath + 'edit/Subtopic'
    },
    delete: function() {
      return rootPath + 'delete/Subtopic'
    }
  }
}
const subjectHeader = {
  design: {
    title: 'Subject',
    panelColor: 'green'
  },
  table: {
    ui: [
      {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
      {id: 'subject', desc: 'Subject', dataTable: true, input: 'text', disabled: false},
      {id: 'lastModified', desc: 'Last Modified', dataTable: true, input: 'date'},
      {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'}
    ],
    conf: {
      orderBy: 'lastModified',
      getURL: getSubjectURL,
      onRowClicked: onSubjectClicked
    }
  },
  buttons: {
    ui: [
      {id: 'add', desc: 'Add', postTo: postTo.subject.add},
      {id: 'edit', desc: 'Edit', postTo: postTo.subject.edit},
      {id: 'delete', desc: 'Delete', postTo: postTo.subject.delete}
    ]
  }
}

const topicHeader = {
  design: {
    title: 'Topic'
  },
  table: {
    ui: [
      {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
      {id: 'topic', desc: 'Topic', dataTable: true, input: 'text', disabled: false},
      {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
      {id: 'lastModified', desc: 'Last Modified', dataTable: true, input: 'date'}
    ],
    conf: {
      orderBy: 'lastModified',
      getURL: getTopicURL,
      onRowClicked: onTopicClicked
    }
  },
  buttons: {
    ui: [
      {id: 'add', desc: 'Add', postTo: postTo.topic.add},
      {id: 'edit', desc: 'Edit', postTo: postTo.topic.edit},
      {id: 'delete', desc: 'Delete', postTo: postTo.topic.delete}
    ]
  }
}

const topicDependencyHeader = {
  design: {
    title: 'Topic Dependency'
  },
  table: {
    ui: [
      {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
      {id: 'topicDependency', desc: 'Topic Dependency', dataTable: true, input: 'text', disabled: false},
      {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
      {id: 'lastModified', desc: 'Last Modified', dataTable: true, input: 'date'}
    ],
    conf: {
      orderBy: 'lastModified',
      getURL: getTopicDependencyURL,
      onRowClicked: onTopicClicked
    }
  },
  buttons: {
    ui: [
      {id: 'add', desc: 'Add', postTo: postTo.topicDependency.add},
      {id: 'edit', desc: 'Edit', postTo: postTo.topicDependency.edit},
      {id: 'delete', desc: 'Delete', postTo: postTo.topicDependency.delete}
    ]
  }
}

const subtopicHeader = {
  design: {
    title: 'Subtopic'
  },
  table: {
    ui: [
      {id: 'id', desc: 'ID', dataTable: true, input: 'text', disabled: true},
      {id: 'subtopic', desc: 'Subtopic', dataTable: true, input: 'text', disabled: false},
      {id: 'description', desc: 'Description', dataTable: true, input: 'textArea'},
      {id: 'lastModified', desc: 'Last Modified', dataTable: true, input: 'date'}
    ],
    conf: {
      orderBy: 'lastModified',
      getURL: getSubtopicURL,
      onRowClicked: onSubtopicClicked
    }
  },
  buttons: {
    ui: [
      {id: 'add', desc: 'Add', postTo: postTo.subtopic.add},
      {id: 'edit', desc: 'Edit', postTo: postTo.subtopic.edit},
      {id: 'delete', desc: 'Delete', postTo: postTo.subtopic.delete}
    ]
  }
}