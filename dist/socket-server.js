"use strict";
// import express = require('express');
// const app = express()
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var http_1 = __importDefault(require("http"));
var socket_io_1 = __importDefault(require("socket.io"));
var RoomManager_1 = __importDefault(require("./RoomManager"));
var server = http_1.default.createServer();
var portNo = 3001;
var io = socket_io_1.default.listen(server);
server.listen(portNo, function () {
    console.log("서버 실행!");
});
var rm = new RoomManager_1.default();
io.on('connection', function (socket) {
    var socketId = socket.client.id;
    var time = Date.now();
    var userState = { socketId: socketId, time: time };
    console.log("사용자 최초 접속", socketId);
    rm.enterWaitRoom(userState, function () {
    });
    socket.on('disconnect', function () {
        rm.exit(socketId, function (state, updateState, error) {
            if (updateState) {
                for (var _i = 0, _a = updateState.disconnectList; _i < _a.length; _i++) {
                    var id = _a[_i];
                    if (io.sockets.sockets[id]) {
                        io.sockets.sockets[id].disconnect();
                    }
                }
            }
        });
        console.log(socketId, "가 끊겼습니다.");
    });
});
