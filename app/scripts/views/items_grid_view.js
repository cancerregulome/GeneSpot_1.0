define   (['jquery', 'underscore', 'backbone', 'hbs!templates/items_grid'],
function ( $,        _,            Backbone, Template) {

return Backbone.View.extend({

    initialize:function (options) {
        _.extend(this, options);
        _.bindAll(this, "processData");

        this.model.on("load", this.processData);
    },

    processData:function () {
        var items = this.model.get("items");
        var headers = _.without(_.keys(items[0]), "uri", "id");
        var rows = _.map(items, function (item) {
            return { "values":_.map(headers, function (header) {
                return item[header];
            })};
        });

        this.$el.html(Template({ "headers":headers, "rows":rows }));
    }
});

// end define
});
