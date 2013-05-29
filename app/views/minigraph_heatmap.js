var HeatmapTemplate = require("./templates/minigraph_heatmap");

module.exports = Backbone.View.extend({
    group_build_config: {
        selected_groups: []
    },

    initialize: function () {
        _.bindAll(this, "render");

        this.render();
    },

    render: function() {
        var data = this.options.data;

        var min_intensity = d3.min(d3.min(data.rows, function(r) {
            return r.values;
        }));
        var max_intensity = d3.max(d3.max(data.rows, function(r) {
            return r.values;
        }));

        var color_scale = d3.scale.linear()
            .domain([min_intensity, (min_intensity + max_intensity) / 2.0, max_intensity])
            .interpolate(d3.interpolateRgb)
            .range(['blue', 'green', 'red']);

        var tabledata = {
            column_labels: _.map(data.ids, function(d) {
                return {
                    id: d
                };
            }),
            rows: _.map(data.rows, function(row) {
                return {
                    id: row.id,
                    values: _.map(row.values, function(value) {
                        return {
                            val: value,
                            col: color_scale(value)
                        };
                    })
                }
            })
        };

        this.$el.html(HeatmapTemplate(tabledata));
    },

    close: function() {
        this.remove();
        this.unbind();
    }
});
