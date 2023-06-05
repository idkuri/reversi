// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const sessions = require('./routes/sessions');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const sessionInfo = require("./models/sessionInfo");
const { checkValidity, calculate } = require('./utils/moveCalculations.js');

const http = require('http');
const https = require('https');

require('dotenv').config();

const app = express();
const uri = process.env.URI;


const corsOptions = {
  origin: ['http://localhost:80', 'https://localhost:443', 'http://localhost:3000', 'http://localhost:3001', 'https://reversiproject.netlify.app']
};

//Enable CORS
app.use(cors(corsOptions));

// Routing
app.use( express.json() )
app.use("/sessions", sessions)

// Certificate
const privateKey = fs.readFileSync(process.env.CERTPRIV, 'utf8');
const certificate = fs.readFileSync(process.env.CERT, 'utf8');
const ca = fs.readFileSync(process.env.CA, 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate,
	ca: ca
};

// Connecting to the database
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Successfully connected to MongoDB")
})
.catch(() => {
  console.error("MongoDB Connection failed ", error);
  process.exit(1);
})

const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

const { instrument } = require('@socket.io/admin-ui');
const { env, hrtime } = require('process');
const io = require("socket.io")(httpsServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "https://admin.socket.io", "https://reversiproject.netlify.app"],
    credentials: true
  }
});

instrument(io, {
  auth: false
});

// HTTP request listener
httpServer.listen(80, () => {
  console.log(`Listening to this port: 80`)
}) 

httpsServer.listen(443, () => {
	console.log('HTTPS Server running on port 443');
});

async function joinRoom(room, player) {
  let me = null
  let sessionState = await sessionInfo.find({ gameId: room});
  if (sessionState.length == 0) {
      res.status(404).json({error: "Game not found"})
      return
  }
  else {
      const game = sessionState[0];
      if (game.player2.playerID === null) {
        game.player2.playerID = player
        me = 2
        await game.save();
      }
      else if (game.player1.playerID === null) {
        me = 1
        game.player1.playerID = player
        await game.save();
      }
      else {
        me = 3
      }

  }
  return me
}

io.on('connection', socket => {

  socket.on('joinRoom', async (room) => {
    let me = await joinRoom(room, socket.id)
    console.log(`user: ${socket.id} joining room: ${room} you are: ${me}`)
    socket.join(room)

    socket.on('move', async (room, player, row, column) => {
      if(!(me === player)) return;
      const status = await move(room, player, row, column);
      if (status == 200)
        io.to(room).emit("updateSession", player, row, column)
    })
  })

  socket.on('disconnect', (reason) => {
    console.log(`user: ${socket.id} disconnected for ${reason}`);
  });
})



app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function move(room, current, row, column) {
    try {
      // Get move from body
      console.log(`Room: ${room} player: ${current} attempting move: (${row}, ${column})`)
      const move = [row, column];
      const player = current;
      let state = null;
      let turn = null
      // Fetch database for state for current game
      let sessionState = await sessionInfo.find({ gameId: room});
      if (sessionState.length == 0) {
          console.log("Room was not found")
          return 400
      }
      else {
          state = sessionState[0].state
          turn = sessionState[0].turn
      }

      /* Checking conditions:
          1) Move is specified
          2) Player is 1 or 2
          3) Player is an integer
          4) Move is an array
          5) Move is of length 2
          6) 0 <= Move[0] <= 7 and 0 <= Move[1] <= 7
          7) Correct player's turn to move
      */

      // If body didn't specify move so we return an error [1]
      if (!move) {
          console.log(move)
          throw new Error("Missing 'move' parameter in the request body")
      }
      // Player is and a number and Player is 1 or 2 [2-3]
      if (!Number.isInteger(player) || (player !== 1 && player !== 2)) {
          throw new Error("Player is not an integer or not 1 or 2");
      }
      // Move is an array && Move is of length 2 && Move is between 0 and 7 [4-6]
      if (!(move instanceof Array) || move.length !== 2 || !(0 <= move[0] && move[0] <= 7) || !(0 <= move[1] && move[1] <= 7)) {
          throw new Error("Syntax of move or move index is incorrect");
      }
      // Incorrect player's turn [7]
      if (player != turn || typeof player === "undefined") {
          throw new Error("It is not this player's turn or player not specified")
      }

      if (!checkValidity(state, player, move, [0])) {
          throw new Error("Invalid move")
      }

      // Calculate new state
      state = calculate(state, player, move);

      // Update state on database
      updateStatus = await sessionInfo.updateOne(
          {gameId: room},
          {$set: {
              state: state,
              turn: player == 1 ? 2 : 1
          }}
      )
      return 200
    } 
    catch (error) {
        console.log("Error " + error)
        return 400
    }
}

