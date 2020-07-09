
/// 대기방 상태

// socektid = 유저 고유 id.
export type userType = { time : number , socketId: string} 
export type roomType = { roomId : string , roomNumber: number} 

export type updateState = { disconnectList? : string[], roomLeavingList?: string[] }
export type responseType = { videoId : string, title: string }

export type totalState =  { waitRoomState : waitingRoomStateType , roomState : roomStateType}
export type waitingRoomStateType = {
    /// socketid로 조회.
    [key: string]: userType
}
/// 노래부르는 방 상태
export type roomStateType = {
    /// roomid로 조회
    [key: string]: {
        // room안에 들어가있는 유저 + 
        socektIds : {[key: string] : userType },
        // 랜덤으로 배정된 고유 pageID 
        roomId : string,
        //방안의 리모컨 상태
        remoteControl: {[key:string]: userType },
        // 몇번째방인가?
        roomNumber: number,
        limits: number,
    }
} 

export type  errorType = {
    errorType : number,
    errorMessage: string,
}
