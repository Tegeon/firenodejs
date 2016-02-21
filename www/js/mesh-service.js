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
        var propInfo = {
            gcw: {
                name: "GridCellW",
                title: "Horizontal pixel separation of vertical grid lines"
            },
            gch: {
                name: "GridCellH",
                title: "Vertical pixel separation of horizontal grid lines"
            },
            ga: {
                name: "GridAngle",
                title: "Counter-clockwise angle in degrees between image x-axis and grid horizontal axis"
            },
            gex: {
                name: "GridErrorX",
                title: "Root mean square error of x-positions with respect to calculated grid"
            },
            gey: {
                name: "GridErrorY",
                title: "Root mean square error of y-positions with respect to calculated grid"
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
                vertexStrokeSelected: "#88f",
                vertexStrokeActive: "black",
                vertexStrokeInactive: "#d0d0d0",
                vertexFillDefault: "none",
            },
            client: client,
            model: model,
            propNames: Object.keys(clientDefault.props),
            propInfo: function(id) {
                return propInfo[id];
            },
            dataClass: function(data) {
                var v = data && service.mesh.vertexAtXYZ(data);
                return v && service.selection.length && v === service.selection[0] ?
                    "fn-data-selected" : "";
            },
            view: {
                config:{},
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
                if (service.mesh && diff.mesh && diff.mesh.config && diff.mesh.config.data) {
                    // update mesh data
                    for (var i=diff.mesh.config.data.length; i-- > 0; ) {
                        var data = diff.mesh.config.data[i];
                        var v = service.mesh.vertexAtXYZ(data);
                        if (v) {
                            for (var j=service.propNames.length; j-- > 0;) {
                                var prop = service.propNames[j];
                                if (client.props[prop] && data[prop] != null) {
                                    v[prop] = data[prop];
                                }
                            }
                        }
                    }
                }
                service.client = model.client = client;
                JsonUtil.applyJson(service.view.config, model.config);
                // copy data so we can decorate or change it
                service.view.config.data = JSON.parse(JSON.stringify(service.view.config.data)); 
                service.validate();
            },
            scanVertex: function(v) {
                service.scan.active = true;
                alerts.taskBegin();
                var camName = camera.model.selected;
                var url = "/mesh/" + camName + "/scan/vertex";
                var postData = {
                    pt: {
                        x: v.x,
                        y: v.y,
                        z: v.z,
                    },
                    maxError: null, // null: no error limit
                };
                client && (postData.props = client.props);
                $http.post(url, postData).success(function(response, status, headers, config) {
                    console.log("mesh-service.scanVertex(" + camName + ") ", response);
                    //alerts.info(JSON.stringify(response));
                    alerts.taskEnd();
                    updateService.setPollBase(true);
                    service.scan.active = false;
                }).error(function(err, status, headers, config) {
                    console.warn("mesh-service.scanVertex(" + camName + ") failed HTTP" + status, err);
                    alerts.taskEnd();
                    service.scan.active = false;
                });
            },
            scanROI: function() {
                alerts.taskBegin();
                var camName = camera.model.selected;
                var url = "/mesh/" + camName + "/scan/vertex";
                for (var i=0; i < service.vertices.length; i++) {
                    var v = service.vertices[i];
                    if (v && DeltaMesh.isVertexROI(v, client.roi)) {
                        var job = {};
                        var postData = {
                            pt: {
                                x: v.x,
                                y: v.y,
                                z: v.z,
                            },
                            maxError: null, // null: no error limit
                        };
                        postData.props = client.props;
                        firekue.addRestRequest(job, url, postData);
                        firekue.addJob(job);
                    }
                }
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
            scan: {
                active: false,
                buttonClass: function() {
                    return service.scan.active ? "btn-warning" : "";
                },
                //onClick: function() {
                    //service.scan.active = true;
                    //alerts.taskBegin();
                    //var camName = camera.model.selected;
                    //var url = "/mesh/" + camName + "/scan";
                    //var postData = model.client;
                    //$http.post(url, postData).success(function(response, status, headers, config) {
                        //console.log("mesh-service.scan(" + camName + ") ", response);
                        //alerts.taskEnd();
                        //service.scan.active = false;
                    //}).error(function(err, status, headers, config) {
                        //console.warn("mesh-service.scan(" + camName + ") failed HTTP" + status, err);
                        //alerts.taskEnd();
                        //service.scan.active = false;
                    //});
                //}
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
                //console.log("validate() created mesh vertices:", service.vertices.length);
                service.roiCount = 0;
                for (var i=0; i< service.vertices.length; i++) {
                    DeltaMesh.isVertexROI(service.vertices[i], client.roi) && service.roiCount++;
                }
                for (var i=service.view.config.data.length; i-- > 0;) {
                    var data = service.view.config.data[i];
                    var v = service.mesh.vertexAtXYZ(data);
                    data.show = v && DeltaMesh.isVertexROI(v, client.roi);
                }

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
                        if (service.selection.length === 0) {
                            service.selection.push(v);
                        } else {
                            service.selection[0] = v;
                        }
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
                return service.color.vertexFillDefault;
            },
            configure: function() {
                var config = model.config;
                service.mesh = null;
                JsonUtil.applyJson(config, service.view.config);
                service.validate();
                config.rIn = service.mesh.rIn;

                alerts.taskBegin();
                var url = "/mesh/configure";
                $http.post(url, config).success(function(response, status, headers, config) {
                    console.log("mesh-service.configure() ", response);
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
