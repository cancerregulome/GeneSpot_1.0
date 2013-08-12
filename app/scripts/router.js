define   (['jquery', 'underscore', 'backbone', 'bootstrap',
    'views/topbar_view',
    'views/data_menu',
    'views/data_menu_modal',
    'views/sessions_view'
],
function ( $,        _,            Backbone, Bootstrap,
           TopNavBar,
           DataMenuView,
           DataMenuModal,
           SessionsView) {

return Backbone.Router.extend({
    targetEl: "#mainDiv",
    routes:{
        "":"home_view",
        "v/*uri/:view_name":"viewsByUri",
        "s/*sessionId": "loadSessionById"
    },

    initialize: function(options) {
        if (options) _.extend(this, options);

        this.$el = $(this.targetEl);
    },

    views: {

    },

    initTopNavBar:function(params) {
        var that = this;

        var topnavbar = new TopNavBar(params);
        $("#navigation-container").append(topnavbar.render().el);

        var section_ids = _.without(_.keys(this.Datamodel.attributes), "url");
        _.each(section_ids, function(section_id) {
            var dataMenuView = new DataMenuView({
                "section": this.Datamodel.get(section_id),
                className: "data-menu dropdown-menu"
            });
            $(".data-dropdown").append(dataMenuView.render().el);
            dataMenuView.on("select-data-item", function(selected) {
                var modalConfig = _.extend({
                    sectionId: section_id,
                    Router: that }, selected);
                var dataMenuModal = new DataMenuModal(modalConfig);
                $("body").append(dataMenuModal.render().el);
            });
        }, this);

        var sessionsView = new SessionsView({
            Router: this
        });
        this.$el.find(".sessions-container").html(sessionsView.render().el);
    },

    loadSessionById: function(sessionId) {
        if (!_.isEmpty(sessionId)) {
            var selectedSession = _.find(this.Sessions.All.models, function(m) {
                return _.isEqual(m.get("id"), sessionId);
            });
            if (selectedSession) {
                this.Sessions.Active = selectedSession;
                var route = selectedSession.get("route");
                if (!_.isEmpty(route)) {
                    this.navigate(route, {trigger: true});
                }
            }
        }
    },
    
    home_view:function () {
        // TODO
    },

    fetchAnnotations: function (dataset_id) {
        var that = this;

        if (_.isEmpty(this.Annotations[dataset_id])) {
            var annotations = new this.Models.Annotations({
                    "url":"svc/data/annotations/" + dataset_id + ".json",
                    "dataType":"json"}
            );

            annotations.fetch({
                "async":false,
                "dataType":"json",
                "success":function () {
                    that.Annotations[dataset_id] = annotations.get("itemsById");
                }
            });
        }
        return this.Annotations[dataset_id];
    },

    viewsByUri: function(uri, view_name, options) {
        var parts = uri.split("/");
        var data_root = parts[0];
        var analysis_id = parts[1];
        var dataset_id = parts[2];
        var model_unit = this.Datamodel.get(data_root)[analysis_id];
        var catalog = model_unit.catalog;
        var catalog_unit = catalog[dataset_id];
        var modelName = catalog_unit.model;
        var serviceUri = catalog_unit.service || model_unit.service || "data/" + uri;
        var Model = this.Models[modelName || "Default"];

        var model_optns = _.extend(options || {}, {
            "data_uri": "svc/" + serviceUri,
            "analysis_id": analysis_id,
            "dataset_id": dataset_id,
            "model_unit": model_unit,
            "catalog_unit": catalog_unit
        });

        this.fetchAnnotations(dataset_id);

        var model = new Model(model_optns);
        _.defer(function() {
            model.fetch({
                success:function () {
                    if (model.make_copy) model.make_copy(Model, model_optns);
                    model.trigger("load");
                }
            });
        });

        var view_options = _.extend({"model":model}, (model_unit.view_options || {}), (options || {}));

        var ViewClass = this.Views[view_name];
        var view = new ViewClass(view_options);
        this.$el.html(view.render().el);
        return view;
    }
});

// end define
});