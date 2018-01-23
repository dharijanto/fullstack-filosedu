
# Installation
## Nginx
By default, Nginx returns 413 for file upload that is too big. To alleviate it, add this into server block
```client_max_body_size 50M;```