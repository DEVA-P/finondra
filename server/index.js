const io = require('socket.io')(3000, {
    cors : {
        origin : ['http://localhost:8080'],
    }
});

io.on('connection', socket => {
    console.log(socket.id);
    
    socket.on('messageFromClient', (msg, room) => {
        if(room != '') 
            // io.emit('messageFromServer', msg);
        // else
            io.in(room).emit('messageFromServer', msg);
        // socket.broadcast.emit('messageFromServer', msg)
    })

    socket.on('join-room', (room, cb) => { 
        socket.join(room)
        cb(`Joined ${room}`)
    })
    socket.on('addNewBall', (ballObj, room) => {
        console.log(room)
        io.in(room).emit('addedNewBall', ballObj);
    })
    socket.on("removeBall", (balls, room) => {
        // console.log(balls)
        io.in(room).emit('removeBallFromServer', balls);
    })
}) 

