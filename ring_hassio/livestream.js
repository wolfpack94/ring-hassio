"use strict";
//Far majority of this code by Dgreif https://github.com/dgreif/ring/examples/browser_example.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
require("dotenv/config");
var ring_client_api_1 = require("ring-client-api");
var util_1 = require("util");
var fs = require("fs");
var path = require("path");
var http = require("http");
var url = require("url");
var zlib = require("zlib");
var PORT = process.env.RING_PORT;
var publicOutputDirectory = path.join("public/");
/**
 * promisified functions
 */
var fsExists = util_1.promisify(fs.exists).bind(fs);
var mkdir = util_1.promisify(fs.mkdir).bind(fs);
var ringClient;
var getRingClient = function () {
    if (ringClient)
        return ringClient;
    ringClient = new ring_client_api_1.RingApi({
        // Refresh token is used when 2fa is on
        refreshToken: process.env.RING_REFRESH_TOKEN,
        debug: true
    });
    return ringClient;
};
var startServer = function (cameras) { return __awaiter(void 0, void 0, void 0, function () {
    var server, sockets, nextSocketId;
    return __generator(this, function (_a) {
        server = http
            .createServer(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
            var uri, filename, fileExists, stream;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        uri = url.parse(req.url).pathname;
                        console.log("requested uri: " + uri);
                        // If Accessing The Main Page
                        if (uri == "/index.html" || uri == "/") {
                            res.writeHead(200, { "Content-Type": "text/html" });
                            res.write("<html><head><title>Ring Livestream</title></head><body>");
                            res.write("<h1>Welcome to your Ring Livestream!</h1>");
                            cameras.forEach(function (camera) {
                                res.write("<video width=\"352\" height=\"198\" controls autoplay src=\"public/" + camera.data.id + ".m3u8\"></video>");
                                res.write("<br/>" + camera.name + " <a href=\"public/" + camera.data.id + ".m3u8\">the stream</a> in a player such as VLC.");
                            });
                            res.write("<table><tr><th>Cameras</th><th>Camera Names</th></tr><tr>" + cameras.map(function (camera) { return "<td>" + camera.name + " | " + camera.data.id + "</td>"; }) + "</tr></table>");
                            res.end();
                            return [2 /*return*/];
                        }
                        filename = path.join("./", uri);
                        console.log("mapped filename: " + filename);
                        return [4 /*yield*/, fsExists(filename)];
                    case 1:
                        fileExists = _a.sent();
                        if (!fileExists) {
                            console.log("file not found: " + filename);
                            res.writeHead(404, { "Content-Type": "text/plain" });
                            res.write("file not found: " + filename + "%s\n");
                            return [2 /*return*/, res.end()];
                        }
                        console.log("sending file: " + filename);
                        switch (path.extname(uri)) {
                            case ".m3u8":
                                fs.readFile(filename, function (err, contents) {
                                    if (err) {
                                        res.writeHead(500);
                                        res.end();
                                    }
                                    else if (contents) {
                                        res.writeHead(200, {
                                            "Content-Type": "application/vnd.apple.mpegurl"
                                        });
                                        var ae = req.headers["accept-encoding"];
                                        if (ae && ae.match(/\bgzip\b/)) {
                                            zlib.gzip(contents, function (err, zip) {
                                                if (err)
                                                    throw err;
                                                res.writeHead(200, { "content-encoding": "gzip" });
                                                return res.end(zip);
                                            });
                                        }
                                        else {
                                            return res.end(contents, "utf-8");
                                        }
                                    }
                                    else {
                                        console.log("empty playlist");
                                        res.writeHead(500);
                                        return res.end();
                                    }
                                });
                                break;
                            case ".ts":
                                res.writeHead(200, { "Content-Type": "video/MP2T" });
                                stream = fs.createReadStream(filename);
                                stream.pipe(res);
                                break;
                            default:
                                console.log("unknown file type: " + path.extname(uri));
                                res.writeHead(500);
                                res.end();
                        }
                        return [2 /*return*/];
                }
            });
        }); })
            .listen(PORT);
        sockets = {}, nextSocketId = 0;
        server.on("connection", function (socket) {
            // Add a newly connected socket
            var socketId = nextSocketId++;
            sockets[socketId] = socket;
            console.log("socket", socketId, "opened");
            // Remove the socket when it closes
            socket.on("close", function () {
                console.log("socket", socketId, "closed");
                delete sockets[socketId];
            });
            // Extend socket lifetime for demo purposes
            socket.setTimeout(4000);
        });
        console.log("Started server, listening on port " + PORT + ".");
        return [2 /*return*/];
    });
}); };
var startStream = function (camera) { return __awaiter(void 0, void 0, void 0, function () {
    var sipSession;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Before starting stream of " + camera.name);
                return [4 /*yield*/, camera.streamVideo({
                        output: [
                            "-preset",
                            "veryfast",
                            "-g",
                            "25",
                            "-sc_threshold",
                            "0",
                            "-f",
                            "hls",
                            "-hls_time",
                            "2",
                            "-hls_list_size",
                            "6",
                            "-hls_flags",
                            "delete_segments",
                            path.join(publicOutputDirectory, camera.data.id + ".m3u8"),
                        ]
                    })];
            case 1:
                sipSession = _a.sent();
                sipSession.onCallEnded.subscribe(function () {
                    console.log("Call has ended");
                    // Destroy all open sockets
                    // for (let socketId in sockets) {
                    //   console.log("socket", socketId, "destroyed");
                    //   sockets[socketId].destroy();
                    // }
                    //app.stop()
                    console.log("Restarting server");
                    startStream(camera);
                });
                setTimeout(function () {
                    console.log("Stopping call...");
                    sipSession.stop();
                }, 10 * 60 * 1000); // 10*60*1000 Stop after 10 minutes.
                return [2 /*return*/, sipSession];
        }
    });
}); };
var initializeStream = function (cameras) { return __awaiter(void 0, void 0, void 0, function () {
    var sessions, _i, cameras_1, camera, _a, _b, e_1;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                console.log("output directory: " + publicOutputDirectory);
                return [4 /*yield*/, fsExists(publicOutputDirectory)];
            case 1:
                if (!!(_c.sent())) return [3 /*break*/, 3];
                return [4 /*yield*/, mkdir(publicOutputDirectory)];
            case 2:
                _c.sent();
                _c.label = 3;
            case 3:
                sessions = {};
                _i = 0, cameras_1 = cameras;
                _c.label = 4;
            case 4:
                if (!(_i < cameras_1.length)) return [3 /*break*/, 9];
                camera = cameras_1[_i];
                console.log("camera device id: " + camera.data.device_id + " | camera name: " + camera.name + " | camera id: " + camera.data.id);
                _c.label = 5;
            case 5:
                _c.trys.push([5, 7, , 8]);
                _a = sessions;
                _b = camera.data.id;
                return [4 /*yield*/, startStream(camera)];
            case 6:
                _a[_b] = _c.sent();
                return [3 /*break*/, 8];
            case 7:
                e_1 = _c.sent();
                console.error("Error starting: " + camera.name);
                return [3 /*break*/, 8];
            case 8:
                _i++;
                return [3 /*break*/, 4];
            case 9: return [2 /*return*/];
        }
    });
}); };
(function () { return __awaiter(void 0, void 0, void 0, function () {
    var cameras;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(!("RING_REFRESH_TOKEN" in process.env) || !("RING_PORT" in process.env))) return [3 /*break*/, 1];
                console.log("Missing environment letiables. Check RING_REFRESH_TOKEN, RING_PORT are set.");
                process.exit();
                return [3 /*break*/, 5];
            case 1: return [4 /*yield*/, getRingClient().getCameras()];
            case 2:
                cameras = _a.sent();
                console.log("Before initializing streams");
                return [4 /*yield*/, initializeStream(cameras)];
            case 3:
                _a.sent();
                console.log("Before initializing server with: " + cameras.length + " cameras");
                return [4 /*yield*/, startServer(cameras)];
            case 4:
                _a.sent();
                _a.label = 5;
            case 5: return [2 /*return*/];
        }
    });
}); })();
