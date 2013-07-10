define   (['jquery', 'underscore', 'backbone', 'router',
    'models/sessions',
    'models/catalog',
    'models/annotations',
    'models/mappings',
    'models/feature_matrix',

    'views/items_grid_view'],
function ( $,        _,            Backbone,   AppRouter,
           SessionsCollection,
           CatalogModel,
           AnnotationsModel,
           MappingsModel,
           FeatureMatrixModel,

           ItemGridView
    ) {

    var obj = {
        Events: _.extend(Backbone.Events),

        Annotations: {},
        Models:{
            "Catalogs": CatalogModel,
            "Annotations": AnnotationsModel,
            "Mappings": MappingsModel,
            "FeatureMatrix": FeatureMatrixModel,
            "Default":Backbone.Model.extend({
                url: function() {
                    return this.get("data_uri");
                }
            })
        },
        ViewMappings:{
            "Annotations":[
                { "id":"items_grid", label:"Grid" }
            ],
            "FeatureMatrix":[
                { "id":"items_grid", label:"Grid" }
            ]
        },
        Views:{
            "items_grid": ItemGridView
        },
        Lookups:{
            Chromosomes: new AnnotationsModel({ url:"svc/data/lookups/chromosomes" }),
            Labels:{}
        },
        Display:new Backbone.Model(),
        Datamodel:new Backbone.Model(),
        Sessions: {
            All: null,
            Active: null,
            Producers: {}
        }
    };

    obj.startRouter = function() {
        this.Router = new AppRouter({
            Annotations: this.Annotations,
            Datamodel: this.Datamodel,
            Sessions: this.Sessions,
            Views: this.Views,
            Models: this.Models,
            ViewMappings: this.ViewMappings
        });
        this.Router.initTopNavBar({
            Display: this.Display
        });

        Backbone.history.start();
        this.Events.trigger("ready");
    };

    obj.startupUI = function() {
        var that = this;

        $.ajax({
            "url": "svc/storage/sessions",
            "method": "GET",
            success: function(json) {
                that.Sessions.All = new SessionsCollection(json.items);
                that.startRouter();
            },
            error: function() {
                that.Sessions.All = new SessionsCollection([]);
                that.startRouter();
            }
        });
    };

    obj.initialize = function() {
        var that = this;

        this.Display.fetch({
            url:"svc/configurations/display.json",
            success:function () {
                document.title = (that.Display.get("title") || "QED");
            }
        });

        this.Datamodel.fetch({
            url:"svc/configurations/datamodel.json",
            success: that.startupUI,
            error: that.startupUI
        });

        this.Lookups.Chromosomes.fetch({
            dataType: "text"
        });
    };

    _.bindAll(obj, 'startRouter', 'startupUI', 'initialize');

    return obj;

// end define
});