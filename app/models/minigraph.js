var GroupsModel = Backbone.Model.extend({
    tsvparse: function (text) {
        var header,
            lines = d3.tsv.parseRows(text, function (row, i) {
                if (i > 0) {
                    var o = {}, j = -1, m = header.length;
                    while (++j < m) {
                        var rowvalue = row[j];
                        if (_.isString(rowvalue)) rowvalue = rowvalue.trim();
                        o[header[j]] = rowvalue;
                    }
                    return o;

                }
                // Process the header line
                else {
                    header = _.map(row, function (k, header_index) {
                        if (header_index == 0) {
                            return 'id'
                        }
                        else if (_.isString(k)){
                            return k.trim();
                        }
                        else {
                            return k;
                        }
                    });
                    return null
                }
            });

        var groups = {};

        _.each(lines, function(line_data) {
            var current_id;

            _.each(line_data, function(value, field_id) {
                if (field_id == 'id') {
                    current_id = value;
                    groups[current_id] = [];
                }
                else {
                    if (value != '0') {
                        groups[current_id].push(field_id);
                    }
                }
            });
        });

        var ids = _.rest(header),
            indices = _.map(ids, function(d, i) {return i;}),
            id_to_index_map = _.reduce(ids, function(memo, d, index) {
                memo[d] = index;
                return memo;
            }, {});

        return {
            indices: indices,
            ids: ids,
            id_to_index_map: id_to_index_map,
            items: groups
        };
    },

    parse: function (txt) {
        return this.tsvparse(txt);

    },

    fetch: function (options) {
        return Backbone.Model.prototype.fetch.call(this, _.extend({dataType: "text"}, options));
    }
});

var BasicModel = Backbone.Model.extend({
    parse: function (text) {
        var rows = d3.tsv.parseRows(text);

        return {
            items:
                _.chain(rows)
                   .map(function(row) {
                        return row[0].trim();
                    })
                    .filter(function(row) {
                        return row.length > 0;
                    })
                    .value()
        }
    },

    fetch: function (options) {
        var params = _.extend({
            dataType: "text"
        }, options);

        return Backbone.Model.prototype.fetch.call(this, params);
    }
});

var EmptyModel = Backbone.Model.extend({

});

var SparseMatrixModel = Backbone.Model.extend({
    parse: function (text) {
        var rows = d3.tsv.parseRows(text);

        return {
            items:
                _.chain(rows)
                    .reduce(function(memo, row) {
                        var gene_id = row[0].trim();
                        memo[gene_id] =_.chain(row)
                            .rest()
                            .map(function(d) {
                                return d.trim();
                            })
                            .filter(function(d) {
                                return d.length > 0;
                            })
                            .map(function(d) {
                                return parseInt(d);
                            })
                            .value();

                        return memo;
                    }, {})
                    .value()
        };
    },

    fetch: function (options) {
        var params = _.extend({
            dataType: "text"
        }, options);

        return Backbone.Model.prototype.fetch.call(this, params);
    }
});

var ML2AnalysisModel = Backbone.Model.extend({
    url: function () {
        return "svc/ML2";
    },

    parse: function (json) {
        return {
            nodes: json.nodes.rows,
            measureKeys: json.nodes.ids,
            edges: json.edges.rows,
            annotations: json.annotations,
            gene_heatmap: json.geneheatmap,
            pathway_heatmap: json.pathwayheatmap,
            hallmark_heatmap: json.hallmarkheatmap
        };
    },

    fetch: function (options) {
        var params = _.extend({
            dataType: "json",
            type: "post",
            data: {
                query: JSON.stringify(options.query)

            }
        }, options);

        return Backbone.Model.prototype.fetch.call(this, params);
    }
});

var UserDefinedGroupsCollection = Backbone.Collection.extend({

});

module.exports = Backbone.Model.extend({
    initialize: function() {
        this.set("analysis", new ML2AnalysisModel());

        this.set("user_defined_groups", new UserDefinedGroupsCollection());

        var static_data = new EmptyModel();
        static_data.set("groups", new GroupsModel());
        static_data.set("mutations", new SparseMatrixModel());
        static_data.set("genes", new BasicModel());
        static_data.set("pathways", new BasicModel());
        static_data.set("hallmarks", new BasicModel());

        this.set("static_data", static_data);
    },

    url: function () {
        return this.get("data_uri")
    },

    parse: function () {
        return { };
    },

    fetch: function (options) {
        var params = _.extend({
            dataType: "text"
        }, options);

        return Backbone.Model.prototype.fetch.call(this, params);
    },

    fetchStatic: function() {
        var base_uri = "svc/data/domains/" + this.get("analysis_id") + '/' + this.get("dataset_id") + '/',
            static_data = this.get("static_data");

        static_data.get("groups").fetch({
            url: base_uri + this.get("catalog_unit")['preset_groups'],
            async: true,
            success: function() {
                console.log("Groups loaded");
            }
        });

        static_data.get("mutations").fetch({
            url: base_uri + this.get("catalog_unit")['gene_mutations'],
            async: true,
            success: function(res) {
                console.log("Mutation IDs loaded");
            }
        });

        static_data.get("genes").fetch({
            url: base_uri + this.get("catalog_unit")['genes'],
            async: true,
            success: function(res) {
                console.log("Genes loaded");
            }
        });

        static_data.get("pathways").fetch({
            url: base_uri + this.get("catalog_unit")['pathways'],
            async: true,
            success: function(res) {
                console.log("Pathways loaded");
            }
        });

        static_data.get("hallmarks").fetch({
            url: base_uri + this.get("catalog_unit")['hallmarks'],
            async: true,
            success: function(res) {
                console.log("Hallmarks loaded");
            }
        });
    },

    doAnalysis: function(analysis_params) {
        var analysis = this.get("analysis");
        analysis.fetch({
            query: analysis_params
        })
    },

    get_base_uri: function (suffix) {
        var data_uri = this.get("data_uri");
        var dataset_id = this.get("dataset_id");
        return data_uri + "/" + this.get("catalog_unit")[suffix];
    }
});