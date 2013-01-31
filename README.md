# WebAppTemplate #
Web Application Templates for Cancer Regulome

Operating System Support:
  - The example commands in this file are directed at Linux and Mac OS X users.  However, it should be expected (unless otherwise noted) that these dependencies would be supported in any operating system supporting Python 2.6~2.7.

# Required Dependencies #
* Brunch
  - http://brunch.io/
  - npm install -g brunch

* Tornado Web
  - http://www.tornadoweb.org/
  - https://github.com/downloads/facebook/tornado/tornado-2.4.1.tar.gz
      tar xvzf tornado-2.4.1.tar.gz
      cd tornado-2.4
      python setup.py build
      sudo python setup.py install
    On Python 2.6 and 2.7, it is also possible to simply add the tornado directory to your PYTHONPATH instead of building with setup.py, since the standard
    library includes epoll support.  Use [sudo] easy_install -U tornado

* Google OAUTH2 API
 - https://developers.google.com/api-client-library/python/start/installation
 - [sudo] easy_install --upgrade google-api-python-client
    
* MongoDB
 - PyMongo :: http://api.mongodb.org/python/current/installation.html
   - [sudo] easy_install -U pymongo
 - MongoDB :: http://docs.mongodb.org/manual/tutorial/install-mongodb-on-os-x/
   - brew update ; brew install mongodb

# JavaScript Libraries #
This template packages third-party JavaScript libraries into a single vendor.js file.  It also packages JavaScript libraries developed ISB into a single isb.js file.
These library packages are offered as downloadable distributions here (add link).  Developers should download these into their development and production environments,
and the brunch build system will automatically include them.  These libraries should NOT be checked-in to individual projects.

# Runtime Configuration #
This template is meant to standardize the development of new HTML5 web applications and web services in the Cancer Regulome project.  The web application will
contain runtime dependencies on the following JSON configuration files:

* display.json - specifies titles, labels, and links in the About menu

### Example configuration ###
```
    {

    }
```

* datamodel.json - specifies data source elements (such as files, directories, and data services) including data types which allows the application to associate
different data elements to different views

### Example configuration ###
```
    {

    }
```
