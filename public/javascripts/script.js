let Peer = window.Peer;
const socketio=io();
const SAMPLE_RATE=48000;
const localVideo= document.querySelector('#localVideo');
const remoteVideo=document.querySelector('#remoteVideo');
const id= document.querySelector('#myid').value;
const finalContent=document.querySelector('#finals');
const partialContent=document.querySelector('#partials');
const remoteFinalContent=document.querySelector('#remoteFinals');
const remotePartialContent=document.querySelector('#remotePartials');
const callMenu = document.querySelector('.call-menu');
const answerMenu = document.querySelector('.answer-menu');
const videoContainer = document.querySelector('.video-container');
const inputbox = document.querySelector('.inputbox');
const userError = document.querySelector('.user-error');

let socket;
let callerAudioStream;
let receiverAudioStream;
const socketPromise = deferredPromise();



  // Initializes the websocket
socket = new WebSocket(
    'wss://api.gladia.io/audio/text/audio-transcription'
  );
socket.onopen = () => {
    // Check https://docs.gladia.io/reference/live-audio for more information about the parameters
    const configuration = {
      x_gladia_key: 'c164b8bf-520c-4e27-9821-77f1f1a58e03',
      frames_format: 'bytes',
      language:'english',
      sample_rate: SAMPLE_RATE
    };
    // Send configuration
socket.send(JSON.stringify(configuration));
  };
socket.onerror = () => {
    socketPromise.reject(new Error(`Couldn't connect to the server`));
  };
socket.onclose = (event) => {
    socketPromise.reject(
      new Error(
        `Server refuses the connection: [${event.code}] ${event.reason}`
      )
    );
  };
socket.onmessage = (event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch (err) {
      socketPromise.reject(
        new Error(`Cannot parse the message: ${event.data}`)
      );
    }

    if (data?.event === 'connected') {
      socketPromise.resolve(true);
    } else {
      socketPromise.reject(
        new Error(`Server sent an unexpected message: ${event.data}`)
      );
    }
  };
// Initializes Peer Connection 
var peer = new Peer(id,{
  host:'localhost',
  path:'/peerjs',
  port:3000
  
});
peer.on('open', (id) => {
  console.log('My peer ID is: ' + id);
});
peer.on('error', (error) => {
  console.log(error);
});

//
function deferredPromise() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  return deferred;
}
 // Function makeCall()
async function  makeCall() {
  
  const remoteId = document.querySelector('#remoteId').value
  if(id === remoteId) {
   userError.textContent="You cannot Make call to yourself"
   
  }
  else{
   
    navigator.mediaDevices.getUserMedia({video: true, audio:true})
   .then((stream) => {

   localVideo.srcObject = stream;
  
  let call = peer.call(remoteId, stream);
  call.on('stream', (remoteStream) => {
       remoteVideo.srcObject = remoteStream;
       
  });
  callerAudioStream = new MediaStream(stream.getAudioTracks());
  try {
  
    // Initializes the recorder
    recorder = new RecordRTC(callerAudioStream, {
      type: 'audio',
      mimeType: 'audio/wav',
      recorderType: RecordRTC.StereoAudioRecorder,
      timeSlice: 1000,
      ondataavailable(blob) {
        socket.send(blob);
      },
      sampleRate: SAMPLE_RATE,
      desiredSampRate: SAMPLE_RATE,
      numberOfAudioChannels: 1
    });
  
   async()=>await socketPromise.promise;
  } catch (err) {
    window.alert(
      `Error during the initialization: ${err?.message || err}`
    );
    console.error(err);
    stop();
    return;
  }
  
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log(data);
      if (data?.event === 'transcript' && data.transcription) {
        if (data.type === 'final') {
          socketio.emit("callerTranscription",data.transcription)
          finalContent.textContent = " "
          finalContent.textContent = data.transcription
        } else {
          socketio.emit("partialCallerTranscription",data.transcription)
           partialContent.textContent = " "
          partialContent.textContent = data.transcription
        }
      }
    };
    socket.onerror=(error)=> {
      console.log(error)
      socket.reconnect();
    }

    recorder.startRecording();
      
})
.catch((err) => {
  console.log('Failed to get local stream', err);
});
}

}

peer.on('call', (call) => {
  navigator.mediaDevices.getUserMedia({video: true,audio:true})
  .then((stream) => {
    localVideo.srcObject = stream;
    
    call.answer(stream); // Answer the call with an A/V stream.
    call.on('stream', (remoteStream)=>{
      remoteVideo.srcObject = remoteStream;
      
    });
  
    receiverAudioStream = new MediaStream(stream.getAudioTracks())
    try{

      // Initializes the recorder
      recorder = new RecordRTC(receiverAudioStream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000,
        ondataavailable(blob) {
          socket.send(blob);
        },
        sampleRate: SAMPLE_RATE,
        desiredSampRate: SAMPLE_RATE,
        numberOfAudioChannels: 1
      });
    
     async()=>await socketPromise.promise;
    } catch (err) {
      window.alert(
        `Error during the initialization: ${err?.message || err}`
      );
      console.error(err);
      stop();
      return;
    }
    
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        if (data?.event === 'transcript' && data.transcription) {
          if (data.type === 'final') {
            socketio.emit("receiverTranscription",data.transcription)
            finalContent.textContent=" "
            finalContent.textContent=data.transcription
          } else {
            socketio.emit("partialReceiverTranscription",data.transcription)
            partialContent.textContent=data.transcription
            partialContent.textContent=data.transcription
          }
        }
      };
      socket.onerror=(error)=>{
        console.log(error)
        socket.reconnect();
      }
  
      recorder.startRecording();
      
  
  
    
   })
  
  .catch((err) => {
    console.error('Failed to get local stream', err);
  });

   
})
function answerCall(){

}
socketio.on("receiverTranscription",(transcription)=>{
  remoteFinalContent.textContent = " "
  
  remoteFinalContent.textContent = transcription 
})

socketio.on("callerTranscription",(transcription)=>{
  remoteFinalContent.textContent = " "
  remoteFinalContent.textContent = transcription 
  })
  socketio.on("partialReceiverTranscription",(transcription)=>{
    remotePartialContent.textContent = " "
    remotePartialContent.textContent = transcription 
  })
  
  socketio.on("partialCallerTranscription",(transcription)=>{
    remotePartialContent.textContent = " "
    remotePartialContent.textContent = transcription 
  })
  
   

function stopCall(){
  const localSrc=localVideo.srcObject
    const localtracks=localSrc.getTracks()
    localtracks.forEach((track) => {
        track.stop();
      });
  const remoteSrc=remoteVideo.srcObject
  const remoteTracks=remoteSrc.getTracks()
  remoteTracks.forEach((track) => {
    track.stop();
  });
  
  
  
  
    localSrc.getTracks().forEach((track) => track.stop());
    if (socket) {
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.onmessage = null;
      socket.close();
    }
  localVideo.srcObject=null;
  remoteVideo.srcObject=null;
  recorder.destroy();
    window.location.reload()
  };
 
  