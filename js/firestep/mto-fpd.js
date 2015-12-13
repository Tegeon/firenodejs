var should = require("should");
var math = require("mathjs");
var DeltaCalculator = require("../../www/js/shared/DeltaCalculator.js");

module.exports.MTO_FPD = (function() {
    ////////////////// constructor
    function MTO_FPD(options) {
        var that = this;
        options = options || {};
        that.delta = options.delta || DeltaCalculator.createLooseCanonRAMPS();
        that.model = {
            name: "MTO_FPD",
            dim:{
                e: that.delta.e,
                f: that.delta.f,
                gr: that.delta.gearRatio,
                re: that.delta.re,
                rf: that.delta.rf,
                st: that.delta.steps360,
                mi: that.delta.microsteps,
                spa: that.delta.spAngle,
                spr: that.delta.spRatio,
                ha: math.round(that.delta.homeAngle(),3),
            },
            sys: {
                to: 1,
            }
        }
        return that;
    }
    MTO_FPD.prototype.getModel = function() {
        var that = this;
        return JSON.parse(JSON.stringify(that.model));
    }
    MTO_FPD.prototype.calcPulses = function(xyz) {
        var that = this;
        return that.delta.calcPulses(xyz);
    }
    MTO_FPD.prototype.calcXYZ = function(pulses) {
        var that = this;
        var xyz = that.delta.calcXYZ(pulses);
        return {
            x: math.round(xyz.x,3),
            y: math.round(xyz.y,3),
            z: math.round(xyz.z,3),
        };
    }

    return MTO_FPD;
})();

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("MTO_FPD", function() {
    var MTO_FPD = exports.MTO_FPD;
    it("getModel() should return data model", function() {
        var mto = new MTO_FPD();
        should.deepEqual(mto.getModel(), {
            name: "MTO_FPD",
            dim:{
                e:131.64,
                f: 190.53,
                gr: 9.47375,
                ha: 60.33,
                mi: 16,
                re: 270,
                rf: 90,
                spa: -54.617,
                spr: -0.383,
                st: 200,
            },
            sys:{
                to:1, // system topology FireStep MTO_XYZ
            }
        });
    })
    it("MTO_FPD should calcPulses({x:1,y:2,z:3.485}", function() {
        var mto = new MTO_FPD();
        var xyz = {x:1,y:2,z:3.485};
        should.deepEqual(mto.calcPulses(xyz), {
            p1: -141,
            p2: -232,
            p3: -191,
        });
    })
    it("MTO_FPD should calcXYZ({x:1,y:2,z:3.485}", function() {
        var mto = new MTO_FPD();
        var pulses = {p1:-141,p2:-232,p3:-191};
        should.deepEqual(mto.calcXYZ(pulses), {
            x: 1.006,
            y: 1.997,
            z: 3.486,
        });
    })
})