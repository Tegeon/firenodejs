var should = require("should");

(function(exports) {
    function pointDistance2(p1, p2) {
        var dx = p1.x - p2.x;
        var dy = p1.y - p2.y;
        return dx * dx + dy * dy;
    }

    function norm(p) {
        return Math.sqrt(p.x * p.x + p.y * p.y);
    }

    function round(v, scale) {
        return Math.round(v * scale) / scale;
    }

    ////////////////// constructor
    function Grid(origin, rowCellOffset, colCellOffset, options) {
        var that = this;
        options = options || {};
        options.fraction = options.fraction == null ? 2 : opions.fraction;
        origin.should.exist;
        origin.x.should.exist;
        origin.y.should.exist;
        colCellOffset.should.exist;
        colCellOffset.x.should.exist;
        colCellOffset.y.should.exist;
        rowCellOffset.should.exist;
        rowCellOffset.x.should.exist;
        rowCellOffset.y.should.exist;
        that.imageSize = options.imageSize || {
            w: 400,
            h: 400,
        };
        that.origin = origin;
        that.colCellOffset = colCellOffset;
        that.rowCellOffset = rowCellOffset;
        that.scale = 1;
        for (var i = options.fraction; 0 < i--;) {
            that.scale = that.scale * 10;
        }
        that.cellSize = {
            w: round(norm(colCellOffset), that.scale),
            h: round(norm(rowCellOffset), that.scale),
        };
        that.angle = that.colCellOffset.x ?
            180 * Math.atan(that.colCellOffset.y / that.colCellOffset.x) / Math.PI : 0;
        that.angle = round(that.angle, 1000);

        return that;
    }

    Grid.prototype.cellAtRowCol = function(row, col) {
        var that = this;
        var x = that.origin.x + col * that.colCellOffset.x + row * that.rowCellOffset.x;
        var y = that.origin.y + col * that.colCellOffset.y + row * that.rowCellOffset.y;
        return {
            x: round(x, that.scale),
            y: round(y, that.scale),
            r: row,
            c: col,
        }
    }
    Grid.prototype.statsFromPoints = function(pts, rmseScale) {
        rmseScale = rmseScale || 100;
        var that = this;
        var stats = {};
        var xErr2 = 0;
        var yErr2 = 0;
        for (var i = 0; i < pts.length; i++) {
            var pt = pts[i];
            var cell = that.cellAtXY(pt.x, pt.y);
            var dx = pt.x - cell.x;
            var dy = pt.y - cell.y;
            xErr2 += dx * dx;
            yErr2 += dy * dy;
        }
        stats.xRMSE = round(Math.sqrt(xErr2 / pts.length), rmseScale);
        stats.yRMSE = round(Math.sqrt(yErr2 / pts.length), rmseScale);
        return stats;
    }
    Grid.prototype.cellAtXY = function(x, y) {
        var that = this;
        var dx = x - that.origin.x;
        var dy = y - that.origin.y;
        var col = Math.round(dx / that.colCellOffset.x);
        var row = Math.round(dy / that.rowCellOffset.y);
        var dCol = col < 0 ? -1 : 1;
        var dRow = row < 0 ? -1 : 1;
        var pts = [
            that.cellAtRowCol(row + 0, col + 0),
            that.cellAtRowCol(row + dRow, col + 0),
            that.cellAtRowCol(row + 0, col + dCol),
            that.cellAtRowCol(row + dRow, col + dCol),
        ];
        var center = {
            x: that.imageWidth / 2,
            y: that.imageHeight / 2,
        }
        var cell = pts[0];
        var cellDist2 = pointDistance2(cell, center);
        for (var i = pts.length; 1 < i--;) {
            var pt = pts[i];
            var dist2 = pointDistance2(pt, center);
            if (dist2 < cellDist2) {
                cell = pt;
                cellDist2 = dist2;
            }
        }
        return cell;
    }

    Grid.calcCellOffset = function(pts, isAdjacent) {
        var ptPrev = pts[0];
        var dxSum = 0;
        var dySum = 0;
        var n = 0;
        for (var i = 1; i < pts.length; i++) {
            var pt = pts[i];
            if (isAdjacent(pt, ptPrev)) {
                dxSum += pt.x - ptPrev.x;
                dySum += pt.y - ptPrev.y;
                n++;
            }
            ptPrev = pt;
        }
        return n ? {
            x: dxSum / n,
            y: dySum / n,
        } : null;
    }
    Grid.createFromPoints = function(pts, options) {
        options = options || {};
        var imageSize = options.imageSize || {
            w: 400,
            h: 400
        };
        var xMin = pts[0].x;
        var xMax = xMin;
        var yMin = pts[0].y;
        var yMax = yMin;
        for (var i = pts.length; i-- > 1;) {
            var pt = pts[i];
            if (pt.x < xMin) {
                xMin = pt.x;
            } else if (xMax < pt.x) {
                xMax = pt.x;
            }
            if (pt.y < yMin) {
                yMin = pt.y;
            } else if (yMax < pt.y) {
                yMax = pt.y;
            }
        }
        var dx = xMax - xMin;
        var dy = yMax - yMin;
        var snap = Math.round(Math.sqrt(dx * dy / pts.length) / 2);
        for (var i = pts.length; i-- > 0;) {
            var pt = pts[i];
            pt.xs = Math.round((pt.x - xMin) / snap);
            pt.ys = Math.round((pt.y - yMin) / snap);
        }
        pts.sort(function(a, b) {
            var cmp = a.xs - b.xs;
            return cmp ? cmp : (a.ys - b.ys);
        });
        var maxSnap = snap * 3;
        var rowCellOffset = Grid.calcCellOffset(pts, function(p1, p2) {
            return p1.xs === p2.xs && p1.ys - p2.ys < maxSnap;
        });
        pts.sort(function(a, b) {
            var cmp = a.ys - b.ys;
            return cmp ? cmp : (a.xs - b.xs);
        });
        var colCellOffset = Grid.calcCellOffset(pts, function(p1, p2) {
            return p1.ys === p2.ys && p1.xs - p2.xs < maxSnap;
        });
        var c = { // image center
            x: imageSize.w / 2,
            y: imageSize.h / 2,
        };
        var ptCtr = pts[0];
        var ptCtrDist2 = pointDistance2(ptCtr, c);
        for (var i = pts.length; i-- > 1;) {
            var dist2 = pointDistance2(pts[i], c);
            if (dist2 < ptCtrDist2) {
                ptCtr = pts[i];
                ptCtrDist2 = dist2;
            }
        }
        var origin = {
            x: ptCtr.x,
            y: ptCtr.y,
        };
        if (origin == null || origin.x == null || origin.y == null || rowCellOffset == null || colCellOffset == null) {
            console.log("INFO\t: Grid.createFromPoints() insufficient data:" +
                JSON.stringify({
                    origin: origin,
                    rowCellOffset: rowCellOffset,
                    colCellOffset: colCellOffset
                }));
            return null;
        }
        var grid = new Grid(origin, rowCellOffset, colCellOffset, {
            imageSize: imageSize,
        });

        // Adjust origin to be grid intersection closest to image center
        ptCtr = grid.cellAtXY(c.x, c.y);
        grid.origin.x = ptCtr.x;
        grid.origin.y = ptCtr.y;

        return grid;
    }

    module.exports = exports.Grid = Grid;
})(typeof exports === "object" ? exports : (exports = {}));

// mocha -R min --inline-diffs *.js
(typeof describe === 'function') && describe("Grid", function() {
    var Grid = exports.Grid;
    var pushxy = function(a, x, y) {
        a.push({
            x: x,
            y: y
        });
    };
    var data1 = [];

    pushxy(data1, 85.0, 25.0);
    pushxy(data1, 87.0, 81.0);
    pushxy(data1, 89.0, 137.0);
    pushxy(data1, 92.0, 194.0);
    pushxy(data1, 94.0, 251.0);
    pushxy(data1, 96.0, 308.0);
    pushxy(data1, 99.0, 365.0);
    pushxy(data1, 141.0, 23.0);
    pushxy(data1, 144.0, 79.0);
    pushxy(data1, 146.0, 135.0);
    pushxy(data1, 149.0, 191.0);
    pushxy(data1, 151.0, 248.0);
    pushxy(data1, 154.0, 305.0);
    pushxy(data1, 156.0, 363.0);
    pushxy(data1, 198.0, 20.0);
    pushxy(data1, 200.0, 76.0);
    pushxy(data1, 203.0, 132.0);
    pushxy(data1, 205.0, 189.0);
    pushxy(data1, 208.0, 245.0);
    pushxy(data1, 211.0, 302.0);
    pushxy(data1, 213.0, 360.0);
    pushxy(data1, 254.0, 18.0);
    pushxy(data1, 256.0, 74.0);
    pushxy(data1, 259.0, 130.0);
    pushxy(data1, 262.0, 186.0);
    pushxy(data1, 264.0, 242.0);
    pushxy(data1, 267.0, 299.0);
    pushxy(data1, 270.0, 357.0);
    pushxy(data1, 310.0, 16.0);
    pushxy(data1, 313.0, 72.0);
    pushxy(data1, 315.0, 128.0);
    pushxy(data1, 318.0, 184.0);
    pushxy(data1, 321.0, 240.0);
    pushxy(data1, 324.0, 297.0);
    pushxy(data1, 327.0, 354.0);
    pushxy(data1, 369.0, 69.0);
    pushxy(data1, 371.0, 125.0);
    pushxy(data1, 374.0, 181.0);
    pushxy(data1, 377.0, 237.0);
    pushxy(data1, 381.0, 294.0);
    pushxy(data1, 383.0, 351.0);

    var data2 = [];
    pushxy(data2, 94.0, 23.0);
    pushxy(data2, 96.0, 79.0);
    pushxy(data2, 99.0, 135.0);
    pushxy(data2, 104.0, 249.0);
    pushxy(data2, 107.0, 306.0);
    pushxy(data2, 150.0, 20.0);
    pushxy(data2, 153.0, 76.0);
    pushxy(data2, 159.0, 189.0);
    pushxy(data2, 162.0, 246.0);
    pushxy(data2, 164.0, 303.0);
    pushxy(data2, 167.0, 361.0);
    pushxy(data2, 207.0, 17.0);
    pushxy(data2, 210.0, 73.0);
    pushxy(data2, 213.0, 130.0);
    pushxy(data2, 216.0, 186.0);
    pushxy(data2, 219.0, 243.0);
    pushxy(data2, 221.0, 300.0);
    pushxy(data2, 224.0, 358.0);
    pushxy(data2, 266.0, 71.0);
    pushxy(data2, 269.0, 127.0);
    pushxy(data2, 272.0, 183.0);
    pushxy(data2, 275.0, 240.0);
    pushxy(data2, 278.0, 297.0);
    pushxy(data2, 281.0, 355.0);
    pushxy(data2, 323.0, 68.0);
    pushxy(data2, 326.0, 124.0);
    pushxy(data2, 329.0, 181.0);
    pushxy(data2, 332.0, 237.0);
    pushxy(data2, 335.0, 294.0);
    pushxy(data2, 379.0, 65.0);
    pushxy(data2, 382.0, 121.0);

    var dataYErr = [];
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            pushxy(dataYErr, 10 + i * 40, 20 + j * 50);
        }
    }
    dataYErr[3].y++;

    var dataXErr = [];
    for (var i = 0; i < 5; i++) {
        for (var j = 0; j < 5; j++) {
            pushxy(dataXErr, 10 + i * 50, 20 + j * 40);
        }
    }
    dataXErr[3].x++;
    console.log(dataXErr);

    it("createFromPoints(pts, options) should create a grid to match points", function() {
        var grid1 = Grid.createFromPoints(data1, {
            imageSize: {
                w: 400,
                h: 400,
            }
        });
        var e = 0.001;
        grid1.angle.should.within(-2.5964 - e, -2.5964 + e);
        should.deepEqual(grid1.imageSize, {
            w: 400,
            h: 400,
        });
        should.deepEqual(grid1.cellSize, {
            w: 56.66,
            h: 56.61,
        });
        should.deepEqual(grid1.cellAtRowCol(0, 0), {
            r: 0,
            c: 0,
            x: 205,
            y: 189,
        });
    });
    it("cellAtXY(x,y) should return cell at position", function() {
        var gridXErr = Grid.createFromPoints(dataXErr);
        var ptXErr = {
            c: -4,
            r: -1,
            x: 10.2,
            y: 180,
        };
        should.deepEqual(gridXErr.cellAtXY(10, 180), ptXErr);
        var dpos = 19;
        should.deepEqual(gridXErr.cellAtXY(10 + dpos, 180 + dpos), ptXErr);
        should.deepEqual(gridXErr.cellAtXY(10 + dpos, 180 - dpos), ptXErr);
        should.deepEqual(gridXErr.cellAtXY(10 - dpos, 180 + dpos), ptXErr);
        should.deepEqual(gridXErr.cellAtXY(10 - dpos, 180 - dpos), ptXErr);

        var grid1 = Grid.createFromPoints(data1);
        should.deepEqual(grid1.cellAtXY(205, 189), {
            c: 0,
            r: 0,
            x: 205,
            y: 189,
        });
        should.deepEqual(grid1.cellAtXY(206, 190), {
            c: 0,
            r: 0,
            x: 205,
            y: 189,
        });
        should.deepEqual(grid1.cellAtXY(204, 188), {
            c: 0,
            r: 0,
            x: 205,
            y: 189,
        });
        should.deepEqual(grid1.cellAtXY(140, 230), {
            c: -1,
            r: 1,
            x: 150.95,
            y: 248.12,
        });
        should.deepEqual(grid1.cellAtXY(250, 132), {
            c: 1,
            r: -1,
            x: 259.05,
            y: 129.88,
        });
    })
    it("cellAtRow(row, col) should return cell at position", function() {
        var grid1 = Grid.createFromPoints(data1);
        should.deepEqual(grid1.cellAtRowCol(0, 1), {
            r: 0,
            c: 1,
            x: 261.6,
            y: 186.43,
        });
        should.deepEqual(grid1.cellAtRowCol(0, -2), {
            r: 0,
            c: -2,
            x: 91.8,
            y: 194.13,
        });
        should.deepEqual(grid1.cellAtRowCol(2, 1), {
            r: 2,
            c: 1,
            x: 266.7,
            y: 299.53,
        });
        var grid2 = Grid.createFromPoints(data2, {
            imageSize: {
                w: 800,
                h: 600,
            }
        });
        should.deepEqual(grid2.cellSize, {
            w: 59.2,
            h: 62.18,
        });
        should.deepEqual(grid2.imageSize, {
            w: 800,
            h: 600,
        });
    })
    it("statsFromPoints(pts, option) should return error statistics for point alignment to grid", function() {
        var e = 0.01;
        var gridXErr = Grid.createFromPoints(dataXErr);
        var statsXErr = gridXErr.statsFromPoints(dataXErr);
        statsXErr.yRMSE.should.equal(0);
        statsXErr.xRMSE.should.within(0.20 - e, 0.20 + e);
        should.deepEqual(gridXErr.cellSize, {
            h: 40,
            w: 49.95,
        });

        var gridYErr = Grid.createFromPoints(dataYErr);
        var statsYErr = gridYErr.statsFromPoints(dataYErr);
        statsYErr.xRMSE.should.equal(0);
        statsYErr.yRMSE.should.within(0.2 - e, 0.2 + e);
        should.deepEqual(gridYErr.cellSize, {
            w: 40,
            h: 50,
        });

        var grid1 = Grid.createFromPoints(data1);
        var stats1 = grid1.statsFromPoints(data1);
        var e = 0.01;
        stats1.xRMSE.should.within(0.57 - e, 0.57 + e); // x RMS error
        stats1.yRMSE.should.within(0.73 - e, 0.73 + e); // y RMS error

        var grid2 = Grid.createFromPoints(data2);
        var stats2 = grid2.statsFromPoints(data2);
        var e = 0.0001;
        stats2.xRMSE.should.within(3.82 - e, 3.82 + e);
        stats2.yRMSE.should.within(10.09 - e, 10.09 + e);

    });
    it("Javascript promises should work", function() {
        var worker = function(outcome) {
            return function(resolve, reject) {
                setTimeout(function() {
                    try {
                        if (outcome == true) {
                            resolve("resolved");
                        } else if (outcome == false) {
                            reject("not resolved");
                        } else {
                            throw new Error("error");
                        }
                    } catch (e) {
                        reject(e);
                    }
                }, 100);
            }
        }
        var ok = 0;
        var promiseGood = new Promise(worker(true)).then(function(result) {
            result.should.equal("resolved");
            ok += 1;
        });
        promiseGood.catch(function(err) {
            ok += 2;
        });
        var promiseBad = new Promise(worker(false)).then(function(result) {
            ok += 20;
        });
        promiseBad.catch(function(err) {
            err.should.equal("not resolved");
            ok += 10;
        });
        var promiseThrow = new Promise(worker(null)).then(function(result) {
            ok += 200;
        });
        promiseThrow.catch(function(err) {
            err.should.instanceOf(Error);
            err.message.should.equal("error");
            ok += 100;
        });
        setTimeout(function() {
            ok.should.equal(111);
        }, 200);
    });
})
