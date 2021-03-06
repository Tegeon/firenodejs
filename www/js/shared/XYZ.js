var should = require("should");
var Mat3x3 = require("./Mat3x3");
var Barycentric3 = require("./Barycentric3");
var Logger = require("./Logger");

(function(exports) {
    var verboseLogger = new Logger({
        logLevel: "debug"
    });

    ////////////////// constructor
    function XYZ(x, y, z, options) {
        var that = this;

        if (typeof x === "number") {
            that.x = x;
            that.y = y;
            that.z = z;
            should &&
                y.should.Number &&
                z.should.Number &&
                isNaN(x).should.False &&
                isNaN(y).should.False &&
                isNaN(z).should.False;
        } else {
            var xyz = x;
            should &&
                xyz.x.should.Number &&
                xyz.y.should.Number &&
                xyz.z.should.Number;
            that.x = xyz.x;
            that.y = xyz.y;
            that.z = xyz.z;
            if (options == null) {
                options = y;
            }
        }
        options = options || {};
        if (options.verbose) {
            that.verbose = options.verbose;
        }

        return that;
    }
    XYZ.prototype.nearest = function(a, b) {
        var that = this;
        var adx = a.x - that.x;
        var ady = a.y - that.y;
        var adz = a.z - that.z;
        var bdx = b.x - that.x;
        var bdy = b.y - that.y;
        var bdz = b.z - that.z;
        var ad2 = adx * adx + ady * ady + adz * adz;
        var bd2 = bdx * bdx + bdy * bdy + bdz * bdz;
        return ad2 <= bd2 ? a : b;
    }
    XYZ.prototype.dot = function(xyz) {
        var that = this;
        return that.x * xyz.x + that.y * xyz.y + that.z * xyz.z;
    }
    XYZ.prototype.cross = function(xyz) {
        var that = this;
        return new XYZ(
            that.y * xyz.z - that.z * xyz.y, -(that.x * xyz.z - that.z * xyz.x),
            that.x * xyz.y - that.y * xyz.x,
            that);
    }
    XYZ.prototype.interpolate = function(xyz, p) {
        var that = this;
        p = p == null ? 0.5 : p;
        var p1 = 1 - p;
        should &&
            xyz.should.exist &&
            xyz.x.should.Number &&
            xyz.y.should.Number &&
            xyz.z.should.Number;
        return new XYZ(
            p * xyz.x + p1 * that.x,
            p * xyz.y + p1 * that.y,
            p * xyz.z + p1 * that.z,
            that);
    }
    XYZ.prototype.invalidate = function() {
        var that = this;
        delete that._norm;
    }
    XYZ.prototype.normSquared = function() {
        var that = this;
        return that.x * that.x + that.y * that.y + that.z * that.z;
    }
    XYZ.prototype.norm = function() {
        var that = this;
        if (that._norm == null) {
            that._norm = Math.sqrt(that.normSquared());
        }
        return that._norm;
    }
    XYZ.prototype.minus = function(value) {
        var that = this;
        should &&
            value.x.should.Number &&
            value.y.should.Number &&
            value.z.should.Number;
        return new XYZ(that.x - value.x, that.y - value.y, that.z - value.z, that);
    }
    XYZ.prototype.plus = function(value) {
        var that = this;
        should &&
            value.x.should.Number &&
            value.y.should.Number &&
            value.z.should.Number;
        return new XYZ(that.x + value.x, that.y + value.y, that.z + value.z, that);
    }
    XYZ.prototype.equal = function(value, tolerance) {
        var that = this;
        if (value == null) {
            that.verbose && console.log("XYZ.equal(null) => false");
            return false;
        }
        if (value.x == null) {
            that.verbose && console.log("XYZ.equal(value.x is null) => false");
            return false;
        }
        if (value.y == null) {
            that.verbose && console.log("XYZ.equal(value.y is null) => false");
            return false;
        }
        if (value.z == null) {
            that.verbose && console.log("XYZ.equal(value.z is null) => false");
            return false;
        }
        tolerance = tolerance || 0;
        var result = value.x - tolerance <= that.x && that.x <= value.x + tolerance &&
            value.y - tolerance <= that.y && that.y <= value.y + tolerance &&
            value.z - tolerance <= that.z && that.z <= value.z + tolerance;
        that.verbose && !result && verboseLogger.debug("XYZ", that, ".equal(", value, ") => false");
        return result;
    }
    XYZ.prototype.toString = function() {
        var that = this;
        var scale = 1000;
        return "[" + Math.round(that.x * scale) / scale +
            "," + Math.round(that.y * scale) / scale +
            "," + Math.round(that.z * scale) / scale +
            "]";
    }
    XYZ.prototype.multiply = function(m) {
        var that = this;
        if (m instanceof Mat3x3) {
            return new XYZ(
                m.get(0, 0) * that.x + m.get(0, 1) * that.y + m.get(0, 2) * that.z,
                m.get(1, 0) * that.x + m.get(1, 1) * that.y + m.get(1, 2) * that.z,
                m.get(2, 0) * that.x + m.get(2, 1) * that.y + m.get(2, 2) * that.z,
                that);
        }
        should && m.should.Number;
        return new XYZ(
            m * that.x,
            m * that.y,
            m * that.z,
            that);
    }

    /////////// class
    XYZ.of = function(xyz, options) {
        options = options || {};
        if (xyz instanceof XYZ) {
            return xyz;
        }
        if (options.strict) {
            should &&
                xyz.x.should.Number &&
                xyz.y.should.Number &&
                xyz.z.should.Number;
        } else {
            if (!xyz.x instanceof Number) {
                return null;
            }
            if (!xyz.y instanceof Number) {
                return null;
            }
            if (!xyz.z instanceof Number) {
                return null;
            }
        }
        return new XYZ(xyz.x, xyz.y, xyz.z, options);
    }
    XYZ.precisionDriftComparator = function(v1, v2) {
        // comparator order will reveal
        // any long-term precision drift
        // as a horizontal visual break along x-axis
        var s1 = v1.y < 0 ? -1 : 1;
        var s2 = v2.y < 0 ? -1 : 1;
        var cmp = s1 - s2;
        cmp === 0 && (cmp = Math.round(v2.y) - Math.round(v1.y));
        if (cmp === 0) {
            var v1x = Math.round(v1.x);
            var v2x = Math.round(v2.x);
            cmp = v1.y < 0 ? v1x - v2x : v2x - v1x;
        }
        cmp === 0 && (cmp = v1.z - v2.z);
        return cmp;
    }

    module.exports = exports.XYZ = XYZ;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("XYZ", function() {
    var XYZ = require("./XYZ");
    var options = {
        verbose: true
    };
    it("XYZ(1,2,3) should create an XYZ coordinate", function() {
        var xyz = new XYZ(1, 2, 3);
        xyz.should.instanceOf(XYZ);
        xyz.x.should.equal(1);
        xyz.y.should.equal(2);
        xyz.z.should.equal(3);
    })
    it("XYZ({x:1,y:2,z:3) should create an XYZ coordinate", function() {
        var xyz = new XYZ(1, 2, 3);
        var xyz2 = new XYZ(xyz);
        xyz2.should.instanceOf(XYZ);
        xyz2.x.should.equal(1);
        xyz2.y.should.equal(2);
        xyz2.z.should.equal(3);
        var xyz3 = new XYZ({
            x: 1,
            y: 2,
            z: 3
        });
        xyz2.should.instanceOf(XYZ);
        xyz2.x.should.equal(1);
        xyz2.y.should.equal(2);
        xyz2.z.should.equal(3);
    })
    it("equal(value, tolerance) should return true if coordinates are same within tolerance", function() {
        var xyz = new XYZ(1, 2, 3);
        var xyz2 = new XYZ(xyz);
        xyz.equal(xyz2).should.True;
        xyz2.x = xyz.x - 0.00001;
        xyz.equal(xyz2).should.False;
        xyz.equal(xyz2, 0.00001).should.True;
        xyz.equal(xyz2, 0.000001).should.False;
        xyz2.x = xyz.x + 0.00001;
        xyz.equal(xyz2).should.False;
        xyz.equal(xyz2, 0.00001).should.True;
        xyz.equal(xyz2, 0.000001).should.False;
    })
    it("norm() should return true the vector length", function() {
        var e = 0.000001;
        new XYZ(1, 2, 3).norm().should.within(3.741657 - e, 3.741657 + e);
        new XYZ(-1, 2, 3).norm().should.within(3.741657 - e, 3.741657 + e);
        new XYZ(1, -2, 3).norm().should.within(3.741657 - e, 3.741657 + e);
        new XYZ(1, -2, -3).norm().should.within(3.741657 - e, 3.741657 + e);
        new XYZ(1, 0, 1).norm().should.within(1.414213 - e, 1.414213 + e);
        new XYZ(0, 1, 1).norm().should.within(1.414213 - e, 1.414213 + e);
        new XYZ(1, 1, 0).norm().should.within(1.414213 - e, 1.414213 + e);
    })
    it("normSquared() should return norm squared", function() {
        var xyz = new XYZ(1, 2, 3);
        xyz.norm().should.equal(Math.sqrt(xyz.normSquared()));
    })
    it("minus(value) should return vector difference", function() {
        var xyz1 = new XYZ(1, 2, 3);
        var xyz2 = new XYZ(10, 20, 30);
        var xyz3 = xyz1.minus(xyz2);
        xyz3.equal({
            x: -9,
            y: -18,
            z: -27
        }).should.True;
    })
    it("plus(value) should return vector sum", function() {
        var xyz1 = new XYZ(1, 2, 3);
        var xyz2 = new XYZ(10, 20, 30);
        var xyz3 = xyz1.plus(xyz2);
        xyz3.equal({
            x: 11,
            y: 22,
            z: 33
        }).should.True;
    })
    it("interpolate(xyz,p) should interpolate to given point for p[0,1]", function() {
        var pt1 = new XYZ(1, 1, 1, {
            verbose: true
        });
        var pt2 = new XYZ(10, 20, 30, {
            verbose: true
        });
        pt1.interpolate(pt2, 0).equal(pt1).should.True;
        pt1.interpolate(pt2, 1).equal(pt2).should.True;
        pt1.interpolate(pt2, 0.1).equal({
            x: 1.9,
            y: 2.9,
            z: 3.9
        }).should.True;
    });
    it("XYZ.of(pt) should return an XYZ object for given point", function() {
        var xyz = XYZ.of({
            x: 1,
            y: 2,
            z: 3
        });
        xyz.should.instanceOf.XYZ;
        var xyz2 = XYZ.of(xyz);
        xyz2.should.equal(xyz);
    });
    it("cross(xyz) returns cross product with xyz", function() {
        var v1 = new XYZ(1, 2, 3, options);
        var v2 = new XYZ(4, 5, 6, options);
        var cross = v1.cross(v2);
        var e = 0;
        cross.equal({
            x: -3,
            y: 6,
            z: -3,
            e
        }).should.True;
    });
    it("teString() returns concise string representation", function() {
        new XYZ(1, 2, 3).toString().should.equal("[1,2,3]");
        new XYZ(1.001, 2.0001, -3.001).toString().should.equal("[1.001,2,-3.001]");
        new XYZ(1.001, 2.0001, -3.001).toString().should.equal("[1.001,2,-3.001]");
    })
    it("dot(xyz) returns dot product with xyz", function() {
        var v1 = new XYZ(1, 2, 3, options);
        var v2 = new XYZ(4, 5, 6, options);
        var dot = v1.dot(v2);
        dot.should.equal(32);
    });
    it("nearest(a,b) returns nearest point", function() {
        var vx = new XYZ(1, 0, 0);
        var vy = new XYZ(0, 1, 0);
        var vz = new XYZ(0, 0, 1);
        new XYZ(2, 0, 0).nearest(vx, vy).should.equal(vx);
        new XYZ(0, 0, 2).nearest(vx, vy).should.equal(vx);
        new XYZ(0, 2, 0).nearest(vx, vy).should.equal(vy);
        new XYZ(0, 2, 0).nearest(vz, vy).should.equal(vy);
        new XYZ(0, 0, 2).nearest(vy, vz).should.equal(vz);
        new XYZ(0, 0, 2).nearest(vx, vz).should.equal(vz);
    });
    it("precisionDriftComparator(v1,v2) sorts scanned vertices to reveal long-term precision drift", function() {
        XYZ.precisionDriftComparator(new XYZ(1, 2, 3), new XYZ(1, 2, 3)).should.equal(0);
        XYZ.precisionDriftComparator(new XYZ(1, -2, 3), new XYZ(1, -2, 3)).should.equal(0);
        XYZ.precisionDriftComparator(new XYZ(1, -2, 3), new XYZ(1, 2, 3)).should.below(0);
        XYZ.precisionDriftComparator(new XYZ(1, 2, 3), new XYZ(1, -2, 3)).should.above(0);

        XYZ.precisionDriftComparator(new XYZ(1, -2, 3), new XYZ(1, -3, 3)).should.below(0);
        XYZ.precisionDriftComparator(new XYZ(1, -2, 3), new XYZ(2, -2, 3)).should.below(0);
        XYZ.precisionDriftComparator(new XYZ(1, 2, 3), new XYZ(2, 2, 3)).should.above(0);
        XYZ.precisionDriftComparator(new XYZ(1, 2, 3), new XYZ(1, 3, 3)).should.above(0);
    });
})
