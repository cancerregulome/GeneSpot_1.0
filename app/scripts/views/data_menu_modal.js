define   ([
    'jquery', 'underscore', 'backbone',

    'hbs!templates/data_menu_modal',
    'hbs!templates/line_item'],
function ( $,        _,            Backbone,
           MenuModalTemplate,
           LineItemTemplate) {

return Backbone.View.extend({

    initialize:function (options) {
        _.extend(this, options);

        this.$el.append(MenuModalTemplate());

        var sectionId = this.sectionId;
        var unitId = this.unitId;
        var itemId = this.itemId;

        var section = this.Router.Datamodel.get(sectionId);
        var catalog = section[unitId].catalog;
        var item = catalog[itemId];
        var views = this.Router.ViewMappings[item.model] || [
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
            this.Router.navigate("#v/" + sectionId + "/" + unitId + "/" + itemId + "/" + $(e.target).data("id"), {trigger: true});
        });
    }
});

// end define
});
