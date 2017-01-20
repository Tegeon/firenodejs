var JsonUtil = require("./JsonUtil");
var MTO_C4 = require("./MTO_C4");
var MTO_FPD = require("./MTO_FPD");
var MTO_XYZ = require("./MTO_XYZ");

/*
 * MTO_Factory 
 * ===========
 * Create 
 */
(function(exports) {
    ////////////////// constructor
    function MTO_Factory(options = {}) {
        var that = this;

        that.options = JSON.stringify(options);

        return that;
    }

    ///////////////// MTO_Factory instance
    MTO_Factory.prototype.createMTO = function(type, options) {
        var that = this;
        var mergedOptions = JSON.parse(that.options);
        JsonUtil.applyJson(mergedOptions, options);
        if (type === "MTO_C4") {
            return new MTO_C4(mergedOptions);
        }
        if (type === "MTO_FPD") {
            return new MTO_FPD(mergedOptions);
        }
        if (type === "MTO_XYZ") {
            return new MTO_XYZ(mergedOptions);
        }
        return null;
    }

    module.exports = exports.MTO_Factory = MTO_Factory;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("MTO_Factory", function() {
    var should = require("should");
    var MTO_Factory = exports.MTO_Factory; // require("./MTO_Factory");
    it("createMTO(type, options) creates kinematic model", () => {
        var factory = new MTO_Factory({
            xAxis: {
                maxPos: 201,
            },
        });

        var mto = factory.createMTO("MTO_C4");
        mto.model.type.should.equal("MTO_C4");
        mto.model.axes[0].should.property("maxPos", 201); // base option
        mto.model.axes[1].should.property("maxPos", 200); // default

        var mto = factory.createMTO("MTO_C4", {
            yAxis: {
                maxPos: 202,
            }
        });
        mto.model.type.should.equal("MTO_C4");
        mto.model.axes[0].should.property("maxPos", 201); // base option
        mto.model.axes[1].should.property("maxPos", 202); // create option
        true.should.equal(null == factory.createMTO("??"));
    });
})
