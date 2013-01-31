# See docs at http://brunch.readthedocs.org/en/latest/config.html.
exports.config =
  paths:
    public: '_public'
  files:
    javascripts:
      defaultExtension: 'js'
      joinTo:
        'js/app.js': /^app/
        'js/vendor.js': /^vendor/
        'js/isb.js': /^isb/
      order:
        before: [
          'vendor/js/console-helper.js',
          'vendor/js/jquery-1.8.0.js',
          'vendor/js/bootstrap.js',
          'vendor/js/underscore-1.4.2.js',
          'vendor/js/backbone-0.9.2.js',
          'vendor/js/backbone-mediator.js',
          'isb/js/d3.v2.js',
          'isb/js/vq.js'
        ]
        after: [
          'isb/js/d3.parcoords.js',
          'vendor/js/slick.core.js',
          'vendor/js/slick.grid.js',
          'vendor/js/slick.rowselectionmodel.js'
        ]

    stylesheets:
      defaultExtension: 'less'
      joinTo: 'css/app.css'
      order:
        after: [
          'isb/css/vis.css'
        ]

    templates:
      defaultExtension: 'hbs'
      joinTo: 'js/app.js'

  server:
    path: 'server.js'
    port: 3333
    run: yes

# minify: true
