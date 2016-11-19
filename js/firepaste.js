
var child_process = require('child_process');
var fs = require("fs");
var path = require("path");

(function(exports) {
    ///////////////////////// private instance variables

    ////////////////// constructor
    function FirePaste(options) {
        var that = this;
        options = options || {};
        that.model = { // default values provided by client
            name: "FirePaste",
            available: true,
            xAxis: {
                name: "X-axis",
                drive: "belt",
                pitch: 2,
                teeth: 20,
                steps: 200,
                microsteps: 16,
                gearout: 1,
                gearin: 1,
                mmMicrosteps: 80,
            },
            yAxis: {
                name: "Y-axis",
                drive: "belt",
                pitch: 2,
                teeth: 20,
                steps: 200,
                microsteps: 16,
                gearout: 1,
                gearin: 1,
                mmMicrosteps: 80,
            },
            zAxis: {
                name: "Z-axis",
                drive: "belt",
                pitch: 2,
                teeth: 20,
                steps: 200,
                microsteps: 16,
                gearout: 1,
                gearin: 1,
                mmMicrosteps: 80,
            },
        };

        return that;
    }

    FirePaste.prototype.isAvailable = function() {
        var that = this;
        return that.model.available === true;
    }

    module.exports = exports.FirePaste = FirePaste;
})(typeof exports === "object" ? exports : (exports = {}));
