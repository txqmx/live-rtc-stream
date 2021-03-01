export function checkTURNServer(turnConfig, timeout){
  return new Promise(function(resolve, reject){
    let promiseResolved = false
    let pc = new RTCPeerConnection({iceServers:[...turnConfig]})
    setTimeout(function(){
      if(promiseResolved) return
      resolve(false)
      promiseResolved = true
    }, timeout || 5000)


    pc.createDataChannel('')
    pc.createOffer().then((sdp) => {
      if(sdp.sdp.indexOf('typ relay') > -1){
        promiseResolved = true
        resolve(true)
      }
      pc.setLocalDescription(sdp)
    })
    pc.onicecandidate = function(ice){
      if(promiseResolved || !ice || !ice.candidate || !ice.candidate.candidate || !(ice.candidate.candidate.indexOf('typ relay')>-1))  return
      promiseResolved = true
      resolve(true)
    };
  });
}
