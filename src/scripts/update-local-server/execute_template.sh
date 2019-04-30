# 1. Create a copy of this file, name it execute.sh
# 2. Update path and credential information

# The following variables are set through the calling NodeJS process
# Since we also want to test this script independent of the program,
# we add default values for when the script is executed directly.
if [ -z "$NCLOUD_SERVER_PATH" ]
then
  NCLOUD_SERVER_PATH='/home/aharijanto/tmp/ncloud-dist/'
fi

if [ -z "$FILOS_SERVER_PATH" ]
then
    FILOS_SERVER_PATH="/home/aharijanto/Programming/nodejs/ncloud-server/dropbox/dynamichost/app_filosedu"
fi

if [ -z "$CLOUD_HOST" ]
then
  CLOUD_HOST="https://app.filosedu.com"
fi

if [ -z "$SQL_USER" ]
then
  SQL_USER="root"
fi

if [ -z "$SQL_PASS" ]
then
  SQL_PASS=""
else
  SQL_PASS="-p$SQL_PASS"
fi

if [ -z "$SQL_DB" ]
then
  SQL_DB="app_filosedu"
fi

if [ -z "$SQL_DB" ]
then
  SCHOOL_IDENTIFIER="filosedu_bandung_elmuloka"
fi

function check () {
  if [ "$1" -ne 0 ]
  then
    >&2 echo "[ERROR]: $2"
    exit 1
  fi
}
# Backup current Database
echo "[INFO]: Backing up current database...." &&
mysqldump -u$SQL_USER $SQL_PASS $SQL_DB > /tmp/filosedu_backup.sql
check $? "Failed to backup database!"

# Get remote database
echo "[INFO]: Downloading remote database..." &&
wget -q -O - $CLOUD_HOST/backup/dump?schoolIdentifier=$SCHOOL_IDENTIFIER | gzip -d > /tmp/filosedu.sql
check $? "Failed download remote database!"

# Drop current database
echo "[INFO]: Deleting database..." &&
mysql -u$SQL_USER $SQL_PASS -e "drop database $SQL_DB; create database $SQL_DB"
check $? "Failed to delete database"

# Restore remote database
echo "[INFO]: Restoring remote database..." &&
mysql -u$SQL_USER $SQL_PASS $SQL_DB < /tmp/filosedu.sql
check $? "Failed to restore remote database!"

# Cleaning up tmp files
echo "[INFO]: Cleaning up..." &&
rm -rf /tmp/filosedu.sql /tmp/filosedu_backup.sql
check $? "Failed to clean up!"

# Downloading videos and images....
echo "[INFO]: Updating content..." &&
SCRIPT_PATH=$FILOS_SERVER_PATH/scripts/video-and-images-sync.js
ls $SCRIPT_PATH &> /dev/null
# Use pre-defined path if SCRIPT_PATH isn't set
if [ "$?" -eq 0 ]
  then node $SCRIPT_PATH
  else node $FILOS_SERVER_PATH/dist/scripts/video-and-images-sync.js
fi
check $? "Failed to update content"

# Update ncloud-server
echo "[INFO]: Updating ncloud server"
cd $NCLOUD_SERVER_PATH
git pull origin master && npm prune && npm install
check $? "Failed to update ncloud-server"


# Update filos-server
echo "[INFO]: Updating Filos Server"
cd $FILOS_SERVER_PATH
git pull origin master && npm prune && npm install
check $? "update filos-server!"


echo "[INFO]: Completed!"
