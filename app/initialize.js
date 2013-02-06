$(function () {
    qed = {
        Events: _.extend(Backbone.Events),
        Models:{
            "Catalogs":require("models/catalog"),
            "Annotations":require("models/annotations"),
            "Mappings":require("models/mappings"),
            "FeatureMatrix":require("models/feature_matrix"),
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
            "items_grid": require("views/items_grid_view")
        },
        Lookups:{
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

    qed.Display.fetch({
        url:"svc/configurations/display.json",
        success:function () {
            document.title = (qed.Display.get("title") || "QED");
        }
    });

    var startRouter = function() {
        var QEDRouter = require("./router");
        qed.Router = new QEDRouter();
        qed.Router.initTopNavBar();

        Backbone.history.start();
        qed.Events.trigger("ready");
    };

    var startupUI = function() {
        var SessionsCollection = require("models/sessions");
        $.ajax({
            "url": "svc/storage/sessions",
            "method": "GET",
            success: function(json) {
                qed.Sessions.All = new SessionsCollection(json.items);
                startRouter();
            },
            error: function() {
                qed.Sessions.All = new SessionsCollection([]);
                startRouter();
            }
        });
    };

    qed.Datamodel.fetch({
        url:"svc/configuration/datamodel.json",
        success:function () {
            var section_ids = _.without(_.keys(qed.Datamodel.attributes), "url");
            var catalog_counts = _.map(section_ids, function (section_id) {
                var section = qed.Datamodel.get(section_id);
                return _.without(_.keys(section), "label").length;
            });

            var allCatalogs = _.reduce(_.flatten(catalog_counts), function (sum, next) {
                return sum + next;
            });

            var initLayoutFn = _.after(allCatalogs, startupUI);
            _.each(section_ids, function (section_id) {
                _.each(qed.Datamodel.get(section_id), function (unit, unit_id) {
                    if (unit_id != "label") {
                        var catalog = new qed.Models.Catalogs({"url":"svc/data/" + section_id + "/" + unit_id + "/CATALOG", "unit":unit});
                        catalog.fetch({ success:initLayoutFn, error:initLayoutFn });
                    }
                });
            });
        },
        error: startupUI
    });

    qed.Lookups.Chromosomes = new qed.Models.Annotations({ url:"svc/data/lookups/chromosomes" });
    qed.Lookups.Chromosomes.fetch({"dataType":"text"});

    qed.Annotations = {};
    qed.FetchAnnotations = function (dataset_id) {
        if (_.isEmpty(qed.Annotations[dataset_id])) {
            var annotations = new qed.Models.Annotations({"url":"svc/data/annotations/" + dataset_id + ".json", "dataType":"json"});
            annotations.fetch({
                "async":false,
                "dataType":"json",
                "success":function () {
                    qed.Annotations[dataset_id] = annotations.get("itemsById");
                }
            });
        }
        return qed.Annotations[dataset_id];
    };
});
