
# Installation
## Nginx
Things POSTed using HTTP protocol like sync data is pretty large. They can be > 1MB at times.
By default, Nginx returns 413 for file upload that is too big. To alleviate it, add this into server block
```
client_max_body_size 50M;
```

# Synchronization
## Requirement
* Sync from local to cloud
  * This is done using custom code.
* Sync from cloud to local
  * Initially, this is done using mysqldump
  * Afterwards, we'll implement custom code for this.
* Local is stateless.
  * Meaning that if server for school X is broken, we can deploy new machine to replace it,
	with source of truth taken from cloud
* Tables to sync
	* users
	* analytics
	* generatedTopicExercises
	* generatedTopicExercises
	* Although other tables, such as topic, subtopic, and exercises are modifiable from CMS
	  they're not going to be synced to cloud. They're modifable just for convinience


## Implementation
### Sync from local to cloud
* Query the server to get last recorded sync date
* Get data to sync from their respective tables, where schoolIdentifier = localSchoolIdentifier
  * We can't just send everything but have to check for the schoolIdentifier because the
	source of truth for this local server is from cloud. Meaning data for other school
	will also be here.
  * We retrieve only the data whose updatedAt > last recorded sync date returned by the server
* Send this data to cloud
* Cloud does some verification
  * schoolIdentifier is valid
  * Cloud returns immediately, then begin syncing. The reason is because We don't wanna
	have client block on us while waiting for the sync to complete,
	which can take up to 5 minutes depending on how big the data is.
* Server creates new entry in syncHistories table, whose status is Syncing
  * Server uses synchronizations table to create mapping between client id and server id
	* Synchronization: localId, cloudId, tableName, schoolIdentifier
	* localId is the row id on the local server, while cloudId is to what id it maps to local server.
	* For each data to insert, we check there's entry where data.id = localId, data.tableName = tableName and
	  localSchoolIdentifier = schoolIdentifier.
	* If there's entry, that means that data has been added to the database, and we just need to update.
	* If there's no entry, that means this is a new data. We insert it to the respective table, than
	  add the mapping from localId to cloudId to synchronzitions table
  * Local can check this sycnHistories throug GET request.
  * Server refuses any other request to sync, while this syncing is progressing
* When server finished the syncing, it updates the entry on syncHistories with
  status = Success or Failed

### Sync from cloud to local
#### Phase 1 - Using MySQLDump
* All rows that is created in cloud has column onCloud = true
  * Without this, if we refresh a local server with cloud database as its new database,
	when we sync, localId of existing data changes. Hence they'll be duplicated when added.
  * In other words, onCloud = true is a flag that means the row comes from cloud, hence
	we don't need to sync it again.
  * There is edge case: when we modify data where onCloud
	locally. We should handle this more gracefully, but we can live for now?
* When syncing to server,

#### Phase 2

# Testing
## Synchronization
### Checking Client Code
Simply enable verbose logging and data that is to be sent to the cloud server is going to be printed
in the terminal. Check if the data is as expected (i.e. according to what's on DB)

### Checking Server Server
Use data printed from before, post it to /synchronization, check that database is updated.

### Testing
1. Check that the following queries is the same in the server and in the client:
	```
	select count(*) from users where schoolId = 3);
	select count(*) from analytics where userId in (select id from users where schoolId = 3);
	select count(*) from generatedExercises where userId in (select id from users where schoolId = 3);
	select count(*) from generatedTopicExercises where userId in (select id from users where schoolId = 3);
	```
2. Create two instances of filos app, using ln -s to share the code. But separate the database of the two
   (i.e. create two sites with different names). Have one to sync to the other
