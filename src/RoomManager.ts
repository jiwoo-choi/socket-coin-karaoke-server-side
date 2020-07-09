import { waitingRoomStateType, roomStateType, errorType, totalState, userType, updateState, roomType } from "./type";

/// 대기방으로 입장했을때 = 대기방 들어가기 or 대기방들어가기 + 방에서 나가기.

/// 대기방에서 나갔을때 = 완전종료 operation or 방에 들어가기.

/// 방에 들어갔을때 = 대기방 나가기 + 방에 들어가기.

/// 방에서 나왔을때 = 방에서 나가기 + 대기방 입장하기.
/// ㅅ
/// 완전종료 = disconnect

interface RoomManagerRequirement { 

    /// To do 각각 나눠서 조합해서처리해준다?
    /// => 그럴려면 socket.io 인터페이스까지 합쳐야함. 
    /// => socket.io인터페이스 없이 그냥 이면, 이렇게 두번연산해야함. socket.io에서 나누고 
    // -> 그다음에 또 다시나누고.. -> 
    // 그럼 socekt.io 인터페이스에 맞게 하는방법도있음
    // waitin , waitout, joinin.. 이런식으로 메소드를 잘게 조개면됨.
 
    // 완전한 mutation을 ㅇ해야하는가
    // Getter setter?

    //Waitin
    //Waitout
    //Joinin
    //Joinout
    //Exit
    //Enter
    // 대기방을 통해 들어오지 않은 너. ERROR
    //susbscribe error 처리기.
    enterWaitRoom( userState: userType , callback: (state?:totalState, updateState?:updateState,  error?: errorType) => void ) : void;// 현재 room 상황 반환.
    enterRoom( userState: userType , roomState: roomType, callback: (state?: totalState, updateState?:updateState, error?: errorType) => void) : void;
    connetRemote( userState: userType , roomId: string  , callback: (state?: totalState , updateState?:updateState,  error?: errorType) => void) :void;
    exit( userId: string, callback: (state?: totalState , updateState?:updateState,  error?: errorType) => void):void;
}

interface Socekt {
    /// 소켓을 받아들어야해.
}



/// TODO : disconnect도 처리해줘야함. 필요없는 disconnect애들 다 쳐내.


/// 접속인원 관리해주는 클래스 매니저.
export default class RoomManager implements RoomManagerRequirement {

    private waitRoomState: waitingRoomStateType = {}
    private roomState:roomStateType = {}
    private limitPerRoom! : number;
    private totalRoomNumber! : number;

    /**
      * room 정원 : room의 limitperroom
      * room의 개수: room의 개수. totalroomnumber- > roomstate에 
      * 리모콘 1인당 1개. <- 이건 불변~.
     */

    constructor(limitPerRoom : number = 1, totalRoomNumber: number = 4) {
        this.limitPerRoom = limitPerRoom;
        this.totalRoomNumber = totalRoomNumber;

        for (let index = 0 ; index < totalRoomNumber; index++ ) {
            const roomId = Math.random().toString(36).substr(2,11);
            const roomNumber = index + 1;
            this.roomState = {...this.roomState, [roomId]: { roomId, roomNumber, remoteControl : {}, socektIds:{} ,limits: limitPerRoom}}
        }
    }

    /// Object에서 특정 키값 삭제하는 오퍼레이션. 
    private removeFromObject(key: string, total: any){ 
        return Object.keys(total).reduce( (prev,curr) => {
            if (curr === key) {
                return prev;
            } else {
                prev[curr] = total[curr];
                return prev;
            }
        }, {} as any)
    }


    private getCurrentState(): totalState {
        return {waitRoomState: this.waitRoomState, roomState: this.roomState}
    }

    enterWaitRoom(userState: userType, callback: (state?: totalState, updateState?:updateState, error?: errorType)  => void) {
        // 방에서 나온경우
        const { socketId , time } = userState
        let updateList: string[] = [];
        let leavingList: string[] = [];

        for (const [roomId, roomState] of Object.entries(this.roomState)) {
            // 모든 방을 체크합니다. 만약 방에 있던 사람이면 그 방에서 흔적을 지워줍시다.
            for (const [userId, userState] of Object.entries(roomState.socektIds)) {
                if (userId === socketId) {
                    console.log(socketId, "님이 방을 나왔습니다.")
                    leavingList.push("room_"+roomId);
                    this.roomState[roomId].socektIds = this.removeFromObject(userId ,this.roomState[roomId].socektIds)
                    break;
                }
            } 

            if (Object.keys(this.roomState[roomId].socektIds).length === 0) {
                if (Object.keys(this.roomState[roomId].remoteControl).length > 0 ) {
                    console.log("방에 아무도 없기 때문에 리모콘도 모두 disconnect되었습니다.")
                    let a = Object.keys(this.roomState[roomId].remoteControl!);
                    updateList.concat(a);
                    this.roomState[roomId].remoteControl = {}
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
        this.waitRoomState = {...this.waitRoomState , [socketId]: userState } 
        console.log(socketId, "님이 대기실로 입장하였습니다.")
        callback(this.getCurrentState(), { roomLeavingList: leavingList, disconnectList : updateList }, undefined);
    }

    enterRoom(userState: userType , roomState: roomType, callback: (state?:totalState,updateState?:updateState , error?: errorType) => void) {
        // TO-Do : 허가된 방 외에 접속하려고한다. (join을 쓰기떄문에 아무작동안하긴함...)
        // 방보다 큰경우 에러방출해야함
        // 들어갈려는 방에 정원이 꽉찼다.
        const { roomId, roomNumber } = roomState
        const { time, socketId } = userState 

        if (!this.roomState[roomId]) {
            // 이미 room은 다 정해져있기때문에 그 외로 접속하는것은 다 올바르지 않습니다.
            callback(undefined, undefined ,{errorType: 1, errorMessage: "정상적인 접근이 아닙니다"})
        } else {

            if (Object.keys(this.roomState[roomId].socektIds).length + 1 > this.limitPerRoom) { 
                // 정원이 꽉찬경우...!
                callback(undefined, undefined, {errorType: 1, errorMessage: "정원이 꽉 찼습니다"})
                return;
            }

            if (this.waitRoomState[socketId]) {  
                const userInfo = this.waitRoomState[socketId]
                console.log(socketId, " : 대기방에서 나갑니다");
                this.waitRoomState = this.removeFromObject(socketId, this.waitRoomState); 
                console.log(socketId, "가 ",  roomId, "에 들어갑니다");
                this.roomState = { ...this.roomState, [roomId] : { ...this.roomState[roomId], socektIds: {...this.roomState[roomId].socektIds, [socketId]: userState}}} 
                callback(this.getCurrentState(),undefined,undefined)
            } else {
                callback(undefined, undefined ,{errorType: 1, errorMessage: "정상적인 접근이 아닙니다"})
            }
        }
    }

    connetRemote(userState: userType , roomId: string , callback: (state?: totalState , updateState?:updateState,  error?: errorType) => void)  {
        const { socketId , time } = userState

        if (this.roomState[roomId]) {
            // 리모컨이 방에 이미 연결되어있는경우.
            // TO-DO : 예전 리모컨 연결 세션을 disconnect하고, 새로운 연결 세션을 연결해버림.
            // <= 현재 불가. 리모콘이 종속되어있지않고 자유롭게있어서..
            // To-Do : 리모콘 1인 1개 정책?
            
            if (Object.keys(this.roomState[roomId].remoteControl).length+1 > this.limitPerRoom) {
                // remoteControl의 할당량을 넘긴경우.
                callback(undefined, undefined, {errorType: 1, errorMessage: "리모컨은 이미 연결되어 있습니다"})
            } else {
                console.log( socketId, "가 리모콘으로써 연결되었습니다.")
                this.roomState[roomId].remoteControl = { ...this.roomState[roomId].remoteControl, [socketId] : userState}
                callback(this.getCurrentState(), undefined, undefined)
            }
        } else {
            // 방에 아무도없이 리모컨만 단독으로 연결? : 에러
            callback(undefined, undefined, {errorType: 1, errorMessage: "정상적인 접근이 아닙니다"})
        }
    }


    exit(userId: string, callback: (state?: totalState , updateState?:updateState,  error?: errorType) => void) {
        // 누군가 나갔다. 
        // disconnect 했을경우와 동치인 상황.

        if (this.waitRoomState[userId]) {
            // 대기방에 있는경우.
            console.log(userId, "대기실에서 나갔습니다")
            this.waitRoomState = this.removeFromObject(userId, this.waitRoomState)
            callback(this.getCurrentState(), undefined , undefined)    
            return;
        } else {

            // 그렇지 않을경우 두가지 케이스
            // 1. 인간이 나간경우.
            // 2. 리모컨이 나간경우.

            // 인간이 나갔는지 검사.

            let updateList : string[] = []

            for ( const [roomId, roomState] of Object.entries(this.roomState)) {
                // 모든 방 검사

                // 리모콘이 끊어졌는지 체크.
                for (const [remoteIds, remoteState] of Object.entries(roomState.remoteControl)) {
                    if (remoteIds === userId) { 
                        console.log(userId, "리모콘이 종료되었습니다")
                        this.roomState[roomId].remoteControl = this.removeFromObject(remoteIds, this.roomState[roomId].remoteControl);
                        return;
                    }
                }    

                // 인간이 끊어졌는지 체크.
                for (const [socketId,userState] of Object.entries(roomState.socektIds)) {
                // 모든 인원 검사

                    if (userId === socketId) {
                        // 인간이 나간거였음. 이럴경우 socektIds를 제거.
                        console.log(userId, "방안에서 그냥 나갔습니다")
                        this.roomState[roomId].socektIds = this.removeFromObject(socketId, this.roomState[roomId].socektIds)
                    }   

                    // 그리고 관련 리모컨들도 세션도 다 끊어져야함. 억지로 disconnect 시키자.
                    if (Object.keys(roomState.socektIds).length === 0) {
                        if (Object.keys(this.roomState[roomId].remoteControl).length > 0 ) {
                            console.log("방에 아무도 없기 때문에 리모콘도 모두 disconnect되었습니다.")
                            updateList.concat(Object.keys(this.roomState[roomId].remoteControl!))
                            this.roomState[roomId].remoteControl = {}
                        }
                    }
                }
            }
            callback(this.getCurrentState(), { disconnectList : updateList}, undefined)    
        }
    }

}