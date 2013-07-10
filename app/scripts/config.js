require.config({
    baseUrl: 'scripts',

    paths: {
        jquery: '../bower_components/jquery/jquery',
        "jQuery-ui": "../bower_components/jquery-ui/ui/jquery-ui",
        "jquery-event-drag" : "../bower_components/jquery-event-drag/index",
        "jquery-event-drop" : "../bower_components/jquery-event-drop/index",
        backbone: '../bower_components/backbone/backbone',
        bootstrap: 'vendor/bootstrap',
        d3: '../bower_components/d3/d3',
        modernizr: '../bower_components/modernizr',
        underscore: '../bower_components/underscore/underscore',
        hbs : '../bower_components/require-handlebars-plugin/hbs',
        handlebars : '../bower_components/require-handlebars-plugin/Handlebars',
        'json2' : '../bower_components/require-handlebars-plugin/hbs/json2',
        'i18nprecompile' : '../bower_components/require-handlebars-plugin/hbs/i18nprecompile',
        vq : '../bower_components/visquick/vq'
    },
    shim: {
        underscore : {
            'exports' : '_'
        },
        "jQuery-ui" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        "jquery-event-drag" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        "jquery-event-drop" : {
            "deps": ["jquery"],
            "exports" : "$"
        },
        d3 : {
            'exports' : 'd3'
        },
        vq : {
            'deps' : ['d3','underscore'],
            'exports' : 'vq'
        },
        backbone : {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        bootstrap : {
            deps : ['jquery','jQuery-ui'],
            exports : 'bootstrap'
        }
    },
    hbs : {
        "templateExtension" : 'hbs',
        "disableI18n" : true,
        "helperPathCallback" : // Callback to determine the path to look for helpers
            function (name) { // ('/template/helpers/'+name by default)
                return 'templates/helpers/' + name;
            }
    }
});

require(['qed', 'router'], function (QED, router) {
    QED.initialize();

    qed = QED;
});
