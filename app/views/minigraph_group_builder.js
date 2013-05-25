var LineItemTemplate = require("./templates/line_item");
var GroupConstructTemplate = require("./templates/minigraph_groups");
var GroupGeneLineTemplate = require("./templates/minigraph_gene_row_item");

module.exports = Backbone.View.extend({
    group_build_config: {
        selected_groups: []
    },

    initialize: function () {
        var _this = this;

        _.bindAll(this, "addUserDefinedGroup", "initGroupSelector",
            "initGroupGeneTypeahead", "initHandlers", "getGeneMutationTypes");

        this.model.get("groups").on("change", function(model) {
            _this.initGroupSelector(model, ".group-construct-cancer-selector", _this.group_build_config);
        });

        this.model.get("genes").on("change", function(model) {
            _this.initGroupGeneTypeahead(model, ".group-genes-typeahead", ".group-gene-selector");
        });

        this.render();
        this.initHandlers();
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
    },

    initHandlers: function() {
        var _this = this;

        this.$el.find(".group-save-button").click(function() {
            _this.addUserDefinedGroup();
            _this.$el.modal('hide');
        });
    },

    initGroupGeneTypeahead: function(model, typeahead_selector) {
        var itemlist = model.get("items");

        var tbody = this.$el.find("table.group-gene-types").find("tbody");
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
            label = this.$el.find("input.group-label").val(),
            udg = this.options.user_defined_groups;

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
            rows = this.$el.find("table.group-gene-types").find("tbody").find(".gene-item");

        rows.each(function(index, gene_item) {
            var data = $(gene_item).data();
            genes[data.id] = data.type;
        });

        return genes;
    },

    render: function() {
        this.$el.html(GroupConstructTemplate({

        }));
    }
});