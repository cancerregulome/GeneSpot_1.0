var Template = require("../templates/minigraph");
var DataTemplate = require("./templates/minigraph_data");
var GroupConstructTemplate = require("./templates/minigraph_groups");
var LineItemTemplate = require("./templates/line_item");
var GroupGeneLineTemplate = require("./templates/minigraph_gene_row_item");
var GroupSelectLineTemplate = require("./templates/minigraph_group_menu_item");

module.exports = Backbone.View.extend({
    analysis_config: {
        selected_groups: []
    },
    group_build_config: {
        selected_groups: []
    },
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
        _.bindAll(this, "addUserDefinedGroup", "buildUserDefinedGroup", "initUserDefinedGroupSelector", "initGroupSelector",
            "initTypeahead", "initGroupGeneTypeahead", "initHandlers", "submitAnalysisJob", "getSelectedUserDefinedGroups",
            "getGeneMutationTypes", "renderData", "renderUI");

        var _this = this;

        this.model.get("groups").on("change", function(model) {
            _this.initGroupSelector(model, ".preset-group-selector-minigraph", _this.analysis_config);
            _this.initGroupSelector(model, ".group-construct-cancer-selector", _this.group_build_config);

            _this.initUserDefinedGroupSelector();
        });

        this.model.get("analysis").on("change", this.renderData);

        this.model.get("genes").on("change", function(model) {
            _this.initTypeahead(model, ".genes-typeahead", ".gene-selector");
            _this.initGroupGeneTypeahead(model, ".group-genes-typeahead", ".group-gene-selector");
        });

        this.model.get("pathways").on("change", function(model) {
            _this.initTypeahead(model, ".pathways-typeahead", ".pathway-selector");
        });

        this.model.get("hallmarks").on("change", function(model) {
            _this.initTypeahead(model, ".hallmarks-typeahead", ".hallmark-selector");
        });

        this.model.get("user_defined_groups").on("add", function(model) {
            _this.updateUserDefinedGroupSelector(model);
        });

        this.renderUI();

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

    initHandlers: function() {
        var _this = this;

        this.$el.find(".run-analysis-button").click(function() {
            _this.submitAnalysisJob();
        });

        this.$el.find(".group-save-button").click(function() {
            _this.addUserDefinedGroup();
        });
    },

    submitAnalysisJob: function() {
        var selected_cancers = this.analysis_config.selected_groups,
            udg = this.getSelectedUserDefinedGroups();

        // At least two groups have to be selected for the analysis
        if ((selected_cancers.length + udg.length) < 2) {
            return;
        }

        var cancer_group_contents = this.model.get("groups").get("items"),
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

        // Check the value in the cutoff input is a floating point number
        var cutoff = parseFloat(this.$el.find(".cutoff-value").val());
        if (isNaN(cutoff)) {
            return;
        }

        var afn = function(link) {
            return $(link).data("id")
        };

        var genes = _.map(this.$el.find(".gene-selector .item-remover"), afn),
            pathways = _.map(this.$el.find(".pathway-selector .item-remover"), afn),
            hallmarks = _.map(this.$el.find(".hallmark-selector .item-remover"), afn);

        var analysis_params = {
            cutoff: cutoff,
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

        this.model.doAnalysis(analysis_params);
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

    initGroupGeneTypeahead: function(model, typeahead_selector, dropdown_selector) {
        var itemlist = model.get("items");

        var tbody = this.$el.find(".ml2-group-constructor").find("table.group-gene-types").find("tbody");
        this.$el.find(typeahead_selector).typeahead({
            source:function (q, p) {
                p(_.compact(_.flatten(_.map(q.toLowerCase().split(" "), function (qi) {
                    return _.map(itemlist, function (item) {
                        if (item.toLowerCase().indexOf(qi) >= 0) return item;
                    });
                }))));
            },

            updater:function (line_item) {
                var row = $(GroupGeneLineTemplate({"id": line_item}));
                row.data({'type': 'M'});
                tbody.append(row);

                row.find(".mutation-type-setter").click(function(e) {
                    $btn = $(e.target);
                    $row = $btn.parent().parent();

                    var id = $row.data()['type'];
                    if (id == 'W') {
                        $row.data('type', 'M');
                        $btn.text('M');
                    }
                    else {
                        $row.data('type', 'W');
                        $btn.text('W');
                    }
                });

                row.find(".item-remover").click(function(e) {
                    $(e.target).parent().parent().remove();
                });

                return "";
            }
        });
    },

    addUserDefinedGroup: function() {
        var cancers = this.model.get("groups").get("items"),
            genes = this.getGeneMutationTypes(),
            label = this.$el.find(".ml2-group-constructor").find("input.group-label").val(),
            udg = this.model.get("user_defined_groups");

        if (label.trim().length == 0) {
            return;
        }

        // The group name has to be unique
        if (udg.find(function(model) {return model.get("label") == label;}) !== undefined) {
            return;
        }
        if (_.has(cancers, label)) {
            return;
        }

        var group = this.buildUserDefinedGroup(genes);

        udg.add({
            label: label,
            group: group
        });
    },

    buildUserDefinedGroup: function(genes) {
        var _this = this;

        var gene_mutations = this.model.get("mutations").get("items"),
            all_indices = this.model.get("groups").get("indices"),
            all_ids = this.model.get("groups").get("ids"),
            id_to_index_map = _this.model.get("groups").get("id_to_index_map"),
            cancers_union;

        // If no cancers are selected, use all samples
        if (_this.group_build_config.selected_groups.length == 0) {
            cancers_union = all_indices;
        }
        else {
            // Find the union of the samples in the selected cancers
            var group_contents = _this.model.get("groups").get("items");
            cancers_union = _
                .chain(group_contents)
                .pick(_this.group_build_config.selected_groups)
                // Map ID-strings to integers
                .map(function(group) {
                    return _.map(group, function(id) {
                        return id_to_index_map[id];
                    });
                })
                //
                .reduce(function(memo, group) {
                    memo = _.union(memo, group);
                    return memo;
                }, [])
                .value();
        }

        // Find the intersection of the selected genes
        var genes_intersection = _
            .chain(genes)
            .map(function(mutation_type, gene_id) {
                if (mutation_type == 'M') {
                    return gene_mutations[gene_id];
                }
                else {
                    return _.difference(all_indices, gene_mutations[gene_id]);

                }
            })
            .reduce(function(memo, indices_per_gene) {
                memo = _.intersection(memo, indices_per_gene);
                return memo;
            }, all_indices)
            .value();

        var group = _.chain(_.intersection(genes_intersection, cancers_union))
            .map(function(index) {
                return all_ids[index]
            })
            .value();

        return group;
    },

    getGeneMutationTypes: function() {
        var genes = {},
            rows = this.$el.find(".ml2-group-constructor").find("table.group-gene-types").find("tbody").find(".gene-item");

        rows.each(function(index, gene_item) {
            var data = $(gene_item).data();
            genes[data.id] = data.type;
        });

        return genes;
    },

    updateUserDefinedGroupSelector: function(model) {
        var select = this.$el.find(".user-defined-group-selector");

        var item = $(GroupSelectLineTemplate(
            model.toJSON()
        ));

        select.append(item);

        this.$el.find(".user-defined-group-selector").multiselect('rebuild');

        this.getSelectedUserDefinedGroups();
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

        this.$el.find(".ml2-group-constructor").html(GroupConstructTemplate({}));

        this.initHandlers();
    },

    renderData: function (analysis_model) {
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
            nodeData.offset =  columnOffsets[typeKey];
        });

        var graph_el = this.$el.find(".minigraph-data");

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

        this.renderConnections(analysis_model);
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