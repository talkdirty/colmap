"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var CNode = (function () {
    function CNode(__parentNetwork, type) {
        this.__parentNetwork = __parentNetwork;
        this.type = type;
        this.connections = [];
    }
    return CNode;
}());
exports.CNode = CNode;
var Host = (function () {
    function Host(host) {
        this.host = host;
    }
    Host.prototype.toString = function () {
        return "<a target=\"_blank\" \n\t\t\thref=\"https://who.is/whois-ip/ip-address/" + this.host + "\">\n\t\t\t\twhois://" + this.host + "\n\t\t\t</a>";
    };
    return Host;
}());
exports.Host = Host;
var Coords = (function () {
    function Coords(longitude, latitude) {
        this.longitude = longitude;
        this.latitude = latitude;
    }
    Coords.prototype.toString = function () {
        /* toString() wird beim anzeigen der internen Knoteninformationen benutzt.
        daher wird hier ein link zu gmaps ausgegeben (requirement von Dozenten)
        */
        // http://stackoverflow.com/questions/6582834/use-a-url-to-link-to-a-google-map-with-a-marker-on-it
        // TODO external gmaps zoom level könnte ein setting sein
        return "<a target=\"_blank\" href=\"http://maps.google.com/maps/place/" + this.latitude + "+" + this.longitude + "/\n\t\t\t\t@" + this.latitude + "," + this.longitude + ",8z\">\n\t\t\t\tCoords<[" + this.latitude + ", " + this.longitude + "]>\n\t\t\t</a>";
    };
    Coords.prototype.getOl = function (mapFunc) {
        var things = [this.latitude, this.longitude];
        if (mapFunc !== undefined)
            things = mapFunc(things);
        return things;
    };
    return Coords;
}());
exports.Coords = Coords;
var COLConnectionInfo = (function () {
    function COLConnectionInfo() {
    }
    return COLConnectionInfo;
}());
exports.COLConnectionInfo = COLConnectionInfo;
var GraphNetworkHealth = (function () {
    function GraphNetworkHealth() {
    }
    return GraphNetworkHealth;
}());
exports.GraphNetworkHealth = GraphNetworkHealth;
var GraphNetworkUpdate = (function () {
    function GraphNetworkUpdate() {
    }
    return GraphNetworkUpdate;
}());
exports.GraphNetworkUpdate = GraphNetworkUpdate;
var GraphEdge = (function () {
    function GraphEdge(from, to, bidirectional, meta) {
        this.from = from;
        this.to = to;
        this.bidirectional = bidirectional;
        this.meta = meta;
    }
    GraphEdge.prototype.toString = function () {
        return "[" + this.from + "]-[" + this.to + "]";
    };
    GraphEdge.prototype.getLineCoords = function (on, mapFunc) {
        var coords = [
            on.nodes[this.from].type.getOl(),
            on.nodes[this.to].type.getOl()
        ];
        if (mapFunc !== undefined) {
            for (var coord in coords) {
                coords[coord] = mapFunc(coords[coord]);
            }
        }
        return coords;
    };
    GraphEdge.prototype.attachView = function (f) {
        this.view = f;
    };
    GraphEdge.prototype.getView = function () {
        return this.view;
    };
    return GraphEdge;
}());
exports.GraphEdge = GraphEdge;
var GraphNetwork = (function () {
    function GraphNetwork() {
        this.nodes = {};
    }
    GraphNetwork.prototype.edgeExists = function (e) {
        return this.findEdge(e) !== null;
    };
    // Todo this type shall be a intermediate one:
    // findEdge(e: GraphEdgeCriteria) : Maybe GraphEdge
    GraphNetwork.prototype.findEdge = function (e) {
        var edgeStartNode = this.nodes[e.from];
        if (edgeStartNode === undefined) {
            console.log("Warning: Cannot find <from>ID in network: " + e.from);
            return null;
        }
        for (var _i = 0, _a = edgeStartNode.connections; _i < _a.length; _i++) {
            var connection = _a[_i];
            if (connection.to == e.to)
                return connection;
        }
        return null;
    };
    GraphNetwork.prototype.nodeExists = function (name) {
        return this.nodes.hasOwnProperty(name);
    };
    GraphNetwork.prototype.nodeIterator = function (iterator, after) {
        // replace this with smartass graph traversal function
        var n = 0;
        for (var key in this.nodes) {
            iterator(this.nodes[key], key, n);
            n++;
        }
        after();
    };
    GraphNetwork.prototype.add = function (label, c) {
        this.nodes[label] = c;
        return c;
    };
    GraphNetwork.prototype.connector = function (node, to, bidirectional) {
        if (bidirectional === void 0) { bidirectional = true; }
        var lastAddedEdge;
        if (this.nodes.hasOwnProperty(node)) {
            for (var _i = 0, to_1 = to; _i < to_1.length; _i++) {
                var connect = to_1[_i];
                for (var _a = 0, _b = this.nodes[node].connections; _a < _b.length; _a++) {
                    var connection = _b[_a];
                    if (connection.to == connect) {
                        console.log("Warning: Edge already exists! Ignoring this.");
                        return null;
                    }
                }
                lastAddedEdge = new GraphEdge(node, connect, bidirectional, null);
                this.nodes[node].connections.push(lastAddedEdge);
                // TODO i'm not happy with this. Somehow, there must be a O(1) link between
                // both directions of the GraphEdge. Cross Referencing properties maybe.
                if (bidirectional) {
                    if (this.nodes.hasOwnProperty(connect)) {
                        // TODO Minimal spannender Baum?
                        var g_obsolete = new GraphEdge(connect, node, bidirectional, null);
                        this.nodes[connect].connections.push(g_obsolete);
                    }
                    else {
                        return null;
                    }
                }
            }
        }
        else {
            return null;
        }
        return lastAddedEdge;
    };
    GraphNetwork.prototype.directConnection = function (node1, node2) {
        return this.nodes[node1].connections.indexOf(node2) != -1;
    };
    return GraphNetwork;
}());
exports.GraphNetwork = GraphNetwork;
var GeoGraphNetwork = (function (_super) {
    __extends(GeoGraphNetwork, _super);
    function GeoGraphNetwork() {
        _super.apply(this, arguments);
    }
    GeoGraphNetwork.prototype.constructFrom = function (socketObject) {
        for (var _i = 0, socketObject_1 = socketObject; _i < socketObject_1.length; _i++) {
            var genericNode = socketObject_1[_i];
            if (!genericNode.n) {
                continue;
            }
            if (genericNode.n.labels.length < 1) {
                console.log("Warning: node has no labels:");
                console.log(genericNode);
                continue;
            }
            switch (genericNode.n.labels[0]) {
                case "CNode":
                    var node = new CNode(this, new Coords(genericNode.n.properties.x, genericNode.n.properties.y));
                    node["<id>"] = genericNode.n._id;
                    node["<host>"] = new Host(genericNode.n.properties.ip);
                    this.add(genericNode.n._id, node);
                    break;
                case "Service":
                    break;
                case "User":
                    break;
            }
        }
        for (var _a = 0, socketObject_2 = socketObject; _a < socketObject_2.length; _a++) {
            var node = socketObject_2[_a];
            //for (let relationship of node.r){
            if (node.r) {
                this.connector(node.r._fromId, [node.r._toId], false);
            }
        }
        return;
    };
    GeoGraphNetwork.prototype.transfer = function () {
        return new Array();
    };
    GeoGraphNetwork.prototype.delta = function () {
        return new Array();
    };
    return GeoGraphNetwork;
}(GraphNetwork));
exports.GeoGraphNetwork = GeoGraphNetwork;
//# sourceMappingURL=graphnetwork.js.map