import { io } from "socket.io-client";


var balls = [];
var color = "hsl(" + Math.random() * 360 + ",90%,50%)";
const socket = io("http://localhost:3000");
const message = document.getElementById("message");
const button = document.getElementById("submit");
const mailBox = document.getElementById("mail");
const room = document.getElementById("room");
const joinRoom = document.getElementById("joinRoom");
const result = document.getElementById("results"); 

socket.on("connect", () => {
  mailBox.innerHTML = `connected to server -${socket.id} `;
  result.innerHTML += numBalls;
});
socket.on("messageFromServer", (msg) => {
  mailBox.innerHTML += "<br>" + msg + " ";
  mailBox.scrollTop = mail.scrollHeight;
});
socket.on("addedNewBall", (msg) => {  
  for(var ball of msg){
    balls.push(new Ball(ball.x,ball.y, ball.dx, ball.dy, ball.r, ball.color));
    // balls.push(ball); 
  }
});
socket.on("removeBallFromServer", (msg) => {
  for(var i = 0; i < msg.length; i++) { 
    removeBall(msg[i]);
  }
})
button.onclick = () => {
  socket.volatile.emit("messageFromClient", message.value, room.value);
};
joinRoom.onclick = () => { 
  socket.emit("join-room", room.value, (message) => {
    mailBox.innerHTML += "<br>" + message;
  });
};

function rollDice() {
  const dice = [...document.querySelectorAll(".die-list")];
  dice.forEach((die) => {
    toggleClasses(die);
    var rNum = getRandomNumber(1, 6);
    die.dataset.roll = rNum; 
    numBalls += rNum;
    newBalls = rNum;
    addNewBalls();
    result.innerHTML = "Points : " + numBalls ;
  });
}

function toggleClasses(die) {
  die.classList.toggle("odd-roll");
  die.classList.toggle("even-roll");
}

function getRandomNumber(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.getElementById("roll-button").addEventListener("click", rollDice);

var canvas = document.querySelector("canvas");
var pen = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;

var numBalls = 0;
var newBalls = 0;
var grav = [0, 0];
var evilBall = null;

function Ball(x, y, dx, dy, r, color) {
  this.x = x;
  this.y = y;
  this.dx = dx;
  this.dy = dy;
  this.r = r;
  this.color = color;

  this.draw = function () {
    pen.fillStyle = this.color;
    pen.beginPath();
    pen.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
    pen.fill();
  };

  this.update = function () {
    this.x += this.dx;
    this.y += this.dy;
    this.dx += grav[0];
    this.dy -= grav[1];
    if (this.x > W - this.r) {
      this.x = W - this.r;
      this.dx *= -1;
    } else if (this.x < this.r) {
      this.x = this.r;
      this.dx *= -1;
    }
    if (this.y > H - this.r) {
      this.y = H - this.r;
      this.dy *= -0.7;
    } else if (this.y < this.r) {
      this.y = this.r + 1;
      this.dy *= -0.7;
    }
    this.draw();
  };
} 
function addNewBalls() { 
  var newBallsObject = [];
  for (var i = 0; i < newBalls; i++) {
    var x = 0; //Math.random()*W;
    var y = 0; //Math.random()*H;
    var r = 3; //Math.random()*3 + 2;
    newBallsObject.push(
      new Ball(x, y, Math.random() * 10 - 5, Math.random() * 10 - 5, r, color)
    ); 
  }
  socket.emit("addNewBall", newBallsObject, room.value);
}
// reset();

evilCircle();

function animate() {
  pen.clearRect(0, 0, W, H);
  evilBall.update();  
  for (var ball of balls) {
    var collision = checkCollision(ball, evilBall);
    if (collision[0]) {
      removeBall(ball); 
    } 
    ball.update();
    for (var ball2 of balls) {
      //Not the most efficient way to check every pair, but this is just a rough version
      if (ball !== ball2) {
        var collision = checkCollision(ball, ball2);
        if (collision[0]) {
          if(ball.color!==ball2.color){
            socket.emit("removeBall", [ball, ball2], room.value);
          }else{
          adjustPositions(ball, ball2, collision[1]);
          resolveCollision(ball, ball2);
          }
        }
      }
    }
  }
  requestAnimationFrame(animate);
}

animate();

function removeBall(ball){
  balls = balls.filter((e) => e.dx != ball.dx && e.dy != ball.dy);
}

function checkCollision(ballA, ballB) {
  var rSum = ballA.r + ballB.r;
  var dx = ballB.x - ballA.x;
  var dy = ballB.y - ballA.y;
  return [rSum * rSum > dx * dx + dy * dy, rSum - Math.sqrt(dx * dx + dy * dy)];
}

function resolveCollision(ballA, ballB) {
  var relVel = [ballB.dx - ballA.dx, ballB.dy - ballA.dy];
  var norm = [ballB.x - ballA.x, ballB.y - ballA.y];
  var mag = Math.sqrt(norm[0] * norm[0] + norm[1] * norm[1]);
  norm = [norm[0] / mag, norm[1] / mag];

  var velAlongNorm = relVel[0] * norm[0] + relVel[1] * norm[1];
  if (velAlongNorm > 0) return;

  var bounce = 0.7;
  var j = -(1 + bounce) * velAlongNorm;
  j /= 1 / ballA.r + 1 / ballB.r;

  var impulse = [j * norm[0], j * norm[1]];
  ballA.dx -= (1 / ballA.r) * impulse[0];
  ballA.dy -= (1 / ballA.r) * impulse[1];
  ballB.dx += (1 / ballB.r) * impulse[0];
  ballB.dy += (1 / ballB.r) * impulse[1];
}

function adjustPositions(ballA, ballB, depth) {
  //Inefficient implementation for now
  const percent = 0.2;
  const slop = 0.01;
  var correction =
    (Math.max(depth - slop, 0) / (1 / ballA.r + 1 / ballB.r)) * percent;

  var norm = [ballB.x - ballA.x, ballB.y - ballA.y];
  var mag = Math.sqrt(norm[0] * norm[0] + norm[1] * norm[1]);
  norm = [norm[0] / mag, norm[1] / mag];
  correction = [correction * norm[0], correction * norm[1]];
  ballA.x -= (1 / ballA.r) * correction[0];
  ballA.y -= (1 / ballA.r) * correction[1];
  ballB.x += (1 / ballB.r) * correction[0];
  ballB.y += (1 / ballB.r) * correction[1];
}

function evilCircle() {
  for (var i = 0; i < 1; i++) {
    var x = 10; //Math.random()*W;
    var y = 10; //Math.random()*H;
    var r = 50; //Math.random()*3 + 2;
    // new Ball(0, 0, 10, 10, r).update();
    evilBall = new Ball(W / 2, H / 2, 0, 0, r);
    evilBall.color = "black";
    evilBall.update();
  }
}
