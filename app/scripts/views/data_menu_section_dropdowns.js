define   (['jquery', 'underscore', 'backbone', 'hbs!templates/data_menu_section_dropdowns'],
function ( $,        _,            Backbone,   Template) {

return Backbone.View.extend({
    initialize:function (options) {
        _.extend(this, options);
    },

    render: function() {
        var that = this;

        var menus = _.map(this.section, function (unit, unitId) {
            if (unit.catalog && !_.isEmpty(unit.catalog)) {
                return {
                    "label":unit.label,
                    "items":_.map(unit.catalog, function (item, itemId) {
                        return {
                            "label":item.label || itemId,
                            "unitId":unitId,
                            "itemId":itemId
                        };
                    })
                };
            }
        });

        menus = _.compact(menus);
        _.each(menus, function(menu_item) {
            var $menu_item_el = $(Template(menu_item));

            $menu_item_el.find("a.selected-data-item").click(function(e) {
               that.trigger("select-data-item", {
                   "unitId":$(e.target).data("unitid"),
                   "itemId":$(e.target).data("itemid")
               });
            });

            that.$el.append($menu_item_el);
        });

        return this;
    }
});

// end define
});