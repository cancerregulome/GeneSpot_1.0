var HeatmapTemplate = require("./templates/minigraph_heatmap");

module.exports = Backbone.View.extend({
    group_build_config: {
        selected_groups: []
    },

    initialize: function () {
        _.bindAll(this, "render");

        this.color_scale_rgb = [
            [255, 255, 255],
            [247, 232, 207],
            [246, 210, 165],
            [251, 190, 125],
            [248, 166, 78],
            [227, 133, 15],
            [186, 105, 0],
            [140, 79, 0],
            [93, 53, 0],
            [47, 26, 0],
            [0, 0, 0]
        ];

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

        var color_scale_domain = d3.range(min_intensity, max_intensity, (max_intensity - min_intensity) / (this.color_scale_rgb.length - 1));
        color_scale_domain.push(max_intensity);

        var color_scale = d3.scale.linear()
            .domain(color_scale_domain)
            .interpolate(d3.interpolateRgb)
            .range(_.map(this.color_scale_rgb, function(d) {
                // Construct a CSS color identifier, for example 'rgb(255,255,255)'
                return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
            }));

        var tabledata = {
            caption: this.options.caption,
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
