'use strict';

var services = angular.module('firenodejs.services');
var should = require("./should");
var DeltaMesh = require("./shared/DeltaMesh");

services.factory('mesh-service', [
    '$http',
    'AlertService',
    'firestep-service',
    'camera-service',
    '$document',
    'UpdateService',
    '$rootScope',
    'firekue-service',
    function($http, alerts, firestep, camera, $document, updateService, $rootScope, firekue) {
        var pal_brewer10spectral = [
            '#9e0142', '#d53e4f', '#f46d43', '#fdae61', '#fee08b', 
            '#e6f598', '#abdda4', '#66c2a5', '#3288bd', '#5e4fa2'];
        var pal_brewer11RdYlBu = [
            '#a50026','#d73027','#f46d43','#fdae61','#fee090',
            '#ffffbf',
            '#e0f3f8','#abd9e9','#74add1','#4575b4','#313695'] ;
        var pal_brewer9YlOrRd = [
            '#ffffcc','#ffeda0','#fed976','#feb24c',
            '#fd8d3c',
            '#fc4e2a','#e31a1c','#bd0026','#800026'];
        var pal5Diverging = [
            pal_brewer11RdYlBu[10],
            pal_brewer11RdYlBu[7],
            pal_brewer11RdYlBu[5],
            pal_brewer11RdYlBu[3],
            pal_brewer11RdYlBu[0],
        ];
        var pal5Sequential = [
            pal_brewer9YlOrRd[0],
            pal_brewer9YlOrRd[1],
            pal_brewer9YlOrRd[4],
            pal_brewer9YlOrRd[7],
            pal_brewer9YlOrRd[8],
        ];

        var propInfo = {
            x: {
                id:"x",
                name: "Vertex X",
                title: "Effector location X-coordinate",
                palette: pal5Diverging,
            },
            y: {
                id:"y",
                name: "Vertex Y",
                title: "Effector location X-coordinate",
                palette: pal5Diverging,
            },
            z: {
                id:"z",
                name: "Vertex Z",
                title: "Effector location X-coordinate",
                palette: pal5Diverging,
            },
            gcw: {
                id:"gcw",
                name: "GridCellW",
                title: "Horizontal pixel separation of vertical grid lines",
                palette: pal5Diverging,
            },
            gch: {
                id:"gch",
                name: "GridCellH",
                title: "Vertical pixel separation of horizontal grid lines",
                palette: pal5Diverging,
            },
            ga: {
                id:"ga",
                name: "GridAngle",
                title: "Counter-clockwise angle in degrees between image x-axis and grid horizontal axis",
                palette: pal5Diverging,
            },
            gex: {
                id:"gex",
                name: "GridErrorX",
                title: "Root mean square error of x-positions with respect to calculated grid",
                palette: pal5Sequential,
            },
            gey: {
                id:"gey",
                name: "GridErrorY",
                title: "Root mean square error of y-positions with respect to calculated grid",
                palette: pal5Sequential,
            },
        };
        var clientDefault = {
            roi: {
                type: "rect",
                cx: 0,
                cy: 0,
                width: 150,
                height: 150,
            },
            props: {
                gcw: true,
                gch: true,
                ga: true,
                gex: true,
                gey: true,
            },
        };
        var client;
        var model = {
            name: "mesh-service",
            client: client,
        };
        var service = {
            isAvailable: function() {
                return service.model.rest && firestep.isAvailable();
            },
            color: {
                vertexStrokeSelected: "#ccf",
                vertexStrokeActive: "black",
                vertexStrokeInactive: "#d0d0d0",
                vertexFillSelected: "#ff0",
                vertexFillDefault: "none",
                vertexFillDataMean: "#4c4",
                vertexFillDataHigh: "#c44",
                vertexFillDataLow: "#44c",
                meshFill: "#eee",
                roiFill: "#888",
            },
            client: client,
            model: model,
            propNames: Object.keys(clientDefault.props),
            propInfo: propInfo,
            dataClass: function(data) {
                var v = data && service.mesh.vertexAtXYZ(data);
                return v && service.selection.length && v === service.selection[0] ?
                    "fn-data-selected" : "";
            },
            view: {
                config: {},
            },
            dataHdrIndicator: function(prop) {
                if (prop !== service.dataKey) {
                    return "";
                }
                return " " + (service.dataKeyOrder === 1 ? "\u25be" : "\u25b4");
            },
            dataHdrClass: function(prop) {
                if (prop !== service.dataKey) {
                    return "";
                }
                return "glyphicon glyphicon-" + (service.dataKeyOrder === 1 ?
                    "chevron-up" : "chevron-down"
                );
            },
            onClickDataHdr: function(prop) {
                if (service.dataKey === prop) {
                    service.dataKeyOrder = -service.dataKeyOrder;
                } else {
                    service.dataKeyOrder = 1;
                }
                service.setDataKey(prop);
                service.validate();
            },
            setDataKey: function(prop) {
                var key1 = service.dataKey = prop;
                var key2 = key1 === 'x' ? 'y' : 'x';
                var key3 = key2 === 'x' ? 'y' : 'x';
                var key4 = 'z';
                service.dataKeyOrder = service.dataKeyOrder || 1;

                service.dataComparator = function(a, b) {
                    var va = isNaN(a[key1]) ? -Number.MAX_VALUE : a[key1];
                    var vb = isNaN(b[key1]) ? -Number.MAX_VALUE : b[key1];
                    var cmp = va - vb;
                    if (cmp) {
                        return cmp * service.dataKeyOrder;
                    }
                    va = isNaN(a[key2]) ? -Number.MAX_VALUE : a[key2];
                    vb = isNaN(b[key2]) ? -Number.MAX_VALUE : b[key2];
                    cmp = va - vb;
                    if (cmp) {
                        return cmp * service.dataKeyOrder;
                    }
                    va = isNaN(a[key3]) ? -Number.MAX_VALUE : a[key3];
                    vb = isNaN(b[key3]) ? -Number.MAX_VALUE : b[key3];
                    cmp = va - vb;
                    if (cmp) {
                        return cmp * service.dataKeyOrder;
                    }
                    va = isNaN(a[key4]) ? -Number.MAX_VALUE : a[key4];
                    vb = isNaN(b[key4]) ? -Number.MAX_VALUE : b[key4];
                    cmp = va - vb;
                    return cmp * service.dataKeyOrder;
                }
                return service.dataComparator;
            },
            onClickData: function(data) {
                var v = data && service.mesh.vertexAtXYZ(data);
                service.selectVertex(v);
            },
            afterUpdate: function(diff) {
                if (!diff) {
                    return;
                }
                //console.log("mesh-service.afterUpdate()");
                if (!client) {
                    if (model.client) {
                        //console.log(model.name + ":" + "restored saved client");
                        client = model.client;
                        client.props = client.props || JSON.parse(JSON.stringify(clientDefault)).props;
                    } else {
                        console.log(model.name + ":" + "initializing client to default");
                        client = JSON.parse(JSON.stringify(clientDefault));;
                    }
                }
                service.client = model.client = client;
                JsonUtil.applyJson(service.view.config, model.config);
                // copy data so we can decorate or change it
                service.view.config.data = service.view.config.data || [];
                service.view.config.data = JSON.parse(JSON.stringify(service.view.config.data));
                if (service.mesh && diff.mesh && diff.mesh.config && diff.mesh.config.data) {
                    // update mesh data
                    for (var i = diff.mesh.config.data.length; i-- > 0;) {
                        var data = diff.mesh.config.data[i];
                        var v = service.mesh.vertexAtXYZ(data);
                        if (v) {
                            for (var j = service.propNames.length; j-- > 0;) {
                                var prop = service.propNames[j];
                                if (client.props[prop] && data[prop] != null) {
                                    v[prop] = data[prop];
                                }
                            }
                        }
                    }
                }
                service.validate();
            },
            scanVertex: function(v) {
                alerts.taskBegin();
                var camName = camera.model.selected;
                var url = "/mesh/" + camName + "/scan/vertex";
                var postData = {
                    pt: {
                        x: v.x,
                        y: v.y,
                        z: v.z,
                    },
                    maxError: client && client.maxRMSE, // null: no error limit
                };
                client && (postData.props = client.props);
                $http.post(url, postData).success(function(response, status, headers, config) {
                    console.log("mesh-service.scanVertex(" + camName + ") ", response);
                    //alerts.info(JSON.stringify(response));
                    alerts.taskEnd();
                    updateService.setPollBase(true);
                }).error(function(err, status, headers, config) {
                    console.warn("mesh-service.scanVertex(" + camName + ") failed HTTP" + status, err);
                    alerts.taskEnd();
                });
            },
            scanROI: function() {
                var camName = camera.model.selected;
                var url = "/mesh/" + camName + "/scan/vertex";
                var job = {};
                var jobSize = 5;
                for (var i = 0; i < service.roiVertices.length; i++) {
                    var v = service.roiVertices[i];
                    var postData = {
                        pt: {
                            x: v.x,
                            y: v.y,
                            z: v.z,
                        },
                        maxError: client && client.maxRMSE, // null: no error limit
                    };
                    postData.props = client.props;
                    firekue.addRestRequest(job, url, postData);
                    if (job.data.length >= jobSize) {
                        firekue.addJob(job);
                        job = {};
                    }
                }
                if (job.data.length >= jobSize) {
                    firekue.addJob(job);
                }
                service.configure(function() {
                    service.confirm_scanROI = false;
                });
            },
            cancel: function() {
                JsonUtil.applyJson(service.view.config, model.config);
            },
            viewHasChanged: function() {
                return service.view.config.zMin !== model.config.zMin ||
                    service.view.config.zMax !== model.config.zMax ||
                    service.view.config.rIn !== model.config.rIn ||
                    service.view.config.zPlanes !== model.config.zPlanes;
            },
            actionName: function() {
                return service.viewHasChanged() ? "Apply" : "Reset";
            },
            stats: {},
            dataStats: function(data, propNames) {
                var stats = {};
                for (var ip = 0; ip < propNames.length; ip++) {
                    var prop = propNames[ip];
                    stats[prop] = {
                        sumVariance: 0,
                        sum: 0,
                        count: 0,
                    }
                }
                for (var i = 0; i < data.length; i++) {
                    var d = data[i];
                    for (var ip = 0; ip < propNames.length; ip++) {
                        var prop = propNames[ip];
                        if (d[prop] != null) {
                            stats[prop].sum += d[prop];
                            stats[prop].count++;
                        }
                    }
                }
                for (var ip = 0; ip < propNames.length; ip++) {
                    var prop = propNames[ip];
                    var propStat = stats[prop];
                    propStat.count && (propStat.mean = propStat.sum / propStat.count);
                }
                for (var i = data.length; i-- > 0;) {
                    var d = data[i];
                    for (var ip = 0; ip < propNames.length; ip++) {
                        var prop = propNames[ip];
                        if (d[prop] != null) {
                            var diff = d[prop] - stats[prop].mean;
                            stats[prop].sumVariance += diff * diff;
                        }
                    }
                }
                for (var ip = 0; ip < propNames.length; ip++) {
                    var prop = propNames[ip];
                    var propStat = stats[prop];
                    if (propStat.count) {
                        propStat.stdDev = Math.sqrt(propStat.sumVariance / propStat.count);
                        propStat.stdDev = Math.round(propStat.stdDev * 1000) / 1000;
                        propStat.mean = Math.round(propStat.mean * 1000) / 1000;
                        delete propStat.sumVariance; // just clutter
                        delete propStat.sum; // just clutter
                    }
                }
                return stats;
            },
            validate: function() {
                var mesh = service.mesh;
                var config = model.config;
                if (mesh == null ||
                    mesh.rIn !== config.rIn ||
                    mesh.zMin !== config.zMin ||
                    mesh.zPlanes !== config.zPlanes) {
                    mesh = service.mesh = new DeltaMesh(config);
                }
                var nLevels = mesh.zPlanes - 2;
                config.maxLevel = Math.min(nLevels,
                    config.maxLevel == null ? nLevels - 1 : config.maxLevel);
                service.levels = [];
                for (var i = 0; i++ < nLevels;) {
                    service.levels.push(i);
                }
                var opts = {
                    maxLevel: config.maxLevel,
                    includeExternal: false,
                };
                service.vertices = mesh.zPlaneVertices(0, opts);
                var propNames = ['x', 'y', 'z']; // include location in roiStats
                for (var ip = 0; ip < service.propNames.length; ip++) {
                    var prop = service.propNames[ip];
                    client.props[prop] && propNames.push(prop);
                }
                service.roiVertices = [];
                for (var i=0; i<service.vertices.length; i++) {
                    var v = service.vertices[i];
                    DeltaMesh.isVertexROI(v, client.roi) && service.roiVertices.push(v);
                }
                service.roiData = [];
                for (var i = 0; i < service.view.config.data.length; i++) {
                    var d = service.view.config.data[i];
                    var v = service.mesh.vertexAtXYZ(d);
                    if (v) {
                        if (DeltaMesh.isVertexROI(v, client.roi)) {
                            service.roiData.push(d);
                            v.roi = d;
                        } else {
                            delete v.roi;
                        }
                    }
                }
                service.roiStats = service.dataStats(service.roiData, propNames);
                service.dataComparator = service.dataComparator || service.setDataKey('x');
                service.roiData.sort(service.dataComparator);

                return service;
            },
            selection: [ // single-selection now; multi-selection TBD
            ],
            isDataVisible: function(data) {
                var v = service.mesh.vertexAtXYZ(data);
                return DeltaMesh.isVertexROI(v, client.roi);
            },
            svgMouseXY: function(evt) {
                var elt = $document.find('svg').parent()[0];
                var dx = 0;
                var dy = 0;
                for (var op = elt; op != null; op = op.offsetParent) {
                    dx += op.offsetLeft;
                    dy += op.offsetTop;
                }
                var cx = elt.offsetWidth / 2;
                var cy = elt.offsetHeight / 2;
                var x = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - dx;
                x = cx - x;
                var y = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop - dy;
                y = y - cy;
                return {
                    x: x,
                    y: y,
                }
            },
            selectVertex: function(v) {
                if (service.selection.length === 0) {
                    service.selection.push(v);
                } else {
                    service.selection[0] = v;
                }
            },
            onMouseDown: function(evt) {
                var mouse = service.svgMouseXY(evt);
                var dMax = 5;
                for (var i = service.vertices.length; i-- > 0;) {
                    var v = service.vertices[i];
                    if (v == null) {
                        continue;
                    }
                    if (Math.abs(v.x - mouse.x) < dMax && Math.abs(v.y - mouse.y) < dMax) {
                        mouse.vertex = v;
                        service.selectVertex(v);
                        break;
                    }
                }
            },
            onMouseMove: function(evt) {
                var elt = $document.find('svg').parent()[0];
                var cx = elt.offsetWidth / 2;
                var cy = elt.offsetHeight / 2;
                var dx = 0;
                var dy = 0;
                for (var op = elt; op != null; op = op.offsetParent) {
                    dx += op.offsetLeft;
                    dy += op.offsetTop;
                }
                var selection = service.selection.length > 0 ? service.selection[0] : null;
                if (selection == null) {
                    selection = {};
                    service.selection.push(selection);
                }
                selection.x = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft - dx;
                selection.y = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop - dy;
                selection.x = cx - selection.x;
                selection.y = selection.y - cy;
                var dMax = 7;
                for (var i = service.vertices.length; i-- > 0;) {
                    var v = service.vertices[i];
                    if (v == null) {
                        continue;
                    }
                    if (Math.abs(v.x - selection.x) < dMax && Math.abs(v.y - selection.y) < dMax) {
                        selection.vertex = v;
                        break;
                    }
                }
            },
            vertexRadius: function(v) {
                return 4;
            },
            vertexStroke: function(v) {
                if (DeltaMesh.isVertexROI(v, client.roi)) {
                    return service.color.vertexStrokeActive;
                } else {
                    return service.color.vertexStrokeInactive;
                }
            },
            vertexFill: function(v) {
                var value = v && v.roi && v.roi[service.dataKey];
                return service.dataFill(value);
            },
            dataFill: function(value) {
                var stats = service.roiStats[service.dataKey];
                if (value == null || stats == null) {
                    return service.color.vertexFillDefault;
                }
                var pal5 = propInfo[service.dataKey].palette;
                if (value < stats.mean - stats.stdDev) {
                    return pal5[0];
                } else if (value <= stats.mean - stats.stdDev/4) {
                    return pal5[1];
                } else if (value <= stats.mean + stats.stdDev/4) {
                    return pal5[2];
                } else if (value <= stats.mean + stats.stdDev) {
                    return pal5[3];
                } else {
                    return pal5[4];
                }

            },
            configure: function(onDone) {
                var config = model.config;
                service.mesh = null;
                JsonUtil.applyJson(config, service.view.config);
                service.validate();
                config.rIn = service.mesh.rIn;
                config.data = [];

                alerts.taskBegin();
                var url = "/mesh/configure";
                $http.post(url, config).success(function(response, status, headers, config) {
                    console.log("mesh-service.configure() ", response);
                    onDone && onDone();
                    alerts.taskEnd();
                }).error(function(err, status, headers, config) {
                    console.warn("mesh-service.configure() failed HTTP" + status, err);
                    alerts.taskEnd();
                });
            },
            onChangeLevel: function() {
                service.validate();
            },
        };
        updateService.onAfterUpdate(service.afterUpdate);

        return service;
    }
]);
