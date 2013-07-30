# WebAppBase

# Dependencies

* [Node.js v0.10.13](http://www.nodejs.org) or newer
* [Git](http://git-scm.com/)
 
# Installing dependencies:

## Linux and OSX

1. Install [Node.js](http://www.nodejs.org).
2. Install [Git](http://git-scm.com/).
3. To install global tools, you can use *sudo* or you can change the install path for node libraries to a file path in user space:

  ```
  export NODE_PATH=$HOME/.node
  export PATH=$NODE_PATH:$PATH
  ```

## Windows

1. Install the pre-built Node.js package from http://www.nodejs.org.
2. Add the Node.js installation directory to the executable search path so that the *npm* program is runnable from shell.
3. Install [Git](http://git-scm.com/).
4. Add the directory containing the *git* program to the executable search path so that the program is runnable from shell.

# Installing build tools and libraries

1. Using *npm*, the node package manager, globally install the core build tools, yeoman, grunt, and bower:

  ```
  cd /path/to/project
  npm install -g yo grunt-cli bower
  ```

2. Now install the build and test dependencies:

  ```
  cd /path/to/project
  npm install
  ```

  This downloads and install node dependencies listed in package.json to the `node_modules` subdirectory

3. Install the client-side dependencies using *bower*:

  ```
  cd /path/to/project
  bower install
  ```

# Building the project:

The web application is built by using *grunt*:

```
grunt build
```

The entire static package should be created in the `dist` subdirectory.  This directory can be copied, as is, to the web server.

# Developing the project:

The web application can be served while in development with:

```
grunt server &
```

This serves the web app locally, opens a browser pointed at the local web server, and opens a watch task that reloads the browser automatically when core files (html, css, js) are modified.
It does not build the web app for distibution, as the code becomes difficult to debug when uglified/minified.
