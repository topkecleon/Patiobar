/* jshint esversion:6, node: true, browser: true */
/* globals Vue, io */

'use strict';

function NormalizeStationName(name) {
    return name.replace(' Radio', '');
}

const app = Vue.createApp({
    data() {
        return {
            socket: null,
            patiobarRunning: false,
            pianobarRunning: false,
            pianobarPlaying: false,
            volume: 0,
            title: '',
            artist: '',
            album: '',
            src: '',
            alt: '',
            loved: false,
            stationName: '',
            stations: [],
            admin: false
        };
    },
    methods: {
        process(action) {
            if (this.socket) {
                this.socket.emit('process', { action });
            }
        },
        changeStation(stationId) {
            if (this.socket) {
                this.socket.emit('changeStation', { stationId });
            }
        },
        sendCommand(action) {
            if (action === '+') {
                this.loved = true;
            }
            if (this.socket) {
                this.socket.emit('action', { action });
            }
        },
        togglePausePlay() {
            this.sendCommand(this.pianobarPlaying ? 'S' : 'P');
            this.pianobarPlaying = !this.pianobarPlaying;
        },
        handleStart(msg) {
            this.artist = msg.artist || '';
            this.album = msg.album || '';
            this.stationName = NormalizeStationName(msg.stationName);
            this.src = msg.coverArt || '';
            this.alt = msg.album || '';
            this.title = msg.title || (msg.isrunning ? 'Please wait...' : 'pianobar is turned off.');
            this.loved = Number(msg.rating) === 1;
            this.pianobarPlaying = Boolean(msg.isplaying && msg.isrunning);
            this.pianobarRunning = Boolean(msg.isrunning);
        },
        handleStop() {
            this.pianobarPlaying = false;
            this.pianobarRunning = false;
            this.title = 'pianobar is turned off.';
            this.artist = '';
            this.src = '';
            this.stationName = '';
        },
        handleServerProcess(msg) {
            if (msg === 'outage') {
                this.stationName = '';
                this.pianobarRunning = false;
            }
        }
    },
    mounted() {
        this.socket = io.connect();

        this.socket.on('connect', () => {
            console.log('Connected to patiobar server');
            this.patiobarRunning = true;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from patiobar - dead or restarting?');
            this.patiobarRunning = false;
            this.pianobarRunning = false;
            this.pianobarPlaying = false;
            this.title = 'Disconnected from patiobar.';
            this.artist = 'Attempting to reconnect...';
        });

        this.socket.on('stations', (msg) => {
            const stations = [];
            if (Array.isArray(msg.stations)) {
                msg.stations.slice(0, -1).forEach((entry) => {
                    const [id, name] = entry.split(':');
                    if (typeof name === 'string') {
                        stations.push({ id, name: NormalizeStationName(name) });
                    }
                });
            }
            this.stations = stations;
        });

        this.socket.on('start', (msg) => {
            this.handleStart(msg);
        });

        this.socket.on('stop', () => {
            this.handleStop();
        });

        this.socket.on('volume', (msg) => {
            if (msg && typeof msg.volume !== 'undefined') {
                this.volume = msg.volume;
            }
        });

        this.socket.on('action', (msg) => {
            const action = msg && msg.action;
            if (action === 'P') {
                this.pianobarPlaying = true;
            } else if (action === 'S') {
                this.pianobarPlaying = false;
            }
        });

        this.socket.on('lovehate', (msg) => {
            this.loved = Number(msg.rating) === 1;
        });

        this.socket.on('server-process', (msg) => {
            this.handleServerProcess(msg);
        });
    },
    beforeUnmount() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }
});

app.mount('#app');
