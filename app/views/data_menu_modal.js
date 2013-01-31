var Template = require("../templates/data_menu_modal");
var LineItemTemplate = require("../templates/line_item");

module.exports = Backbone.View.extend({

    initialize:function (options) {
        _.extend(this, options);
        _.bindAll(this, "afterRender");

        $("body").append(Template());

        var sectionId = this.sectionId;
        var unitId = this.unitId;
        var itemId = this.itemId;

        var section = qed.Datamodel.get(sectionId);
        var catalog = section[unitId].catalog;
        var item = catalog[itemId];
        var views = qed.ViewMappings[item.model] || [
            {"label":"Grid", "id":"grid"}
        ];

        this.$el.find(".modal-header h4").html(item.label);
        this.$el.find(".modal-body .info").html(item.description);
        var UL = this.$el.find(".data-links");
        _.each(views, function (view) {
            UL.append(LineItemTemplate({ "label":view.label, "a_class": "selectable-link", "id": view.id }));
        });

        var _this = this;
        UL.find(".selectable-link").click(function(e) {
            _this.$el.find(".modal").parent().empty();
            qed.Router.navigate("#v/" + sectionId + "/" + unitId + "/" + itemId + "/" + $(e.target).data("id"), {trigger: true});
        });
    }

});
