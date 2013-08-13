define   (['jquery', 'underscore', 'backbone',
    'views/data_menu_section_dropdowns',
    'views/data_menu_modal',
    'hbs!templates/data_menu_section_header'
],
function ( $,        _,            Backbone,
           DataMenuDropdownsView,
           DataMenuModal,
           SectionHeaderTemplate) {

return Backbone.View.extend({
    tagName: 'ul',
    className: "data-menu dropdown-menu",

    initialize: function(options) {
        _.extend(this, options);
    },

    render: function() {
        var that = this;

        _.each(this.sections, function(section) {
            var $section_header_el = $(SectionHeaderTemplate(section.data));

            that.$el.append($section_header_el);

            var dataMenuView = new DataMenuDropdownsView({
                section: section.data,
                el: that.$el
            });

            // Render the dropdowns for each section. The dropdown menu elements
            // are appended to the element of this view inside the render-method.
            dataMenuView.render();

            dataMenuView.on("select-data-item", function(selected) {
                var modalConfig = _.extend({
                    sectionId: section.id,
                    Router: that.Router,
                    el: $("#modal-container")
                }, selected);
                new DataMenuModal(modalConfig);
            });
        });

        return this;
    }
});

// end define
});
