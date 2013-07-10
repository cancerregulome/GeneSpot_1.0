define   (['jquery', 'underscore', 'backbone'],
function ( $,        _,            Backbone) {

var SessionModel = Backbone.Model.extend({
    "defaults": {
        "label": "Untitled",
        "route": ""
    }
});

return Backbone.Collection.extend({
    model: SessionModel,
    url: "svc/storage/sessions"
});

// end define
});