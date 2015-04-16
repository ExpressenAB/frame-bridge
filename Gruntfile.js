module.exports = function(grunt) {

  var config = {
    connectOptions: {
      base: 'www-root',
      hostname: 'localhost',
      port: 9000
    },
    buildFolder: 'dist',
    livereload: 9001,
    jsFiles: [
      'frame-bridge.js'
    ]
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    connectOptions: config.connectOptions,
    buildFolder: config.buildFolder,

    connect: {
      server: {
        options: config.connectOptions
      }
    },

    clean: {
      deploy: [config.buildFolder],
      develop: [config.connectOptions.base]
    },

    jade: {
      develop: {
        options: {
          data: {
            jsFiles: config.jsFiles,
            childDomain: 'http://' + config.connectOptions.hostname + ':' + config.connectOptions.port,
            parentDomain: 'http://' + config.connectOptions.hostname + ':' + config.connectOptions.port
          }
        },
        files: {
          '<%= connectOptions.base %>/parent.html': 'jade/parent.jade',
          '<%= connectOptions.base %>/child.html': 'jade/child.jade'
        }
      }
    },

    jshint: {
      files: ['Gruntfile.js'],
      options: {
        globals: {
          console: true
        }
      }
    },

    copy: {
      develop: {
        files: [
          {
            expand: true,
            src: config.jsFiles,
            dest: '<%= connectOptions.base %>/js',
            cwd: 'src/'
          }
        ]
      },
      deploy: {
        files: [
          {
            dest: '<%= buildFolder %>/',
            cwd: 'src/'
          }
        ]
      }
    },

    uglify: {
      deploy: {
        files: {
          '<%= buildFolder %>/frame-bridge-<%= pkg.version %>.min.js': (function() {
            var allFiles = [];

            config.jsFiles.forEach(function(f) {
              allFiles.push('src/' + f);
            });

            return config.jsFiles.concat(allFiles);
          }())
        }
      }
    },

    open : {
      dev : {
        path: 'http://<%= connectOptions.hostname %>:<%= connectOptions.port %>/parent.html',
        app: 'Google Chrome'
      }
    },

    watch: {
      livereload: {
        options: {
          livereload: config.livereload
        },
        files: [ '<%= connectOptions.base %>/**/*']
      },
      jade: {
        files: ['jade/*.jade'],
        tasks: ['jade']
      },
      js: {
        files: ['Gruntfile.js', 'src/*.js'],
        tasks: ['jshint', 'copy:develop']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jade');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-open');

  grunt.registerTask('develop', ['clean:develop', 'jade:develop', 'jshint', 'copy:develop', 'connect', 'open', 'watch']);
  grunt.registerTask('build', ['clean:deploy', 'jshint', 'uglify']);

};
