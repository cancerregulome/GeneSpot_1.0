var Template = require("../templates/minigraph");
var DataTemplate = require("./templates/minigraph_data");
var LineItemTemplate = require("./templates/line_item");
var GroupSelectLineTemplate = require("./templates/minigraph_group_menu_item");
var NodePopoverTemplate = require("./templates/minigraph_node_popover");
var GroupBuilderView = require("./minigraph_group_builder");
var HeatmapView = require("./minigraph_heatmap");

module.exports = Backbone.View.extend({
    analysis_config: {
        selected_groups: []
    },
    slider_pvalues: [1e-100, 1e-50, 1e-25, 1e-20, 1e-15, 1e-10, 1e-8, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 5e-2, 1],
    defaultColor: "#4682B4",
    barscale: d3.scale.linear().domain([0, 1]).range([0, 80]),

    events: {
        "click .color-picker": function (e) {
            var colorpicker = $(e.target);
            var keycode = colorpicker.data("key");
            var nodemeasures = this.$el.find(".node-measures");

            new Color.Picker({
                color: this.defaultColor,
                display: true,
                autoclose: true,
                size: 200,
                callback: function (rgba) {
                    var newcode = "#" + Color.Space(rgba, "RGB>STRING");
                    colorpicker.parent().css({ "background-color": newcode });
                    _.each(nodemeasures, function(nodemeasure) {
                        if (_.isEqual($(nodemeasure).data("key"), keycode)) {
                            $(nodemeasure).css({ "background": newcode });
                        }
                    });
                }
            }).toggle(true);
        }
    },

    initialize: function () {
        var _this = this;

        _.bindAll(this, "initUserDefinedGroupSelector", "initGroupSelector", "initCutoffSliders", "handleAnalysisFailed",
            "initTypeahead", "initHandlers", "initSlider", "submitAnalysisJob", "getSelectedUserDefinedGroups",
            "renderData", "renderUI");

        this.static_data = this.model.get("static_data");

        this.static_data.get("groups").on("change", function(model) {
            _this.initGroupSelector(model, ".preset-group-selector-minigraph", _this.analysis_config);
            _this.initUserDefinedGroupSelector();
        });

        this.static_data.get("genes").on("change", function(model) {
            _this.initTypeahead(model, ".genes-typeahead", ".gene-selector");
        });

        this.static_data.get("pathways").on("change", function(model) {
            _this.initTypeahead(model, ".pathways-typeahead", ".pathway-selector");
        });

        this.static_data.get("hallmarks").on("change", function(model) {
            _this.initTypeahead(model, ".hallmarks-typeahead", ".hallmark-selector");
        });

        this.model.get("analysis").on("change", this.renderData);

        this.model.get("user_defined_groups").on("add", function(model) {
            _this.updateUserDefinedGroupSelector(model);
        });

        this.renderUI();
        this.initCutoffSliders();

        this.model.fetchStatic();

        $(window).on("resize", jsPlumb.repaintEverything);
    },

    initUserDefinedGroupSelector: function() {
        this.$el.find(".user-defined-group-selector").multiselect({});
    },

    initGroupSelector: function (groups_model, element_selector, target_object) {
        var group_names = _.map(groups_model.get("items"), function(group_data, id) {
            return id;
        });

        var $el = this.$el.find(element_selector);

        _.each(group_names, function (group, idx) {
            group = group.trim();
            if (target_object.selected_groups.indexOf(group) >= 0) {
                $el.append(LineItemTemplate({"li_class": "active", "a_class": "toggle-active", "id": group, "label": group}));
            } else {
                $el.append(LineItemTemplate({"a_class": "toggle-active", "id": group, "label": group}));
            }
        }, this);

        _.each($el.find(".toggle-active"), function(liactive) {
            $(liactive).css({
                "border-bottom": "10px solid "
            });
        }, this);
        $el.find(".toggle-active").click(function (e) {
            $(e.target).parent().toggleClass("active");
            target_object.selected_groups = _.map($el.find(".active").find(".toggle-active"), function(liactive) {
                return $(liactive).data("id");
            });
        });
        $el.find(".toggle-active").hover(function (e) {
            if ($(e.target).parent().hasClass("active")) {

            }
        }, function(e) {

        });
    },

    initCutoffSliders: function() {
        var _this = this;
        var $slider_el = this.$el.find(".cutoff-sliders");

        this.cutoff_values = {
            gene: 0.00001,
            pathway: 0.00001,
            hallmark: 0.00001
        };

        this.initSlider($slider_el.find(".slider.gene-cutoff"), this.cutoff_values.gene,
            function(pval) {
                $slider_el.find(".indicator.gene-cutoff").text(pval);
                _this.cutoff_values.gene = pval;
            });
        this.initSlider($slider_el.find(".slider.pathway-cutoff"), this.cutoff_values.pathway,
            function(pval) {
                $slider_el.find(".indicator.pathway-cutoff").text(pval);
                _this.cutoff_values.pathway = pval;
            });
         this.initSlider($slider_el.find(".slider.hallmark-cutoff"), this.cutoff_values.hallmark,
            function(pval) {
                $slider_el.find(".indicator.hallmark-cutoff").text(pval);
                _this.cutoff_values.hallmark = pval;
            });

        $slider_el.find(".indicator.gene-cutoff").text(this.cutoff_values.gene);
        $slider_el.find(".indicator.pathway-cutoff").text(this.cutoff_values.pathway);
        $slider_el.find(".indicator.hallmark-cutoff").text(this.cutoff_values.hallmark);
    },

    initHandlers: function() {
        var _this = this;

        this.$el.find(".run-analysis-button").click(function() {
            _this.submitAnalysisJob();
        });

        this.$el.find(".ml2-build-new-group").click(function() {
           if (_this.modal_view !== undefined) {
                _this.modal_view.close();
            }

            this.modal_view = new GroupBuilderView({
                el: _this.$el.find(".ml2-modal"),
                model: _this.static_data,
                user_defined_groups: _this.model.get("user_defined_groups")
            });

            _this.$el.find(".ml2-modal").modal("show");
        });

        this.$el.find(".remove-user-defined-groups").click(function() {
            _this.removeSelectedUserDefinedGroups();
        });
    },

    initSlider: function(slider_el, initial_value, callback) {
        var _this = this,
            max_index = this.slider_pvalues.length - 1;

        $(slider_el).slider({
            min: 0,
            max: max_index,
            slide: function(event, ui) {
                var pval = _this.slider_pvalues[ui.value];
                callback(pval);
            },
            value: _.indexOf(_this.slider_pvalues, initial_value)
        });

        return $(slider_el);
    },

    submitAnalysisJob: function() {
        var selected_cancers = this.analysis_config.selected_groups,
            udg = this.getSelectedUserDefinedGroups();

        // At least two groups have to be selected for the analysis
        if ((selected_cancers.length + udg.length) < 2) {
            return;
        }

        var cancer_group_contents = this.static_data.get("groups").get("items"),
            groups_param = _.map(_.pick(cancer_group_contents, selected_cancers), function(data, key) {
                return {
                    id: key,
                    samples: data
                }
            });

        _.chain(udg)
            .each(function(group_model) {
                var g = group_model.toJSON();
                groups_param.push({
                    id: g.label,
                    samples: g.group
                });
            });

        var afn = function(link) {
            return $(link).data("id")
        };

        var genes = _.map(this.$el.find(".gene-selector .item-remover"), afn),
            pathways = _.map(this.$el.find(".pathway-selector .item-remover"), afn),
            hallmarks = _.map(this.$el.find(".hallmark-selector .item-remover"), afn);

        var analysis_params = {
            gene_cutoff: this.cutoff_values.gene,
            pathway_cutoff: this.cutoff_values.pathway,
            hallmark_cutoff: this.cutoff_values.hallmark,
            groups: groups_param
        };

        if (genes.length > 0) {
            analysis_params.genes = genes;
        }
        if (pathways.length > 0) {
            analysis_params.pathways = pathways;
        }
        if (hallmarks.length > 0) {
            analysis_params.hallmarks = hallmarks;
        }

        // Disable the 'Run'-button
        this.$el.find(".run-analysis-button").attr('disabled', 'disabled');

        // Display status message
        this.$el.find(".analysis-indicator").text("Analysis running...");

        this.model.doAnalysis(analysis_params, this.handleAnalysisFailed);
    },

    handleAnalysisFailed: function() {
        // Display error
        this.$el.find(".analysis-indicator").text("Analysis failed!");

        // Enable the 'run'-button
        this.$el.find(".run-analysis-button").removeAttr('disabled');
    },

    initTypeahead: function(model, typeahead_selector, dropdown_selector) {
        var itemlist = model.get("items");

        var UL = this.$el.find(dropdown_selector);
        this.$el.find(typeahead_selector).typeahead({
            source:function (q, p) {
                p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                    return _.map(itemlist, function (item) {
                        if (item.toLowerCase().indexOf(qi) >= 0) return item;
                    });
                }))));
            },

            updater:function (line_item) {
                UL.append(LineItemTemplate({ "label": line_item, "id": line_item, "a_class":"item-remover", "i_class":"icon-trash" }));
                UL.find(".item-remover").click(function(e) {
                    $(e.target).parent().remove();
                });
                return "";
            }
        });

        UL.find(".item-remover").click(function(e) {
            $(e.target).parent().remove();
        });

        UL.sortable();
    },

    updateUserDefinedGroupSelector: function(model) {
        var select = this.$el.find(".user-defined-group-selector");

        var item = $(GroupSelectLineTemplate(
            model.toJSON()
        ));

        select.append(item);
        select.multiselect('rebuild');
    },

    getSelectedUserDefinedGroups: function() {
        var user_groups = this.model.get("user_defined_groups");

        var selected_group_ids = this.$el.find(".user-defined-group-selector")
            .find("option:selected")
            .map(function(index, el) {
                return $(el).val();
            });

        return user_groups.filter(function(group_model) {
            return _.indexOf(selected_group_ids, group_model.get("label")) != -1;
        });
    },

    removeSelectedUserDefinedGroups: function() {
        var selected_groups = this.getSelectedUserDefinedGroups();

        if (selected_groups.length == 0) {
            return;
        }

        var message;
        if (selected_groups.length == 1) {
            message = "Remove one group?";
        }
        else {
            message = "Remove " + selected_groups.length + " groups?";
        }

        if (confirm(message)) {
            var select = this.$el.find(".user-defined-group-selector");

            select
                .find("option:selected")
                .remove();

            select.multiselect('rebuild');

            _.each(selected_groups, function(group_model) {
                group_model.destroy();
            });
        }
    },

    processVerticalLocations: function(nodes) {
        var defaultSpacing = 100;

        if (nodes.length < 0) {
            return;
        }

        _.chain(nodes)
            .groupBy('type')
            .each(function(groupData, typeKey) {
                var curY = 0;

                _.each(groupData, function(node) {
                    if (_.has(node, '_yloc')) {
                        curY = node['_yloc'];
                    }
                    else {
                        curY += defaultSpacing;
                    }

                    node['_top'] = curY;
                });
            });
    },

    renderUI: function () {
        this.$el.html(Template({

        }));

        this.$el.find(".ml2-modal").modal({
            keyboard: true,
            show: false
        });

        this.initHandlers();
    },

    renderData: function (analysis_model) {
        var _this = this;

        // Display status message
        this.$el.find(".analysis-indicator").text("Analysis done!");

        // Enable the 'run'-button
        this.$el.find(".run-analysis-button").removeAttr('disabled');

        var graph_el = this.$el.find(".minigraph-data");

        graph_el.html("");

        var colormap = this.getAnnotation("colors", {}),
            columnOffsets = this.getAnnotation("columnOffsets", {
                Gene: 1,
                Pathway: 1,
                Hallmark: 1
            }),
            nodeWidths = this.getAnnotation("nodeWidths", {
                Gene: 200,
                Pathway: 200,
                Hallmark: 200
            });

        var measure_keys = analysis_model.get("measureKeys");

        var legends = _.chain(measure_keys)
            .without("_yloc")
            .map(function (measure_key) {
                return { "color": colormap[measure_key] || this.defaultColor, "label": measure_key };
            }, this)
            .value();

        this.processVerticalLocations(analysis_model.get("nodes"));

        _.each(analysis_model.get("nodes"), function(node) {
            node.measures = _.map(measure_keys, function(key, index) {
                var value = node.values[index];

                return {
                    "key": key,
                    "value": value,
                    "color": colormap[key] || this.defaultColor,
                    "barlength": Math.round(this.barscale(value))
                }
            }, this);
            node.uid = _.uniqueId("node_");
        }, this);

        var nodesByType = _.groupBy(analysis_model.get("nodes"), "type");

        _.each(nodesByType, function(nodeData, typeKey) {
            nodeData.width = nodeWidths[typeKey];
            nodeData.offset = columnOffsets[typeKey];
        });


        graph_el.html(DataTemplate({
            "nodesByType": nodesByType,
            "legends": legends
        }));

        graph_el.find(".minigraph-legend").draggable();

        graph_el.find(".node-info").css({
            "margin-bottom": this.getAnnotation("panelSpacing", 20),
            "background-color": this.getAnnotation("panelColor", "lightgray")
        });

        graph_el.find(".node-info li").tooltip({});

        graph_el.find(".node-measures").css({
            "margin": this.getAnnotation("barMargin", 2),
            "height": this.getAnnotation("barHeight", 15)
        });

        // Set up a popover for each node
        _.each(analysis_model.get("nodes"), function(node) {
            var $node_el = graph_el.find("#" + node.uid);
            $node_el.popover({
                title: node.id,
                trigger: 'click',
                placement: 'top',
                html: true,
                content: NodePopoverTemplate(node)
            });
        });

        this.renderConnections(analysis_model);

        graph_el.find(".clickable-header.Gene").click(function() {
            if (_this.modal_view !== undefined) {
                _this.modal_view.close();
            }

            this.modal_view = new HeatmapView({
                el: _this.$el.find(".ml2-modal"),
                data: _this.model.get("analysis").get("gene_heatmap"),
                caption: "Heatmap - Genes"
            });

            _this.$el.find(".ml2-modal").modal("show");
        });

        graph_el.find(".clickable-header.Pathway").click(function() {
            if (_this.modal_view !== undefined) {
                _this.modal_view.close();
            }

            this.modal_view = new HeatmapView({
                el: _this.$el.find(".ml2-modal"),
                data: _this.model.get("analysis").get("pathway_heatmap"),
                caption: "Heatmap - Pathways"
            });

            _this.$el.find(".ml2-modal").modal("show");
        });

        graph_el.find(".clickable-header.Hallmark").click(function() {
            if (_this.modal_view !== undefined) {
                _this.modal_view.close();
            }

            this.modal_view = new HeatmapView({
                el: _this.$el.find(".ml2-modal"),
                data: _this.model.get("analysis").get("hallmark_heatmap"),
                caption: "Heatmap - Hallmarks"
            });

            _this.$el.find(".ml2-modal").modal("show");
        });
    },

    renderConnections: function (analysis_model) {
        var jsPlumbConfig = {
            anchors: ["RightMiddle", "LeftMiddle"],
            paintStyle: {
                "lineWidth": this.getAnnotation("lineWidth", 2),
                "strokeStyle": this.getAnnotation("lineColor", "#4212AF")
            },
            endpointStyle: {
                "radius": this.getAnnotation("connectorRadius", 8),
                "fillStyle": this.getAnnotation("connectorFill", "#E79544")
            },
            connector: "Straight",
            isContinuous: true
        };

        var nodesById = _.groupBy(analysis_model.get("nodes"), "id");

        _.each(analysis_model.get("edges"), function (edge) {
            var source = _.first(nodesById[edge.src]);
            var target = _.first(nodesById[edge.trg]);
            jsPlumb.connect(_.extend(jsPlumbConfig, {source: source.uid, target: target.uid}));
        });
    },

    getAnnotation: function(key, defaultValue) {
        var analysis_model = this.model.get("analysis");

        var annotations = analysis_model.get("annotations");
        if (_.has(annotations, key)) {
            return annotations[key];
        }
        else {
            return defaultValue;
        }
    }
});