define   (['jquery', 'underscore', 'backbone', 'router',
    'models/sessions',
    'models/catalog',
    'models/annotations',
    'models/mappings',
    'models/feature_matrix',

    'views/items_grid_view'],
function ( $,        _,            Backbone,   QEDRouter,
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

    obj.FetchAnnotations = function (dataset_id) {
        var that = this;

        if (_.isEmpty(this.Annotations[dataset_id])) {
            var annotations = new this.Models.Annotations({
                "url":"svc/data/annotations/" + dataset_id + ".json",
                "dataType":"json"}
            );

            annotations.fetch({
                "async":false,
                "dataType":"json",
                "success":function () {
                    that.Annotations[dataset_id] = annotations.get("itemsById");
                }
            });
        }
        return this.Annotations[dataset_id];
    };

    obj.startRouter = function() {
        this.Router = new QEDRouter();
        this.Router.initTopNavBar();

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
            success:function () {
                var section_ids = _.without(_.keys(that.Datamodel.attributes), "url");
                var catalog_counts = _.map(section_ids, function (section_id) {
                    var section = that.Datamodel.get(section_id);
                    return _.without(_.keys(section), "label").length;
                });

                var allCatalogs = _.reduce(_.flatten(catalog_counts), function (sum, next) {
                    return sum + next;
                });

                var initLayoutFn = _.after(allCatalogs, that.startupUI);

                _.each(section_ids, function (section_id) {
                    _.each(that.Datamodel.get(section_id), function (unit, unit_id) {
                        if (unit_id != "label") {
                            var catalog = new that.Models.Catalogs({"url":"svc/data/" + section_id + "/" + unit_id + "/CATALOG", "unit":unit});
                            catalog.fetch({
                                success:initLayoutFn,
                                error:initLayoutFn
                            });
                        }
                    });
                });
            },
            error: that.startupUI
        });

        this.Lookups.Chromosomes.fetch({
            dataType: "text"
        });
    };

    _.bindAll(obj, 'FetchAnnotations', 'startRouter', 'startupUI', 'initialize');

    return obj;

// end define
});