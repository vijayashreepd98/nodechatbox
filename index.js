let express = require('express');
const eSession = require('express-session');
const MongoStore = require('connect-mongo')(eSession);
const mongoose = require('mongoose');
const sharedsession = require('express-socket.io-session');
let http = require('http');
let path = require('path');
let socketio = require('socket.io');
let bodyparser = require('body-parser');

const privateMessageModel = require('./db/models/message.js');
require('./db/mongoose.js');

let port = process.env.PORT || 3000;

let app = express();
let server = http.createServer(app);
let publicDirectory = path.join(__dirname,'/public');
let io = socketio(server);
let groupio = io.of('/group');


let newuser = [];
let allmessage = [];
var clients = {};
io.on('connection', (socket) => {
    console.log('new websocket connection!!...');
    
    // when new user joins new connection will established
    socket.on('join',(user) => {
        clients[user.username] = {
            "socket": socket.id
        };
        socket.username = user.username;
        socket.join(user.room);
        socket.join(user.username);
        
        socket.username = user.username;
        //for checking  whether new connection with the same username is already existed or not
        for(let i=0;i<newuser.length;i++)
        {
           if(newuser[i] == socket.username){
               let message = "Tab is already open with same username!!Please try to close it and reconnect it....";
               socket.emit('notification',message);
               
           }
        }
       
        //pushing new username into array
        newuser.push(socket.username);
        let newdetails = {
            newuser :newuser,
            allmessage:allmessage
        }
        io.emit('newuser',newdetails);
        let newinfo ={
            message:'welcome!!!'+user.username,
            newuser:newuser
        }
        socket.emit('message',newinfo );
        let message = user.username+" has joined";
       
        socket.broadcast.to(user.room).emit('newusermessage',message);
        

    });


    //for sending messsages to perticular client
    socket.on('send_message',(message) =>{
               
        username=message.recipient;
        const privateMessage = new privateMessageModel({
            sender:message.username,
            receiver:username,
            message:message.message_value
            
          });
          privateMessage.save().then(()=>{
              console.log("Stored data in database successfully!!!...");
          }).catch(()=>{
              console.log("Failed to store!!!!...");
          });
        console.log(allmessage);
        allmessage.push(message);
        let all = privateMessageModel.find({});
        console.log("this is:"+all);
        let credential = {
            message:message,
            newuser:newuser,
            allmessage:allmessage
        
        }
    //conforming message delivery to perticular client
        socket.emit("conformation","delivred!!!...");
    //  recipient recieving message sent by sender
        socket.in(username).emit('messages',(credential));
    //updating chat history in sender side
    
        socket.emit('frommessage',(credential));

    });
    socket.on('privatemessage',(currentuser) => {
        socket.emit('messageupdate',currentuser);
    });


    socket.on('emit',(messages) => {
        socket.emit('message','welcome!!!'+messages.message.username);
    });

    socket.on('homepage',(currentmessage)=>{
        let newdetails = {
            newuser :newuser,
            allmessage:allmessage
        }
        io.emit('newuser',newdetails);

    });
    //diconnecting connection
    socket.on('disconnect',()=>{
        console.log(socket.id+" \t socket got disconnected");
        for (var name in clients) {
            if (clients[name].socket === socket.id) {
                delete clients[name];
                break;
            }
        }
        //removing disconnected username from global array
        for(let i=0;i<newuser.length;i++)
        {
           if(newuser[i] == socket.username){
              
               newuser.splice(i,1);
               
           }
        }
        //sending  user left notifiaction to all available user
        socket.broadcast.emit('userleft',socket.username+" has left");
        // updating displaying userlist
        io.emit('newuser',newuser);
    });//
    socket.on("newgroup",(newgroup)=>{
        for(let i=0;i<newgroup.members.length;i++){
            socket.broadcast.to(newgroup.members[i]).emit('groupuser',newgroup);
        }
        socket.emit('groupuser',newgroup);
    });
    
});
let allmessages=[];
groupio.on('connection',(socket)=>{
    console.log("connected to 2nd page");
    
    socket.on('join',(group)=>{
        socket.join(group.username);
        socket.join(group.groupname);
        socket.emit('permission',group);

    });
    
    

    socket.on("group_send_message",(message_body)=> {
        allmessages.push(message_body);
        socket.broadcast.emit('sendall',allmessages);
        socket.emit('sendone',allmessages);
    });


});






app.use(express.static(publicDirectory));
app.use(express.urlencoded());
app.use(express.json()); 

app.get('/',(req,res) => {
    res.sendfile('./public/userjoin.html');
});


server.listen(port, ( ) => {
    console.log('Server is up to port : '+port);
})

console.log("jjjj")

