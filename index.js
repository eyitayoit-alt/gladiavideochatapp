const express = require('express')
const app=express()
const server = require('http').createServer(app);
var path = require('path');
const { Server } = require("socket.io");
var ExpressPeerServer = require("peer").ExpressPeerServer; 
app.use(express.json());
app.use(express.urlencoded({ extended: false })); 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));  
app.use('/peerjs', ExpressPeerServer(server, {debug:true}));
const io= new Server(server);
let loggedUsers
// Handle a get repquest 
app.get('/',(req,res)=>{
    res.render('index',{error:""})
})
// Map Object to store connected users
const connectedUsers= new Map()

// Handle post request to video chat page
app.post('/videochat',(req,res)=>{

    const username=req.body.username
    loggedUsers=username
    return res.render('video',{peerId:username})
 
  
})
// Listen to a scoket connection
io.on("connection",(socketio)=>{
    if(connectedUsers.has(loggedUsers)){
     connectedUsers.set(loggedUsers,socketio.id)
    }
    // Listening receiver transcription event
    socketio.on('receiverTranscription',(transcription)=>{
        // Broadcast receiver transcription to listeninig socket       
        socketio.broadcast.emit("receiverTranscription",transcription)
    })
    // Listening caller transcription event
    socketio.on('callerTranscription',(transcription)=>{
        
        socketio.broadcast.emit("callerTranscription",transcription)
    })
    socketio.on('partialReceiverTranscription',(transcription)=>{
     
        socketio.broadcast.emit("partialReceiverTranscription",transcription)
    })
    socketio.on('partialCallerTranscription',(transcription)=>{
        socketio.broadcast.emit("partialCallerTranscription",transcription)
    })

})
 function error(err, req, res, next) {
    // log it
    console.error(err.stack);
  
    // respond with 500 "Internal Server Error".
    res.status(500);
    res.send( 'Internal Server Error');
  }
app.use(error)  

server.listen(3000,()=>{
    console.log('listening on Port 3000')
});
