var View = require('./view');
var template = require('./templates/oncovis');
var FeatureMatrix2 = require('../models/featureMatrix2');
var Genelist = require('./gene_list_view');

module.exports = View.extend({
    model:FeatureMatrix2,
    template:template,
    genelistView: new Genelist(),
    label:"Oncovis",
    className: "row-fluid",
    rowLabels: [],

    events:{
        "click .reset-sliders":"resetSliders"
    },

    initialize:function () {
        _.bindAll(this, 'renderGraph', 'initControls', 'render', 'resetSliders', 'onNewRows');
    },

    afterRender:function () {
        this.initControls();
        this.model.on('load', this.renderGraph);

        this.$el.find("#genelist-modal .modal-body").append(this.genelistView.render().el);
        this.genelistView.on("genelist-selected", this.onNewRows);
    },

    initControls:function () {
        console.log("initControls:start");

        this.$el.find(".slider_barheight").oncovis_range({ storageId:"slider_barheight", min:10, max:50, initialStep:20 });
        this.$el.find(".slider_rowspacing").oncovis_range({ storageId:"slider_rowspacing", min:10, max:50, initialStep:20 });
        this.$el.find(".slider_barwidth").oncovis_range({ storageId:"slider_barwidth", min:1, max:10, initialStep:5 });
        this.$el.find(".slider_barspacing").oncovis_range({ storageId:"slider_barspacing", min:0, max:10, initialStep:2 });
        this.$el.find(".slider_clusterspacing").oncovis_range({ storageId:"slider_clusterspacing", min:0, max:50, initialStep:10 });
        this.$el.find(".slider_fontsize").oncovis_range({ storageId:"slider_fontsize", min:5, max:21, initialStep:14 });

        var oncovis_container = this.$el.find(".oncovis-container");
        var visrangeFn = function (property) {
            return function (event, value) {
                console.log("visrangeFn(" + property + "=" + value + ")");
                var dim = {};
                dim[property] = value;
                oncovis_container.update(dim);
            }
        };

        this.$el.find(".slider_barheight").on("slide-to", visrangeFn("bar_height"));
        this.$el.find(".slider_rowspacing").on("slide-to", visrangeFn("row_spacing"));
        this.$el.find(".slider_barwidth").bind("slide-to", visrangeFn("bar_width"));
        this.$el.find(".slider_barspacing").bind("slide-to", visrangeFn("column_spacing"));
        this.$el.find(".slider_clusterspacing").bind("slide-to", visrangeFn("cluster_spacing"));
        this.$el.find(".slider_fontsize").bind("slide-to", visrangeFn("label_fontsize"));

        console.log("initControls:end");
    },

    getColumnModel: function() {
        var _this = this;
        var unsorted_columns = [];
        _.each(this.model.COLUMNS, function(column_name, col_idx) {
            var cluster_idx = _this.model.ROWS.indexOf(_this.model.dims.getClusterProperty());
            var cluster_value = _this.model.DATA[cluster_idx][col_idx].trim();
            var column = { "name": column_name.trim(), "cluster": cluster_value, "values": [cluster_value] };
            _.each(_this.rowLabels, function(row_label) {
                var row_idx = _this.model.ROWS.indexOf(row_label);
                column.values.push(_this.model.DATA[row_idx][col_idx].trim());
            });
            unsorted_columns.push(column);
        });
        var sorted_columns = _.sortBy(unsorted_columns, "values");
        var grouped_columns = _.groupBy(sorted_columns, "cluster");

        var columns_by_cluster = {};
        _.each(grouped_columns, function(values, key) {
            columns_by_cluster[key] = [];
            _.each(values, function(value) {
                columns_by_cluster[key].push(value.name);
            })
        });
        return columns_by_cluster;
    },

    renderGraph:function () {
        if (!this.rowLabels || !this.rowLabels.length) {
            this.rowLabels = this.model.dims.getRowLabels();
        }

        console.log("renderGraph:start");

        var columns_by_cluster = this.getColumnModel();
        var data = {};
        var _this = this;
        _.each(this.rowLabels, function(rowLabel) {
            var row_idx = _this.model.ROWS.indexOf(rowLabel);
            var categories = _.uniq(_this.model.DATA[row_idx]);

            var colorscales = colorbrewer.YlOrBr[(categories.length < 3) ? 3 : categories.length];
            _.each(_this.model.DATA[row_idx], function(cell, cellIdx) {
                cell = cell.trim();
                var columnLabel = _this.model.COLUMNS[cellIdx].trim();
                if (!data[columnLabel]) data[columnLabel] = {};
                data[columnLabel][rowLabel] = { "value":cell, "row": rowLabel, "colorscale": colorscales[cell], "label":columnLabel + "\n" + rowLabel + "\n" + cell };
            });
        });

        var optns = {
            plot_width:3000,
            plot_height:3000,
            label_width:70,
            highlight_fill:colorbrewer.RdYlGn[3][2],
            color_fn:function (d) {
                return d ? d.colorscale : "white";
            },
            columns_by_cluster:columns_by_cluster,
            cluster_labels: _.keys(columns_by_cluster),
            row_labels:this.rowLabels,
            // initial values based on slider defaults
            bar_height: this.$el.find(".slider_barheight").oncovis_range("value"),
            row_spacing: this.$el.find(".slider_rowspacing").oncovis_range("value"),
            bar_width: this.$el.find(".slider_barwidth").oncovis_range("value"),
            column_spacing: this.$el.find(".slider_barspacing").oncovis_range("value"),
            cluster_spacing: this.$el.find(".slider_clusterspacing").oncovis_range("value"),
            label_fontsize: this.$el.find(".slider_fontsize").oncovis_range("value")
        };

        this.$el.find(".oncovis-container").oncovis(data, optns);

        console.log("renderGraph:end");
    },

    onNewRows: function(genelist) {
        this.$el.find("#genelist-modal").modal("hide");

        var all_rows = this.model.ROWS;
        this.rowLabels = _.flatten(_.compact(_.map(genelist.values, function(gene) {
            return _.flatten(_.compact(_.map(all_rows, function(row) {
                if (row.toLowerCase().indexOf(gene.toLowerCase()) >= 0) return row;
            })));
        })));
        console.log("reload-model");
        this.model.trigger('load');
    },
        
    resetSliders:function () {
        this.$el.find(".slider_barheight").oncovis_range("reset");
        this.$el.find(".slider_rowspacing").oncovis_range("reset");
        this.$el.find(".slider_barwidth").oncovis_range("reset");
        this.$el.find(".slider_barspacing").oncovis_range("reset");
        this.$el.find(".slider_clusterspacing").oncovis_range("reset");
        this.$el.find(".slider_fontsize").oncovis_range("reset");
    }
});
