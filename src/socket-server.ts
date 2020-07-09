
// import express = require('express');
// const app = express()
import http from 'http'
import socketio from 'socket.io'
import RoomManager from './RoomManager'
import { roomType, responseType } from './type';

const server = http.createServer();
const portNo = 3001

const io = socketio.listen(server);
server.listen(portNo, () => {
    console.log("서버 실행!");
})

const rm = new RoomManager();

// To-Do : 클라이언트, 리시버, 센더, 서버를 모두 아우르는 인터페이스 제작.
// To-do : 오퍼레이션을 나눠서, 필요없는 연산 하지 않게 조정.
// To-do : 동시성 지원해야할것. concurrency.


// io.emit 전체에게emit
// io.sockets.sockets[socketId] // 특정 socket 찾기..
// io.socekts.in (특정 room으로 들어감) // in.emit() 방안에 있는사람들에게만 emit

// socekt 관련...
// socket.join = 그 유저만 room 에 jorn 
// socket.leave  = 그 유저만 room에 leave
// socket send - 메세지보내기
// soket emit - 그 유저에게만 emit
// socekt on - 이 유저는 요청한걸 받는다. 
// 첫 접속시... 전체 뷰 업데이트.

io.on('connection', (socket) => {
    const socketId = socket.client.id;
    const time = Date.now();
    const userState = { socketId, time }
    console.log("사용자 최초 접속", socketId)

    socket.on('disconnect', () => {
        rm.exit(socketId, ( state, updateState, error) => {
           
            if (updateState) {
                if (updateState.disconnectList) {
                    for (let id of updateState.disconnectList) {
                        if(io.sockets.sockets[id]) {
                            io.sockets.sockets[id].disconnect();
                        }
                    }  
                }

                if (updateState.roomLeavingList) {
                    for (let id of updateState.roomLeavingList) {
                        socket.leave(id)
                    }  
                }
            }


            if (state) {
                io.emit('view-update', state);
            }
       })
        console.log(socketId, "가 끊겼습니다.")
    })


    socket.on('join-wait-room', ()=> {
        rm.enterWaitRoom(userState, (state, updateState, error) => {
            if (error) {
                socket.emit('view-error', error);
            } else {
                // 실제로 들어온경우.
                // 방을 나온경우.

                // disconnect를 시켜야하는경우.

                io.emit('view-update', state);
            }

            if (updateState) {
                if (updateState.disconnectList) {
                    for (let id of updateState.disconnectList) {
                        if(io.sockets.sockets[id]) {
                            io.sockets.sockets[id].disconnect();
                        }
                    }  
                }
                
                if (updateState.roomLeavingList) {
                    for (let id of updateState.roomLeavingList) {
                        console.log("leaving... : ", id)
                        socket.leave(id)
                    }  
                }
            }
        })
    })


    socket.on('join-room', (roomInfo:roomType)=> {
        rm.enterRoom(userState, roomInfo, (state, updateState, error) => {
            if (error) {
                socket.emit('view-error', error);
            } else {
                console.log("joining... : ", 'room_' + roomInfo.roomId);
                socket.join('room_' + roomInfo.roomId);
                //방을 나오면 leave가능하긴한디.. leave가불가함?? 새로접속하는수밖에없음.
                io.emit('view-update', state);
            }

            if (updateState) {
                if (updateState.disconnectList) {
                    for (let id of updateState.disconnectList) {
                        if(io.sockets.sockets[id]) {
                            io.sockets.sockets[id].disconnect();
                        }
                    }  
                }

                if (updateState.roomLeavingList) {
                    for (let id of updateState.roomLeavingList) {
                        socket.leave(id)
                    }  
                }
            }

        })
    })

    socket.on('connect-remote', (roomid:string) => {
        rm.connetRemote(userState, roomid, (state, updateState,error) => {
            if (error) {
                socket.emit('view-error', error);
            } else {

            }
        })
    })

    //
    // socket.on('connect-room', (roomInfo:roomType)=> {
    //     rm.enterRoom(userState, roomInfo, (state, updateState, error) => {
    //         if (error) {
    //             socket.emit('view-error', error);
    //         } else {
    //             socket.join('room_' + roomInfo.roomId);
    //             //방을 나오면 leave가능하긴한디.. leave가불가함?? 새로접속하는수밖에없음.
    //             io.emit('view-update', state);
    //         }
    //     })
    // })


    socket.on('add-song', (roomId: string, data: responseType) => {
        //그걸 소켓 id를 구분하여... 그쪽에게만 소켓에게만 보내준다.
        //받은 소켓 아이디를 기반으로 구분시켜준다..
        io.sockets.in('room_' + roomId).emit('get-add-song', data);
    })
    
    socket.on('priority-add-song', (roomId: string, data: responseType) => {
        io.sockets.in('room_' + roomId).emit('get-priority-add-song', data)
    })

    socket.on('play-song', (roomId: string, data: responseType) => {
        io.sockets.in('room_' + roomId).emit('get-play-song', data)
    })

    socket.on('cancel-song', (roomId: string, data: responseType) => {
        io.sockets.in('room_' + roomId).emit('get-cancel-song', data)
    })






    // socket.on('join-room', ({roomId, id}) => {
    //     addToJoinRoomList(socket, {roomId, id});
    // })

    // //방을 떠난 경우..
    // socket.on('leave-room', () => {
    //     removeFromJoinRoomList(socket)
    // })

})






