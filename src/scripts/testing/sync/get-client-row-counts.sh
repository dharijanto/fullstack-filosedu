SQL_USERNAME='-uroot'
SQL_PASSWORD=''
DB_NAME='app_filosedu'
SCHOOL_ID='3'

function executeSql() {
  mysql $SQL_USERNAME $SQL_PASSWORD $DB_NAME -e "$@"
}

echo "LOCAL"
executeSql "SELECT COUNT(*) as generatedExercisesCount FROM generatedExercises WHERE userId in (SELECT id FROM users WHERE schoolId=$SCHOOL_ID) AND submitted=true;"
executeSql "SELECT COUNT(*) as generatedTopicExercisesCount FROM generatedTopicExercises WHERE userId in (SELECT id FROM users WHERE schoolId=$SCHOOL_ID) AND submitted=true;"
executeSql "SELECT COUNT(*) as analyticsCount FROM analytics WHERE userId in (SELECT id FROM users WHERE schoolId=$SCHOOL_ID);"

