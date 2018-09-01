
# Installation
## Nginx
By default, Nginx returns 413 for file upload that is too big. To alleviate it, add this into server block
```client_max_body_size 50M;```

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