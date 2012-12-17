var Template = require("../views/templates/pubcrawl_network");
var DetailsTabTemplate = require("../views/templates/pubcrawl_details");

var NodeDetailsModel = Backbone.Model.extend({
    docs: [],
    //url for this model is the solr connection to retrieve documents related to this node

    url: function(){
        return this.get("data_uri") + "?qt=distributed_select&sort=pub_date_year desc&wt=json&rows=1000&q=%2Btext%3A%28'" + this.nodeName + "'%29&fq=pub_date_year:[1991 TO 2012]" +
            "&hl.q=abstract_text%3A"+ this.nodeName + " article_title%3A" + this.nodeName;
    },

    initialize: function(data){
        //setup the various model items by finding all edges with the nodeName and putting into the appropriate jsonarray
        this.nodeName = data.nodeName;
        this.nmdDetailsModel = [];
        this.domineDetailsModel = [];

        this.node = _.find(data.networkModel.nodes.models, function(nodemodel) {
            return _.isEqual(nodemodel.name, data.nodeName);
        });

        _.each(data.networkModel.edges.models, function (edge) {
            if (edge.source.name == this.node.name) {
                if (edge.relType == "ngd") {
                    this.nmdDetailsModel.push({name:edge.target.name, combocount:edge.combocount, termcount:edge.target.termcount, nmd:edge.nmd});
                }
                else if (edge.relType == "domine") {
                    this.domineDetailsModel.push({term1:edge.source.name, term2:edge.target.name, pf1:edge.pf1, pf2:edge.pf2,
                        pf1_count:edge.pf1_count, pf2_count:edge.pf2_count, type:edge.type, uni1:edge.uni1, uni2:edge.uni2});
                }
            }
            else if (edge.target.name == this.node.name) {
                //don't need to do ngd here, since it is currently doubled, should be able to also remove domine once it is doubled correctly
                if (edge.relType == "domine") {
                    this.domineDetailsModel.push({term1:edge.target.name, term2:edge.source.name, pf1:edge.pf1, pf2:edge.pf2,
                        pf1_count:edge.pf1_count, pf2_count:edge.pf2_count, type:edge.type, uni1:edge.uni1, uni2:edge.uni2});
                }
            }
        }, this);

    },

    parse: function(response){
        if (response.response.docs != null) {
            _.each(response.response.docs, function (doc) {
                var highlighting = response.highlighting[doc.pmid];
                if (highlighting) {
                    if (highlighting.abstract_text) doc.abstract_text = highlighting.abstract_text;
                    if (highlighting.article_title) doc.article_title = highlighting.article_title;
                }
            }, this);
            this.docs = response.response.docs;
        }
    }

});

var EdgeDetailsModel = Backbone.Model.extend({
    docs: [],
    //url for this model is the solr connection to retrieve documents related to this node
    url: function(){
        return this.get("data_uri") + "?qt=distributed_select&sort=pub_date_year desc&wt=json&rows=1000&q=%2Btext%3A%28'" + this.source + "'%29%20%2Btext%3A%28'" + this.target + "'%29&fq=pub_date_year:[1991 TO 2012]" +
            "&hl.q=abstract_text%3A" + this.target + " article_title%3A" + this.target + " abstract_text%3A"+ this.source + " article_title%3A" + this.source;
    },

    initialize: function(data){
        //setup the various model items by finding all edges with the nodeName and putting into the appropriate jsonarray
        this.data_uri=data.data_uri;
        this.source = data.edge.source;
        this.target = data.edge.target;
        this.nmdDetailsModel = [];
        this.domineDetailsModel = [];

        _.each(data.networkModel.edges.models, function(edge) {
            if(edge.source.name == this.source && edge.target.name == this.target){
                if(edge.nmd != null){
                    var edgeItem={term1: edge.source.name, term2: edge.target.name,combocount: edge.combocount, termcount: edge.target.termcount,nmd:edge.nmd};
                    this.nmdDetailsModel.push(edgeItem);
                }
                else if(edge.relType == "domine"){
                    var edgeItem={term1: edge.source.name, term2: edge.target.name, pf1: edge.pf1, pf2: edge.pf2,
                        pf1_count: edge.pf1_count, pf2_count: edge.pf2_count, type: edge.type, uni1: edge.uni1, uni2: edge.uni2};
                    this.domineDetailsModel.push(edgeItem);
                }
            }
        }, this);

    },

    parse:function (response) {
        if (response.response.docs != null) {
            _.each(response.response.docs, function (doc) {
                var highlighting = response.highlighting[doc.pmid];
                if (highlighting) {
                    if (highlighting.abstract_text) doc.abstract_text = highlighting.abstract_text;
                    if (highlighting.article_title) doc.article_title = highlighting.article_title;
                }
            }, this);
            this.docs = response.response.docs;
        }
    }

});

var NodeTableView = Backbone.View.extend({

    initialize: function(){
        this.$el.html(DetailsTabTemplate({ "uid": Math.round(Math.random() * 10001) }));
        this.model.bind("reset", this.render, this);
    },

    render: function(){
        var docConfig = [
            {headerName:"PMID", headerWidth: "10%", propName:"pmid", urlLink:"http://www.ncbi.nlm.nih.gov/pubmed/"},
            {headerName:"Title", headerWidth: "50%", propName: "article_title"},
            {headerName:"Pub. Year", headerWidth: "10%", propName: "pub_date_year"}
        ];

        var expConfig = [
            {propName:"abstract_text"}
        ];

        var ViewClass = qed.Views["datatable"];
        this.docView = new ViewClass({dataConfig: docConfig, expandedConfig: expConfig, checkbox: false, tableId: "nodedocTable",model: this.model.docs});
        this.$el.find(".docTableView").html(this.docView.render().el);

        var nmdConfig = [
            {headerName:"Name", headerWidth: "30%", propName:"name"},
            {headerName:"Term Single Count", headerWidth: "10%", propName: "termcount"},
            {headerName:"Term Combo Count", headerWidth: "10%", propName: "combocount"},
            {headerName:"NMD", headerWidth: "10%", propName: "nmd"}
        ];

        this.nmdView = new ViewClass({dataConfig: nmdConfig, checkbox: false, tableId: "nodenmdTable",model: this.model.nmdDetailsModel});
        this.$el.find(".nmdTableView").html(this.nmdView.render().el);

        var dataConfig = [
            {headerName:"Term1", headerWidth: "30%", propName:"term1"},
            {headerName:"Term2", headerWidth: "10%", propName: "term2"},
            {headerName:"UniProt ID1", headerWidth: "10%", propName: "uni1"},
            {headerName:"UniProt ID2", headerWidth: "10%", propName: "uni2"},
            {headerName:"Domain 1", headerWidth: "10%", propName: "pf1"},
            {headerName:"Domain 2", headerWidth: "10%", propName: "pf2"},
            {headerName:"Type", headerWidth: "10%", propName: "type"},
            {headerName:"Domain 1 Count", headerWidth: "10%", propName: "pf1_count"},
            {headerName:"Domain 2 Count", headerWidth: "10%", propName: "pf2_count"}
        ];

        this.domineView = new ViewClass({dataConfig: dataConfig, checkbox: false, tableId: "nodedomineTable",model: this.model.domineDetailsModel});
        this.$el.find(".domineTableView").html(this.domineView.render().el);

        return this;
    }
});

var EdgeTableView = Backbone.View.extend({

    initialize: function(){
        this.$el.html(DetailsTabTemplate({"uid": Math.round(Math.random() * 10001)}));
        this.model.bind("reset", this.render, this);
    },

    render: function(){
        var docConfig = [
            {headerName:"PMID", headerWidth: "5%", propName:"pmid", urlLink:"http://www.ncbi.nlm.nih.gov/pubmed/"},
            {headerName:"Title", headerWidth: "50%", propName: "article_title"},
            {headerName:"Pub. Year", headerWidth: "5%", propName: "pub_date_year"}
        ];

        var expConfig = [{propName:"abstract_text"}];
        var ViewClass = qed.Views["datatable"];
        this.docView = new ViewClass({dataConfig: docConfig, expandedConfig: expConfig, checkbox: false, tableId: "edgedocTable",model: this.model.docs});
        this.$el.find(".docTableView").html(this.docView.render().el);

        var nmdConfig = [
            {headerName:"Term1", headerWidth: "20%", propName:"term1"},
            {headerName:"Term2", headerWidth: "20%", propName: "term2"},
            {headerName:"Term Single Count", headerWidth: "10%", propName: "termcount"},
            {headerName:"Term Combo Count", headerWidth: "10%", propName: "combocount"},
            {headerName:"NMD", headerWidth: "20%", propName: "nmd"}
        ];

        this.nmdView = new ViewClass({dataConfig: nmdConfig, checkbox: false, tableId: "edgenmdTable",model: this.model.nmdDetailsModel});
        this.$el.find(".nmdTableView").html(this.nmdView.render().el);

        var dataConfig = [
            {headerName:"Term1", headerWidth: "10%", propName:"term1"},
            {headerName:"Term2", headerWidth: "10%", propName: "term2"},
            {headerName:"UniProt ID1", headerWidth: "10%", propName: "uni1"},
            {headerName:"UniProt ID2", headerWidth: "10%", propName: "uni2"},
            {headerName:"Domain 1", headerWidth: "10%", propName: "pf1"},
            {headerName:"Domain 2", headerWidth: "10%", propName: "pf2"},
            {headerName:"Type", headerWidth: "10%", propName: "type"},
            {headerName:"Domain 1 Count", headerWidth: "10%", propName: "pf1_count"},
            {headerName:"Domain 2 Count", headerWidth: "10%", propName: "pf2_count"}
        ];

        this.domineView = new ViewClass({dataConfig: dataConfig, checkbox: false, tableId: "edgedomineTable",model: this.model.domineDetailsModel});
        this.$el.find(".domineTableView").html(this.domineView.render().el);

        return this;
    }
});

module.exports = Backbone.View.extend({

    initialize:function (options) {
        _.extend(this, options);
        _.bindAll(this, "loadData");

        this.$el.html(Template());
        this.model.on("load", this.loadData);
    },

    loadData: function() {
        this.render(650,350);
    },

    render: function(width,height){
        var _this = this;

        if(this.model == null || this.model.networkData == null) return this;

        var networkVisEl = this.$el.find(".network_vis");
        var svg = d3.select(_.first(networkVisEl)).append("svg:svg").attr("width", width).attr("height", height);

        var force = d3.layout.force()
            .nodes(this.model.networkData.nodes.models)
            .links(this.model.networkData.edges.models)
            .size([width, height])
            .linkDistance(
                function(d){
                    if(d.nmd != null) return (d.nmd)*350;
                    return 350;
                })
            .charge(-300)
            .on("tick", tick);

        var line = svg.append("svg:g").selectAll("line.link")
            .data(force.links())
            .enter().append("line")
            .attr("class", function (d) { return "link " + d.relType; })
            .attr("x1", function (d) { return d.source.x; })
            .attr("y1", function (d) { return d.source.y; })
            .attr("x2", function (d) { return d.target.x; })
            .attr("y2", function (d) { return d.target.y; })
            .on("mouseover", linkMouseover)
            .on("mouseout", mouseout)
            .on("click", triggerEdgeDetailsView);

        var circle = svg.append("svg:g").selectAll("circle")
            .data(force.nodes())
            .enter().append("svg:circle")
            .attr("class", "node")
            .attr("cx", function (d) { return d.x; })
            .attr("cy", function (d) { return d.y; })
            .style("fill", function (d) {
                if (d.nodeType == "deNovo") return "#005B00";
                if (d.tf == 0) return "#D5DF3E";
                return "#F8991D";
            })
            .on("mouseover", nodeMouseover)
            .on("mouseout", mouseout)
            .on("click", triggerNodeDetailsView)
            .attr("r", function (d) {
                if (d.linknum > 4) {
                    return Math.log(d.linknum) * 3;
                }
                return Math.log(4) * 3;
            })
            .call(force.drag);

        var text = svg.append("svg:g").selectAll("g").data(force.nodes()).enter().append("svg:g");

        // A copy of the text with a thick white stroke for legibility.
        text.append("svg:text").attr("x", 10).attr("y", ".31em").attr("class", "shadow").text(function (d) { return d.name; });
        text.append("svg:text").attr("x", 10).attr("y", ".31em").text(function (d) { return d.name; });

        function tick() {
            line
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            circle
                .attr("cx", function (d) { return d.x = Math.max(14, Math.min(width - 14, d.x)); })
                .attr("cy", function (d) { return d.y = Math.max(14, Math.min(height - 14, d.y)); });

            text.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }


        // Highlight the link and connected nodes on mouseover.
        function linkMouseover(d) {
            svg.selectAll(".link").classed("active", function (p) { return p === d; });
            svg.selectAll(".node circle").classed("active", function (p) { return p === d.source || p === d.target; });
        }

        // Highlight the node and connected links on mouseover.
        function nodeMouseover(d) {
            svg.selectAll(".link").classed("active", function (p) {
                return p.source === d || p.target === d;
            });
            d3.select(this).classed("active", true);
        }

        // Clear any highlighted nodes or links.
        function mouseout() {
            svg.selectAll(".active").classed("active", false);
        }

        function triggerNodeDetailsView(item) {
            _this.showNodeDetails(item.name);
        }

        function triggerEdgeDetailsView(item) {
            _this.showEdgeDetails({source:item.source.name, target:item.target.name});
        }

        force.start();
        _.each(_.range(0,500), force.tick);
        force.stop();
        _.each(force.nodes(), function(forcenode) {
            forcenode.fixed = true;
        });

        return this;
    },

    showNodeDetails:function (node) {
        this.nodeDetails = new NodeDetailsModel({data_uri:"svc/" + this.catalog_unit.detailsService, networkModel:this.model.networkData, nodeName:node});
        var _this = this;
        var datatable = this.nodeDetails.fetch({
            success:function (model) {
                if (_this.nodeDetailsView) {
                    _this.nodeDetailsView.model = model;
                }
                else {
                    _this.nodeDetailsView = new NodeTableView({model:model});
                }
                _this.$el.find(".network_details").html(_this.nodeDetailsView.render().el);
            }
        });
    },

    showEdgeDetails:function (edge) {
        this.edgeDetails = new EdgeDetailsModel({data_uri:"svc/" + this.catalog_unit.detailsService, networkModel:this.model.networkData, edge:edge});
        var _this = this;
        this.edgeDetails.fetch({
            success:function (model) {
                if (_this.edgeDetailsView) {
                    _this.edgeDetailsView.model = model;
                }
                else {
                    _this.edgeDetailsView = new EdgeTableView({model:model});
                }
                _this.$el.find(".network_details").html(_this.edgeDetailsView.render().el);
            }
        });
    }

});
