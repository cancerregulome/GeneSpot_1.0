var Template = require("../views/templates/scatterplot");
var LineItemTemplate = require("./templates/line_item");
var DataUriTemplate = require("./templates/data_uri");

module.exports = Backbone.View.extend({
    selected_tumor_types: [],
    selected_genes: { "x": "TP53", "y": "KRAS" },
    selected_features: { "x": null, "y": null },
    colorsByTumorType: {},

    events: {
        "click .hide-controls": function() {
            this.$el.find(".hide-controls").toggle("hide");
            this.$el.find(".scatterplot-controls").toggle("puff", { "duration": 500 });
        }
    },

    initialize: function (options) {
        _.extend(this, options);
        _.bindAll(this, "initCancerSelector", "initGeneTypeaheads", "drawGraph", "selectedFeatureData");
        _.bindAll(this, "loadData", "reloadModel", "initFeatureLabelSelector", "getFeatureAxisLabel");

        $.ajax({ url: "svc/data/lookups/genes", type: "GET", dataType: "text", success: this.initGeneTypeaheads });

        if (this.genes && this.genes.length >= 2) {
            this.selected_genes.x = this.genes[0];
            this.selected_genes.y = this.genes[1];
        }

        this.$el.html(Template({}));
        if (_.isEmpty(this.cancers)) {
            $.ajax({ url: "svc/data/lookups/cancers", type: "GET", dataType: "text", success: this.initCancerSelector });
        } else {
            this.selected_tumor_types = this.cancers;
            this.initColorMaps();
            this.initCancerSelector(this.cancers.join("\n"));
        }

        this.model.on("load", this.loadData);
    },

    initColorMaps: function() {
        if (qed.Display) {
            var colormaps = qed.Display.get("colormaps") || {};
            if (_.has(colormaps, "tumor_types")) {
                this.colorsByTumorType = colormaps["tumor_types"];
                return;
            }
        }

        var colorscaleFn = d3.scale.ordinal().domain(this.selected_tumor_types)
            .range(d3.range(this.selected_tumor_types.length)
            .map(d3.scale.linear().domain([0, this.selected_tumor_types.length - 1])
            .range(["red", "green"])
            .interpolate(d3.interpolateLab)));
        _.each(this.selected_tumor_types, function(tumor_type) {
            this.colorsByTumorType[tumor_type] = colorscaleFn(tumor_type);
        }, this);
    },

    initCancerSelector: function (txt) {
        var cancers = txt.trim().split("\n");
        var _this = this;
        _.each(cancers, function (cancer, idx) {
            cancer = cancer.trim();
            if (this.selected_tumor_types.indexOf(cancer) >= 0) {
                _this.$el.find(".cancer-selector-scatterplot").append(LineItemTemplate({"li_class": "active", "a_class": "toggle-active", "id": cancer, "label": cancer}));
            } else {
                _this.$el.find(".cancer-selector-scatterplot").append(LineItemTemplate({"a_class": "toggle-active", "id": cancer, "label": cancer}));
            }
        }, this);

        _.each(this.$el.find(".cancer-selector-scatterplot").find(".toggle-active"), function(liactive) {
            $(liactive).css({
                "border-bottom": "10px solid " + this.colorsByTumorType[$(liactive).data("id")]
            });
        }, this);
        this.$el.find(".cancer-selector-scatterplot").find(".toggle-active").click(function (e) {
            $(e.target).parent().toggleClass("active");
            _this.selected_tumor_types = _.map(_this.$el.find(".cancer-selector-scatterplot").find(".active").find(".toggle-active"), function(liactive) {
                return $(liactive).data("id");
            });
            _.defer(_this.loadData);
        });
    },

    initGeneTypeaheads: function (txt) {
        var genelist = txt.trim().split("\n");

        var source_fn = function (q, p) {
            p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                return _.map(genelist, function (geneitem) {
                    if (geneitem.toLowerCase().indexOf(qi) >= 0) return geneitem;
                });
            }))));
        };

        var _this = this;
        this.$el.find(".genes-typeahead-x").typeahead({
            source: source_fn,
            updater: function (x) {
                _this.selected_genes["x"] = x;
                _.defer(_this.reloadModel);
                return x;
            }
        });

        this.$el.find(".genes-typeahead-y").typeahead({
            source: source_fn,
            updater: function (y) {
                _this.selected_genes["y"] = y;
                _.defer(_this.reloadModel);
                return y;
            }
        });

        if (this.selected_genes["x"]) this.$el.find(".genes-typeahead-x").val(this.selected_genes["x"]);
        if (this.selected_genes["y"]) this.$el.find(".genes-typeahead-y").val(this.selected_genes["y"]);
    },

    loadData: function () {
        this.$el.find(".scatterplot-container").html("Loading data...");
        this.$el.find(".download-container").empty();
        this.feature_map = _.groupBy(this.model.get("items"), "id");
        _.defer(this.initFeatureLabelSelector);
        _.defer(this.drawGraph);
    },

    reloadModel: function () {
        if (_.isEmpty(this.selected_tumor_types)) return;
        if (!this.selected_genes["x"]) return;
        if (!this.selected_genes["y"]) return;

        var fmxModel = this.model;
        fmxModel.fetch({
            "data": {
                "gene": [this.selected_genes["x"], this.selected_genes["y"]],
                "cancer": this.selected_tumor_types
            },
            "traditional": true,
            success: function () {
                fmxModel.trigger("load");
            }
        });
    },

    initFeatureLabelSelector: function () {
        _.each(["x", "y"], function (axis) {
            var UL = this.$el.find(".feature-selector-" + axis);
            UL.empty();

            var selected_gene = this.selected_genes[axis];
            var selected_cancers = this.selected_tumor_types;
            var selected_feature_ids = _.uniq(_.compact(_.map(this.model.get("items"), function (feature) {
                if (feature.id.indexOf(selected_gene) >= 0 && selected_cancers.indexOf(feature.cancer.toUpperCase()) >= 0) return feature.id;
                return null;
            })));

            var selected_features = _.map(selected_feature_ids, function(selected_feature_id) {
                return _.first(this.feature_map[selected_feature_id]);
            }, this);

            _.each(_.groupBy(selected_features, "source"), function (features, source) {
                if (features.length == 1) {
                    var feature = _.first(features);
                    var label = (feature.modifier) ? " (" + feature.modifier + ")": "";
                    UL.append(LineItemTemplate({ "label": source.toUpperCase() + label, "id": feature.id, "a_class": "selector" }));
                }
                if (features.length > 1) {
                    UL.append(source.toUpperCase());
                    _.each(features, function(feature) {
                        UL.append(LineItemTemplate({ "label": "- " + feature.modifier, "id": feature.id, "a_class": "selector" }));
                    });
                }
            });

            if (!_.isEmpty(selected_features)) {
                this.selected_features[axis] = _.first(selected_features).id;
            }

            var _this = this;
            UL.find(".selector").click(function (e) {
                _this.selected_features[axis] = $(e.target).data("id");
                _this.drawGraph();
            });
        }, this);
    },

    drawGraph: function () {
        this.$el.find(".scatterplot-container").empty();

        var data_array = this.selectedFeatureData();
        if (_.isEmpty(data_array)) {
            _.defer(this.reloadModel);
            return;
        }

        var splitiscope = Splitiscope({
            "radius": 8,
            "margin": {
                "top": 10, "left": 10, "bottom": 30, "right": 40
            }
        })(_.first(this.$el.find(".scatterplot-container")));
        splitiscope.colorBy({
            "label": "cancer",
            "list": _.map(this.selected_tumor_types, function(tumor_type) {
                return tumor_type.toLowerCase()
            }),
            "color": _.values(this.colorsByTumorType)
        });
        var _this = this;
        splitiscope.colorFn(function(categoryValue) {
            return _this.colorsByTumorType[categoryValue.toUpperCase()];
        });
        splitiscope.axes({
            "attr": {
                "x": this.selected_features["x"],
                "y": this.selected_features["y"]
            },
            "labels": {
                "x": this.getFeatureAxisLabel("x"),
                "y": this.getFeatureAxisLabel("y")
            }
        });
        splitiscope.data(data_array);
        splitiscope.render();
        this.prepareDownloadLink(_.pluck(data_array, "id"), data_array);

        var _this = this;
        splitiscope.on("partition", function (partition) {
            var sample_ids = [];
            _.each(partition, function (part, key) {
                var part_samples = _.compact(_.map(data_array, function (item) {
                    var val = item[key];
                    if (_.has(part, "values") && part.values.indexOf(val) >= 0) return item.id;
                    if (_.has(part, "high") && _.has(part, "low") && val <= part.high && val >= part.low) return item.id;
                    return null;
                }));
                if (_.isEmpty(sample_ids)) {
                    sample_ids = part_samples;
                } else {
                    sample_ids = _.intersection(part_samples, sample_ids);
                }
            });

            _this.prepareDownloadLink(sample_ids, data_array);
        });
    },

    prepareDownloadLink: function(sample_ids, data_array) {
        var downloadEl = this.$el.find(".download-container").empty();
        if (_.isEmpty(sample_ids)) return;

        var keys = _.without(_.without(_.keys(_.first(data_array)), "id"), "cancer");

        var filecontents = [];
        filecontents.push("ID" + "%09" + "TUMOR_TYPE" + "%09" + keys.join("%09"));

        _.each(data_array, function(item) {
            if (sample_ids.indexOf(item.id) >= 0) {
                var values = _.map(keys, function(key) {
                    return item[key];
                });
                filecontents.push(item.id + "%09" + item.cancer.toUpperCase() + "%09" + values.join("%09"));
            }
        });

        downloadEl.html(DataUriTemplate({
            "filename": "genespot_selected_samples.tsv",
            "content": filecontents.join("%0A"),
            "label": "Download " + sample_ids.length + " Samples"
        }));
    },

    selectedFeatureData: function () {
        var x_feature = this.selected_features["x"];
        var y_feature = this.selected_features["y"];
        if (_.isEmpty(x_feature) || _.isEmpty(y_feature)) return [];

        var x_features = this.feature_map[x_feature];
        var y_features = this.feature_map[y_feature];
        if (_.isEmpty(x_features) || _.isEmpty(y_features)) return [];

        var x_features_by_tumor_type = _.groupBy(x_features, "cancer");
        var y_features_by_tumor_type = _.groupBy(y_features, "cancer");

        var all_datapoints = _.map(x_features_by_tumor_type, function(x_feats, tumor_type) {
            if (this.selected_tumor_types.indexOf(tumor_type.toUpperCase()) >= 0) {
                var x_values = _.first(x_feats).values || {};
                var y_values = _.first(y_features_by_tumor_type[tumor_type]).values || {};
                return _.compact(_.map(x_values, function (x_val, point_id) {
                    var y_val = y_values[point_id];

                    if (!_.isEqual(x_val, "NA") && !_.isEqual(y_val, "NA")) {
                        var dataPoint = {"id": point_id};
                        dataPoint[x_feature] = x_val;
                        dataPoint[y_feature] = y_val;
                        dataPoint["cancer"] = tumor_type;
                        return dataPoint;
                    }
                }));
            }
            return null;
        }, this);
        return _.compact(_.flatten(all_datapoints));
    },

    getFeatureAxisLabel: function (axis) {
        var featureId = this.selected_features[axis];
        var feature = _.first(this.feature_map[featureId]);
        if (feature && feature.label && feature.source && feature.modifier) return feature.label + " " + feature.source + " (" + feature.modifier + ")";
        return featureId;
    }
});
