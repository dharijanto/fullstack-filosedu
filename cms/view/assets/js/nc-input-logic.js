
function onSubjectClicked (data) {
  // console.log('onSubjectClicked(): ' + JSON.stringify(data))
  selectedIds.subject = data.id
  NCInputs.topicNcInput.reloadTable()
}

var selectedTopic = null
function onTopicClicked (data) {
  // console.log('onTopicClicked(): ' + JSON.stringify(data))
  selectedIds.topic = data.id
  NCInputs.subtopicNcInput.reloadTable()
}

var selectedSubtopic = null
function onSubtopicClicked (data) {
  // console.log('onSubtopicClicked(): ' + JSON.stringify(data))
  selectedIds.subtopic = data.id
  // window.location.href = rootPath + 'manageSubtopic/' + data.id
  window.open(rootPath + 'subtopic/' + data.id)
}

var selectedTopicDependency = null
function onTopicDependencyClicked (data) {
  // console.log('onTopicDependencyClicked(): ' + JSON.stringify(data))
  selectedIds.topicDependency = data.id
}

function onTagClicked (data) {
  // console.log('onTagClicked(): ' + JSON.stringify(data))
  NCInputs.tagNcInput.reloadTable()
}
