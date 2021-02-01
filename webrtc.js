const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const textForSendSdp = document.getElementById('text-for-send-sdp');
const textToReceiveSdp = document.getElementById('text-for-receive-sdp');

let localStream = null;
let peerConnection = null;


const wsUrl = 'ws://localhost:8765/'
const ws = new WebSocket(wsUrl);

ws.onopen = (event) => {
    console.log('WS:open');
}
ws.onerror = (error) => {
    console.error(error);
}
ws.onclose = (event) => {
    console.log('WS:close');
}
ws.onmessage = (event) => {
    console.log('WS:message');
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'offer':
            // 着信側からOfferを受け取った場合
            console.log('Receiving SDP Offer ...');
            textToReceiveSdp.value = message.sdp;
            const offer = new RTCSessionDescription(message);
            setOffer(offer);
            break;
        case 'answer':
            // 受信側からAnswetを受け取った場合
            console.log('Receivinf SDP Answer ...');
            textToReceiveSdp.value = message.sdp;
            const answer = new RTCSessionDescription(message);
            setAnswer(answer);
        case 'candidate':
            // ICECandidateを受信した場合
            console.log('Receiving ICE candidate ...');
            const candidate = new RTCIceCandidate(message.ice);
            addIceCandidate(candidate);
        case 'close':
            // 相手がcloseした場合
            console.log('Peer connection is closed.');
            hangUp();
        default:
            console.log('Received unknown message.')
            break;
    }
}

function addIceCandidate(candidate) {
    if (peerConnection) {
        peerConnection.addIceCandidate(candidate);
    } else {
        console.error('Not connected yet.');
        return;
    }
}

function sendIceCandidate(candidate) {
    const message = JSON.stringify({
        type: 'candidate',
        ice: candidate
    });
    ws.send(message);
}

function startVideo() {
    function playVideo(videoElement, stream) {
        videoElement.srcObject = stream;
        videoElement.play();
    }
    navigator.mediaDevices.getUserMedia({
        video: {
            width: 640,
            height: 320
        },
        audio: false
    }).then(
        (stream) => {
            playVideo(localVideo, stream);
            localStream = stream;
        }
    ).catch(
        (error) => {
            console.error(error);
            return;
        }
    );
}

function shareDisplay() {
    function playVideo(videoElement, stream) {
        videoElement.srcObject = stream;
        videoElement.play();
    }
    navigator.mediaDevices.getDisplayMedia({
        video: {
            cursor: 'motion',
            displaySurface: 'window'
        }
    }
    ).then(
        (stream) => {
            playVideo(localVideo, stream);
            localStream = stream;
        }
    ).catch(
        (error) => {
            console.error(error);
            return;
        }
    );
}

function prepareNewConnection() {
    function playVideo(videoElement, stream) {
        videoElement.srcObject = stream;
        videoElement.play();
    }
    const peer = new RTCPeerConnection({
        // 'iceServers': []
        'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]
    })
    // 相手側のストリームを取得してブラウザに表示する
    if ('ontrack' in peer) {
        peer.ontrack = (event) => {
            playVideo(remoteVideo, event.streams[0]);
        }
    } else {
        peer.onaddstream = (event) => {
            playVideo(remoteVideo, event.stream);
        }
    }
    // ローカルでICECandidateが集まったら相手側に送信する
    peer.onicecandidate = (event) => {
        console.log('onicecandidate')
        if (event.candidate) {
            // sendIceCandidate(event.candidate);
        } else {
            console.log('ICE候補がありません');
            sendSdp(peer.localDescription);
        }
    }
    // Peerの接続状態が変わったら適宜、終了処理を行う。
    peer.oniceconnectionstatechange = () => {
        console.log('ICEの接続状態状態が変更されました' + peer.iceConnectionState);
        switch (peer.iceConnectionState) {
            case 'closed':
            case 'failed':
                if (peerConnection) {
                    hangUp();
                }
                break;
            case 'disconnected':
                console.error('ICE connection is disconnected.');
                break;
        }
    }
    // ローカルのストリームを相手側に提供
    if (localStream) { peer.addStream(localStream); }
    return peer;
}


// SDPを相手側に送信する
function sendSdp(sessionDescription) {
    console.log(sessionDescription);
    textForSendSdp.value = sessionDescription.sdp;
    ws.send(JSON.stringify(sessionDescription));
}

// こちらからOfferを作って送信する
function connect() {
    function makeOffer() {
        peerConnection = prepareNewConnection();
        peerConnection.onnegotiationneeded = () => {
            peerConnection.createOffer(
            ).then(
                // SDPをローカルにセット
                (sessionDescription) => {
                    return peerConnection.setLocalDescription(sessionDescription);
                }
            ).then(
                // SDPをリモートに送信
                () => {
                    // sendSdp(peerConnection.localDescription);
                }
            ).catch(
                (error) => {
                    console.log(error);
                }
            );
        }
    }
    if (!peerConnection) {
        console.log('makeOffer')
        makeOffer();
    }
}


function makeAnswer() {
    if (!peerConnection) {
        console.error('Not connected yet');
        return;
    }
    peerConnection.createAnswer(
    ).then(
        // SDPをローカルにセット
        (sessionDescription) => {
            return peerConnection.setLocalDescription(sessionDescription);
        }
    ).then(
        // SDPをリモートに送信
        () => {
            sendSdp(peerConnection.localDescription);
        }
    ).catch(
        (error) => {
            console.error(error);
        }
    );
}


// Offerを受信した場合にリモートのオファーをセットする
function setOffer(sessionDescription) {
    if (peerConnection) {
        console.error('既に接続されています');
    }
    console.log('Received Offer');
    peerConnection = prepareNewConnection();
    peerConnection.onnegotiationneeded = () => {
        peerConnection.setRemoteDescription(sessionDescription)
            .then(
                () => {
                    makeAnswer();
                }
            ).catch(
                (error) => {
                    console.error(error);
                }
            )
    }
}

function setAnswer(sessionDescription) {
    if (!peerConnection) {
        return;
    }
    console.log('Received Answer');
    peerConnection.setRemoteDescription(sessionDescription)
        .then(
            () => {
                console.log('Setting remote description.')
            }
        ).catch(
            (error) => {
                console.error(error);
            }
        );
}

function hangUp() {
    function cleanUpVideoElement(element) {
        element.pause();
        element.srcObject = null;
    }
    if (peerConnection && peerConnection.iceConnectionState !== 'closed') {
        peerConnection.close();
        peerConnection = null;
        ws.send(JSON.stringify({ type: 'close' }));
        cleanUpVideoElement(remoteVideo);
        textForSendSdp.value = '';
        textToReceiveSdp.value = '';
        return;
    }
}
