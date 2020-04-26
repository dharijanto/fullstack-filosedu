# Background
This is the heart of non-profit Ed-Tech, [Filosedu](www.filosedu.com), whose goal is to help Indonesian kids have access to K12 education.
The story behind Filosedu can be found [here](https://medium.com/@adennyh/filosedu-free-k-12-tutoring-centers-eebe7d20b107). And the engineering write up [here](https://medium.com/@adennyh/filosedu-how-does-filosedu-free-tutoring-center-work-how-to-open-a-new-one-20807af73c4a)

# Live Demo
- https://app.filosedu.com/
- School: Filosedu Bandung Elmuloka
- Username: trial
- Password: 1234

# Installation
## Nginx
Things POSTed using HTTP protocol like sync data is pretty large. They can be > 1MB at times.
By default, Nginx returns 413 for file upload that is too big. To alleviate it, add this into server block
```
client_max_body_size 50M;
```

## Mysql
* Make sure MySQL 5.7 is used
* Make sure timezone is set appropriately (GMT +7)
  By default, MySQL uses local timezone, hence make sure computer time is set appropriately

## Redis
* NCloudServer relies on redis, default installation should do it

## NCKeyServer
* NCloudServer relies on NCKeyServer in order to work

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
## Table Indexing
* After a server is synchronized (cloud-to-local), we are allowed to delete all the entries on
  synchronizations table where serverHash equals to what it was before sync. This should help
  retaining small table size.
* When doing a local-to-cloud sync, the process is so slow. It can take up to 15 minutes at the
  moment of writing (288k entries of synchronizations table). Composite key should be able to help
  here because it seems that the bottle neck is when searching for mapping between local server id
  to cloud server id. Try this:
  ```
  CREATE INDEX searchingCloudId ON synchronizations(localId, schoolIdentifier, serverHash, tableName);
  ```
  If it works, the next step is to incorporate it into Sequelize so that it's automated

## Implementation
### Sync from local to cloud
* Query the server to get last recorded sync date
* Get data to sync from their respective tables, where schoolIdentifier = localSchoolIdentifier
  * We can't just send everything but have to check for the schoolIdentifier because the
    source of truth for this local server is from cloud. Meaning data for other school
    will also be here.
  * We retrieve only the data whose updatedAt > lastSync date returned by the server to avoid
    re-processing data that has already been processed before.
* Send this data to cloud
* Cloud does some verification
  * schoolIdentifier is valid
  * Cloud returns immediately, then begin syncing. The reason is because We don't wanna
    have client block on us while waiting for the sync to complete,
    which can take up to 5 minutes depending on how big the data is.
* Server creates new entry in syncHistories table, whose status is Syncing
  * Server uses synchronizations table to create mapping between client id and server id
    * synchronizations.schoolIdentifier:
    * synchronizations.
    * Column:
      * localId -> source id on local server
      * cloudId -> destionation id on cloud server
      * tableName ->  what table this belongs to
      * schoolIdentifier -> identifies a specific school server
      * localServerHash-> identify a specific version of school server.
        * On the local server, this is implemented by creating it once: md5(current date). When
          we sync from cloud to local, this is gone, so local has to create a new one, hence invalidating
          the old synchronizationas mapping.
  * For each data to insert, we check there's entry where data.id = localId, data.tableName = tableName,
    localSchoolIdentifier = schoolIdentifier, and localServerHash = serverHash
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


### Homework System
There are two kind of homework assignments:
  * Subtopic homework
    * Semi-accomplished on 5 star-badges
      * Color becomes orange
      * Reward = 10 points before due date
      * Reward = 5 points after due date
    * Accomplished on 5 star-badges and 5 time-badges
      * Color becomes green
      * Reward = 20 points before due date
      * Reward = 10 points after due date
  * Topic homework
    * Semi-accomplished on a star-badge on review exercise
      * Color becomes orange
      * Reward = 16 points before due date
      * Reward = 8 points after due date
    * Accomplished on a star-badge on review exercise
      * Color becomes green
      * Reward = 34 points before due date
      * Reward = 17 points after due date

When topics/subtopics are already completed before they're assigned, points will be given only when teacher created assignments from the dashboard.

#### Implementation Detail
* New columns are created on topicsView and subtopicsView that identify whether a topic or subtopic has an associated assignment. This is used to render assignment border on topics and subtopics page. Also the box needs to be rendered on subtopic page.
* When a subtopic or topic exercise is submitted, a check needs to be made with assignedTask table and score is given accordingly.
  * Subtopic
    * If stars = 5, set points according to deadline
    * If time-badges = 5, set additional points according to deadline
  * Topic
    * If star is achieved, set points according to deadline
    * If time is achieved, set points according to deadline



## Functional Testing
## Synchronization

### Setting up
* Create two filosedu server by adding 2 entries in sites database. Modify the CLOUD_SERVER flag so that one is:
  * Local server
  * Cloud server
* Enable sequelize verbose logging, through app-config so that we can see database logs.

### Tests
#### Unit
##### Synchronization
-Insert data of certain date, call sync function to get data that would have been send
 to the cloud. Ensure that the data that is or isn't supposed to be sent are proper.
 For this, we need to emulate cloud server behavior (i.e. getSyncHistories())

#### Functional
##### Synchronization
###### Make sure we're not messing timezone up
Sequelize has certain weird quirks about doing timezone conversion, hence we need to ensure nothing breaks when we
modify ncloud and/or filos code...
  - Insert data
  - Read  data from previous step, check if its createdAt is as expected
  - Read previously inserted data by using createdAt time range, check if it is retrieved

###### Things to Note on Synchronization Testing
1. Timezone conversion -> Since we're using sequelize that does time conversion and cloud and local can have different settings, make
   sure things are tested and working properly.
2. First test locally, by having 2 filos applications on the same computer, 1 acts as local-server and the other 1 acts as cloud-server
3. Then test syncing with real cloud server.

###### Local-to-Cloud
1. First-time sync
  a. Delete generatedExercises, generatedTopicExercises, and analytics rows on the cloud where schoolId = local.schoolId
  b. Sync to cloud
  c. Check if the number of rows where schoolId is appropriate, is the same on cloud and on the server
2. Sync without making any changes
  a. Sync again
  b. Check that row count on cloud doesn't change
3. Subsequent sync
  a. Do exercises so we have more generatedExercises and generatedTopicExercises
  b. Sync to cloud
  c. Check if the number of rows in cloud is updated to reflect the update on local server
4. Sync after deleting syncHistories -> check that synchronizations mapping work as expected
  a. Check row count on cloud where schoolId = local.schoolId
  b. Delete syncHistories where schoolId = local.schoolId
  c. Sync
  d. Check that row count is the same as (a)

###### Cloud-to-Local
1. First-time restore
  a. Do mysqldump of cloud, restore it in local server
  b. Check if restored data is accessible in local server
2. Sync immediately after first-time restore
  a. Do (1)
  b. Check number of rows in generatedExercises, generatedTopicExercises, and analytics on cloud server
     and note it.
  c. Sync from local to cloud
  d. Do (b) again, make sure it is the same as we don't add new data. -> This is to check onCloud flag on the table is working as expected.
3. Sync immediately after first-time restore, with syncHistories cleaned
  a. Like (2), but before syncing, remove syncHistories from cloud
4. Sync after first-time restore
  a. Do (1)
  b. Finish some exercises so that we have new entries in generatedExercises, generatedTopicExercises, and analytics
  c. Check number of rows in generatedExercises, generatedTopicExercises, and analytics on cloud and local server
     and note it.
  d. Sync from local to cloud
  e. Check number of rows in cloud


1. Check that the following queries is the same in the server and in the client:
  ```
  select count(*) from users where schoolId = 3);
  select count(*) from analytics where userId in (select id from users where schoolId = 3);
  select count(*) from generatedExercises where userId in (select id from users where schoolId = 3);
  select count(*) from generatedTopicExercises where userId in (select id from users where schoolId = 3);
  ```
2. Create two instances of filos app, using ln -s to share the code. But separate the database of the two
   (i.e. create two sites with different names). Have one to sync to the other

#### Continuous Integration
* All pages are accessible
    Since we're already a pretty big application, we need to make sure that all of the pages are accessed fine.
    * Exercise: There are three paths: new, restoring, updating

# TODO
1. Move backup script from .sh to .ts and let it be called using GET request through cronjob using CURL
   This way we don't have to place username and password twice, but we can centralize everything on AppConfig
