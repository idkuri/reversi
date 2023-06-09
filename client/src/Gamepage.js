import React, { useCallback, useEffect, useState} from 'react';
import anime from "animejs/lib/anime.es.js";
import "./styles/gamepage.css";
import Gameboard from './components/Gameboard';

const Gamepage = (props) => {
    const [columns, setColumns] = useState(0);
    const [rows, setRows] = useState(0);
    const [toggled, setToggled] = useState(false);
    const createTile = useCallback(index => {
        return <div className="tile" key={index} id="gamepage"></div>;
    }, []);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [role, setRole] = useState(null);

    
    const createGrid = useCallback(quantity => {
        return Array.from(Array(quantity)).map((_, index) => createTile(index));
    }, [createTile]);

    const resizeHandler = useCallback(() => {
        if (!toggled) {
            const newColumns = Math.floor(document.body.clientWidth / 125);
            const newRows = Math.floor(document.body.clientHeight / 125);
            setColumns(newColumns);
            setRows(newRows);
        }
    }, [toggled]);

    useEffect(() => {
        resizeHandler();
        window.addEventListener('resize', resizeHandler);
        return () => {
            window.removeEventListener('resize', resizeHandler);
        };
        
    }, [resizeHandler]);    

    useEffect(() => {   
        anime({
            targets: ".tile",
            opacity: toggled? 0 : 1,
            delay: anime.stagger(100, {
              grid: [columns, rows],
              from: (columns * rows - 1) / 2,
            }),
        });
        const tiles = document.querySelectorAll(".grid");
        tiles.forEach(tile => {
          tile.style.pointerEvents = "none";
        });
        setTimeout(() => {
            setToggled(true);
        }, 1000)

    })

    return (
        <div id="gamepage" className="wrapper">
            <div className="container">
            <div className='gameInfo'>
                <div className="currentPlayer">{currentPlayer}</div>
                <div className="gameID">{`Game ID: ${window.location.href.split('/')[window.location.href.split('/').length - 1]}`}</div>
            </div>
                <Gameboard socket={props.socket} toggled={toggled} setCurrentPlayer={setCurrentPlayer} setRole={setRole}/>
                <div className={`role ${role}`}>{`You are ${role}`}</div>
            </div>
            <div className="grid" style={{'--columns': columns, '--rows': rows}}>
                {createGrid(columns * rows)}
            </div>
        </div>
    );
};

export default Gamepage;