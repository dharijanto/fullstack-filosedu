
# Installation
## Nginx
By default, Nginx returns 413 for file upload that is too big. To alleviate it, add this into server block
```client_max_body_size 50M;```

# Testing
## Synchronization
### Client
Simply enable verbose logging and data that is to be sent to the cloud server is going to be printed
in the terminal. Check if the data is as expected (i.e. according to what's on DB)

### Server
Use data printed from before, post it to /synchronization, check that database is updated.