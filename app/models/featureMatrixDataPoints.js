module.exports = Backbone.Model.extend({
    url:function () {
        return this.get("data_uri");
    },

    parse:function (data) {
        this.set("items", data.items);
        if (_.isEmpty(data.items)) {
            return { "DATA_BY_CANCER":{ "ROWS":[], "COLUMNS":[], "DATA":[] } };
        }

        var itemsByCancer = _.groupBy(data.items, "cancer");
        var dataByCancer = {};
        _.each(itemsByCancer, function (items, cancer) {
            if (_.isEmpty(items)) {
                dataByCancer[cancer] = { "ROWS":[], "COLUMNS":[], "DATA":[] };
            } else {
                var ROWS = _.uniq(_.pluck(items, "feature_id"));
                var COLUMNS = _.uniq(_.pluck(items, "sample_id"));
                var coldict = {};
                _.each(COLUMNS, function (col, idx) {
                    coldict[col] = idx;
                });
                var rowdict = {};
                _.each(ROWS, function (row, idx) {
                    rowdict[row] = idx;
                });

                var DATA = [];
                _.each(items, function (data_item) {
                    var row_idx = rowdict[data_item["feature_id"]];
                    var col_idx = coldict[data_item["sample_id"]];

                    var row_array = DATA[row_idx] || [];
                    row_array[col_idx] = data_item["value"];
                    DATA[row_idx] = row_array;
                });
                dataByCancer[cancer] = { "ROWS":ROWS, "COLUMNS":COLUMNS, "DATA":DATA };
            }
        });

        return { "DATA_BY_CANCER":dataByCancer };
    }
});