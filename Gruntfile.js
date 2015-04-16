module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    requirejs: {
      compile: {
        options: {
          baseUrl: "src",
          mainConfigFile: "src/config.js",
          name: "lib",
          out: "dist/frame-bridge-<% pkg.version %>.min.js"
        }
      }
    }
  });

};
