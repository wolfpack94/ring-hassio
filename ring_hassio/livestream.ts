//Far majority of this code by Dgreif https://github.com/dgreif/ring/examples/browser_example.ts

import "dotenv/config";
import { RingApi, RingCamera, SipSession } from "ring-client-api";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as url from "url";
import * as zlib from "zlib";

const PORT = process.env.RING_PORT;

const publicOutputDirectory = path.join("public/");

/**
 * promisified functions
 */
const fsExists = promisify(fs.exists).bind(fs);
const mkdir = promisify(fs.mkdir).bind(fs);

let ringClient: RingApi;

const getRingClient = () => {
  if (ringClient) return ringClient;
  ringClient = new RingApi({
    // Refresh token is used when 2fa is on
    refreshToken: process.env.RING_REFRESH_TOKEN!,
    debug: true,
  });
  return ringClient;
};

const startServer = async (cameras: RingCamera[]) => {
  const server = http
    .createServer(async (req, res) => {
      // Get URL
      let uri = url.parse(req.url).pathname;
      console.log("requested uri: " + uri);
      // If Accessing The Main Page
      if (uri == "/index.html" || uri == "/") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.write("<html><head><title>Ring Livestream</title></head><body>");
        res.write("<h1>Welcome to your Ring Livestream!</h1>");
        cameras.forEach((camera) => {
          res.write(
            `<video width="352" height="198" controls autoplay src="public/${camera.data.id}.m3u8"></video>`
          );
          res.write(
            `<br/>${camera.name} <a href="public/${camera.data.id}.m3u8">the stream</a> in a player such as VLC.`
          );
        });
        res.write(
          `<table><tr><th>Cameras</th><th>Camera Names</th></tr><tr>${cameras.map(
            (camera) => `<td>${camera.name} | ${camera.data.id}</td>`
          )}</tr></table>`
        );
        res.end();
        return;
      }

      let filename = path.join("./", uri);
      console.log("mapped filename: " + filename);
      const fileExists = await fsExists(filename);
      if (!fileExists) {
        console.log("file not found: " + filename);
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write(`file not found: ${filename}%s\n`);
        return res.end();
      }
      console.log("sending file: " + filename);

      switch (path.extname(uri)) {
        case ".m3u8":
          fs.readFile(filename, function (err, contents) {
            if (err) {
              res.writeHead(500);
              res.end();
            } else if (contents) {
              res.writeHead(200, {
                "Content-Type": "application/vnd.apple.mpegurl",
              });
              let ae = req.headers["accept-encoding"];
              if (ae && (ae as string).match(/\bgzip\b/)) {
                zlib.gzip(contents, function (err, zip) {
                  if (err) throw err;
                  res.writeHead(200, { "content-encoding": "gzip" });
                  return res.end(zip);
                });
              } else {
                return res.end(contents, "utf-8");
              }
            } else {
              console.log("empty playlist");
              res.writeHead(500);
              return res.end();
            }
          });
          break;
        case ".ts":
          res.writeHead(200, { "Content-Type": "video/MP2T" });
          let stream = fs.createReadStream(filename);
          stream.pipe(res);
          break;
        default:
          console.log("unknown file type: " + path.extname(uri));
          res.writeHead(500);
          res.end();
      }
    })
    .listen(PORT);

  // Maintain a hash of all connected sockets
  let sockets = {},
    nextSocketId = 0;
  server.on("connection", function (socket) {
    // Add a newly connected socket
    let socketId = nextSocketId++;
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
};

const startStream = async (camera: RingCamera): Promise<SipSession> => {
  console.log(`Before starting stream of ${camera.name}`);
  const sipSession = await camera.streamVideo({
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
      path.join(publicOutputDirectory, `${camera.data.id}.m3u8`),
    ],
  });

  sipSession.onCallEnded.subscribe(() => {
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

  return sipSession;
};

const initializeStream = async (cameras: RingCamera[]) => {
  console.log("output directory: " + publicOutputDirectory);

  if (!(await fsExists(publicOutputDirectory))) {
    await mkdir(publicOutputDirectory);
  }

  const sessions = {};
  for (const camera of cameras) {
    console.log(
      `camera device id: ${camera.data.device_id} | camera name: ${camera.name} | camera id: ${camera.data.id}`
    );
    try {
      sessions[camera.data.id] = await startStream(camera);
    } catch (e) {
      console.error(`Error starting: ${camera.name}`);
    }
  }
};

(async () => {
  if (!("RING_REFRESH_TOKEN" in process.env) || !("RING_PORT" in process.env)) {
    console.log(
      "Missing environment letiables. Check RING_REFRESH_TOKEN, RING_PORT are set."
    );
    process.exit();
  } else {
    const cameras = await getRingClient().getCameras();
    console.log("Before initializing streams");
    await initializeStream(cameras);
    console.log(`Before initializing server with: ${cameras.length} cameras`);
    await startServer(cameras);
  }
})();
