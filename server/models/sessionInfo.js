const mongoose = require('mongoose');

const array = Array.from({ length: 8 }, () => Array(8).fill(0));
array[3][3] = 1
array[3][4] = 2
array[4][3] = 2
array[4][4] = 1
array[2][3] = -1
array[3][2] = -1
array[5][4] = -1
array[4][5] = -1 

// Structure for the sessionInfo
const sessioninfoSchema = mongoose.Schema({
    gameId : {
        type: String,
        required: true
    },
    state : {
        type: Array,
        default: array
    },
    turn: {
        type: Number,
        default: 2
    },
    player1: {
        type: {
            playerID: {
                type: String,
                default: null
            },
            name: {
                type: String,
                default: "White"
            }
        },
        default: { playerID: null, name: "White" }
    },
    player2: {
        type: {
            playerID: {
                type: String,
                default: null
            },
            name: {
                type: String,
                default: "Black"
            }
        },
        default: { playerID: null, name: "Black" }
    },

})


module.exports = mongoose.model("sessions", sessioninfoSchema)