"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
/// TODO : disconnect도 처리해줘야함. 필요없는 disconnect애들 다 쳐내.
/// 접속인원 관리해주는 클래스 매니저.
var RoomManager = /** @class */ (function () {
    function RoomManager(limitPerRoom) {
        if (limitPerRoom === void 0) { limitPerRoom = 1; }
        this.waitRoomState = {};
        this.roomState = {};
        this.limitPerRoom = limitPerRoom;
    }
    /// Object에서 특정 키값 삭제하는 오퍼레이션. 
    RoomManager.prototype.removeFromObject = function (key, total) {
        return Object.keys(total).reduce(function (prev, curr) {
            if (curr === key) {
                return prev;
            }
            else {
                prev[curr] = total[curr];
                return prev;
            }
        }, {});
    };
    RoomManager.prototype.getCurrentState = function () {
        return { waitRoomState: this.waitRoomState, roomState: this.roomState };
    };
    RoomManager.prototype.enterWaitRoom = function (userState, callback) {
        var _a;
        // 방에서 나온경우
        var socketId = userState.socketId, time = userState.time;
        var updateList = [];
        for (var _i = 0, _b = Object.entries(this.roomState); _i < _b.length; _i++) {
            var _c = _b[_i], roomId = _c[0], roomState = _c[1];
            // 모든 방을 체크합니다. 만약 방에 있던 사람이면 그 방에서 흔적을 지워줍시다.
            for (var _d = 0, _e = Object.entries(roomState.socektIds); _d < _e.length; _d++) {
                var _f = _e[_d], userId = _f[0], userState_1 = _f[1];
                if (userId === socketId) {
                    console.log(socketId, "님이 방을 나왔습니다.");
                    this.roomState[roomId].socektIds = this.removeFromObject(userId, this.roomState[roomId].socektIds);
                    break;
                }
            }
            if (Object.keys(this.roomState[roomId].socektIds).length === 0) {
                if (this.roomState[roomId].remoteControl) {
                    console.log("방에 아무도 없기 때문에 리모콘도 모두 disconnect되었습니다.");
                    var a = Object.keys(this.roomState[roomId].remoteControl);
                    updateList.concat(a);
                    this.roomState[roomId].remoteControl = undefined;
                }
            }
        }
        // 방안에 아무도 없으면 리모컨도 지워줍니다. // TO-DO : 이럴경우 억지로 disconnect 시켜줘야함.- 
        // 추가적으로 의도되지않은 side에서 지워야할경우 updateState에 실어서 보내주자.
        // d예를들어, enterwaitroom일경우는 socket.io쪽에서 이미 어떤 행동인지안다.
        // 하지만 그외에 사람이없을경우 -> 리모컨연결끊기.. 등에 관련된 컨트롤은 여기서 정해줘야한다.
        // 인당 리모콘 개념이 아님..? 독립개념? 서로 의존하지않음?
        // 만약에 리모콘 업데이트되었으면, 소켓에서는 그걸 어떻게암? 
        // disconnectList? 스냅샷?
        // 데이터바인딩 어케하누? // rx/js로 데이터바인딩? => socket.io. -> rx?
        // 그리고 넣어줍니다.
        this.waitRoomState = __assign(__assign({}, this.waitRoomState), (_a = {}, _a[socketId] = userState, _a));
        console.log(socketId, "님이 대기실로 입장하였습니다.");
        callback(this.getCurrentState(), { disconnectList: updateList }, undefined);
    };
    RoomManager.prototype.enterRoom = function (userId, roomId, callback) {
        // TO-Do : 허가된 방 외에 접속하려고한다. (join을 쓰기떄문에 아무작동안하긴함...)
        // 방보다 큰경우 에러방출해야함
        // 들어갈려는 방에 정원이 꽉찼다.
        var _a, _b;
        if (Object.keys(this.roomState[roomId].socektIds).length + 1 > this.limitPerRoom) {
            callback(undefined, undefined, { errorType: 1, errorMessage: "정원이 꽉 찼습니다" });
            return;
        }
        else {
            // 들어가려는 방에 정원이 남는다!
            //5번. 대기방에 있다가 들어오는경우.
            if (this.waitRoomState[userId]) {
                var userInfo = this.waitRoomState[userId];
                console.log(userId, " : 대기방에서 나갑니다");
                this.waitRoomState = this.removeFromObject(userId, this.waitRoomState);
                console.log(userId, "가 ", roomId, "에 들어갑니다");
                this.roomState = __assign(__assign({}, this.roomState), (_a = {}, _a[roomId] = { roomId: roomId, socektIds: (_b = {}, _b[userId] = userInfo, _b) }, _a));
                callback(this.getCurrentState(), undefined, undefined);
            }
            else {
                //7번. 그냥 방에 난입.
                callback(undefined, undefined, { errorType: 1, errorMessage: "정상적인 접근이 아닙니다" });
            }
            return;
        }
    };
    RoomManager.prototype.connetRemote = function (userState, roomId, callback) {
        var _a, _b;
        // 방에 누군가 있는지 체크.
        var socketId = userState.socketId, time = userState.time;
        if (this.roomState[roomId]) {
            // 리모컨이 방에 이미 연결되어있는경우.
            // TO-DO : 예전 리모컨 연결 세션을 disconnect하고, 새로운 연결 세션을 연결해버림.
            // <= 현재 불가. 리모콘이 종속되어있지않고 자유롭게있어서..
            // To-Do : 리모콘 1인 1개 정책?
            if (this.roomState[roomId].remoteControl && Object.keys(this.roomState[roomId].remoteControl).length + 1 > this.limitPerRoom) {
                // remoteControl이 존재하는데, 거기에 할당량을 넘긴경우?
                callback(undefined, undefined, { errorType: 1, errorMessage: "리모컨은 이미 연결되어 있습니다" });
            }
            else {
                console.log(socketId, "가 리모콘으로써 연결되었습니다.");
                if (this.roomState[roomId].remoteControl) {
                    this.roomState[roomId].remoteControl = __assign(__assign({}, this.roomState[roomId].remoteControl), (_a = {}, _a[socketId] = userState, _a));
                    callback(this.getCurrentState(), undefined, undefined);
                }
                else {
                    this.roomState[roomId]["remoteControl"] = (_b = {}, _b[socketId] = userState, _b);
                    callback(this.getCurrentState(), undefined, undefined);
                }
            }
        }
        else {
            // 방에 아무도없이 리모컨만 단독으로 연결? : 에러
            callback(undefined, undefined, { errorType: 1, errorMessage: "정상적인 접근이 아닙니다" });
        }
    };
    RoomManager.prototype.exit = function (userId, callback) {
        // 누군가 나갔다. 
        // disconnect 했을경우와 동치인 상황.
        if (this.waitRoomState[userId]) {
            // 대기방에 있는경우.
            console.log(userId, "대기실에서 나갔습니다");
            this.waitRoomState = this.removeFromObject(userId, this.waitRoomState);
            return;
        }
        else {
            // 그렇지 않을경우 두가지 케이스
            // 1. 인간이 나간경우.
            // 2. 리모컨이 나간경우.
            // 인간이 나갔는지 검사.
            var updateList = [];
            for (var _i = 0, _a = Object.entries(this.roomState); _i < _a.length; _i++) {
                var _b = _a[_i], roomId = _b[0], roomState = _b[1];
                // 모든 방 검사
                // 리모콘이 끊어졌는지 체크.
                if (roomState.remoteControl) {
                    for (var _c = 0, _d = Object.entries(roomState.remoteControl); _c < _d.length; _c++) {
                        var _e = _d[_c], remoteIds = _e[0], remoteState = _e[1];
                        if (remoteIds === userId) {
                            console.log(userId, "리모콘이 종료되었습니다");
                            this.roomState[roomId].remoteControl = this.removeFromObject(remoteIds, this.roomState[roomId].remoteControl);
                            return;
                        }
                    }
                }
                // 인간이 끊어졌는지 체크.
                for (var _f = 0, _g = Object.entries(roomState.socektIds); _f < _g.length; _f++) {
                    var _h = _g[_f], socketId = _h[0], userState = _h[1];
                    // 모든 인원 검사
                    if (userId === socketId) {
                        // 인간이 나간거였음. 이럴경우 socektIds를 제거.
                        console.log(userId, "방안에서 그냥 나갔습니다");
                        this.roomState[roomId].socektIds = this.removeFromObject(socketId, this.roomState[roomId].socektIds);
                    }
                    // 그리고 관련 리모컨들도 세션도 다 끊어져야함. 억지로 disconnect 시키자.
                    if (Object.keys(roomState.socektIds).length === 0) {
                        if (roomState.remoteControl) {
                            console.log("방에 아무도 없기 때문에 리모콘도 모두 disconnect되었습니다.");
                            updateList.concat(Object.keys(this.roomState[roomId].remoteControl));
                            this.roomState[roomId].remoteControl = undefined;
                            callback(this.getCurrentState(), { disconnectList: updateList }, undefined);
                        }
                    }
                }
            }
        }
    };
    return RoomManager;
}());
exports.default = RoomManager;
