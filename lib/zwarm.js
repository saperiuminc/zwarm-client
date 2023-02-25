const fs = require('fs');
const path = require('path');
const net = require('net');
const { VMScript } = require('vm2');
const shortid = require('shortid');
const ndjson = require('ndjson');

function startCommand(argv, cmdHandler, cb) {
    // external swarm/coordinator
    execCommand(argv.address, argv, cmdHandler, cb);
}

function execCommand(address, opts, cmdHandler, cb) {
    const [host, port] = address.split(':');
    const socket = new net.Socket();

    socket.on('connect', function() { //Don't send until we're connected
        // just add unique id to socket
        socket.id = shortid.generate();
        // create JTS message sending function
        socket.sendMessage = function(data, cb) {
            ndjStream.write(data, cb);
        };
        // NDJ stream duplex processing
        const ndjStream = ndjson.stringify()
            .on('data', function(line) {
                socket.write(line);
            });
        socket.pipe(ndjson.parse())
            .on('data', function(data) {
                socket.emit('message', data);
            })
            .on('error', function(err) {
                if (opts.verbose) console.error('NDJ (zwarm) error:', err);
            });

        // pass to command handler
        cmdHandler(socket, function(err, data) {
            // return properly
            cb && cb(err, data);
        });
    });
    socket.connect(port, host);
}

function stopCommand(argv, cb) {
    // TODO: cleanup
}

function exitHandler(opts, cbInterrupt, cbHandler) {
    const funcExit = function(err, data) {
        if (err) {
            console.error(err.message || err);
            process.exit(err.errno || -1);
        } else {
            // TODO: format data and proper handling of "pass" condition
            if (data) console.dir(data, { depth: null });
            process.exit((data && data.pass === false) ? -2 : 0);
        }
    };
    const funcInterrupt = function(err) {
        if (cbInterrupt) {
            cbInterrupt(undefined, () => {
                funcExit(err);
            });
        } else {
            funcExit(err);
        }
    };

    return function(err, data) {
        if (err) {
            funcInterrupt(err);
        } else {
            // handle Ctrl-C, just to stop processing properly
            process.on('SIGINT', function() {
                if (opts.verbose) console.info("Caught interrupt signal");
                funcInterrupt(new Error('Interrupted'));
            });
            // handle main callback (if any)
            if (cbHandler) {
                // call closing/cleanup callback
                cbHandler(data, (err, data) => {
                    funcExit(err, data);
                });
            } else {
                funcExit(undefined, data);
            }
        }
    };
}

module.exports = {
    run: function(argv) {
        if (argv.verbose) console.info(`running e2e/loadtest - ${argv.script}`);
        // start the server/coordinator (if any) and run command
        startCommand(argv, function(socket, cmdAck) {
            try {
                const script = fs.readFileSync(argv.script, 'utf8');
                const compiledScript = new VMScript(script).compile();
                const envars = {};
                const files = [];
                let scriptPath = undefined;

                // only send script path if running on local mode
                if (!argv.address) {
                    scriptPath = path.resolve(argv.script);
                } else {
                    // prepare to upload remote files
                    if (Array.isArray(argv.file)) {
                        argv.file.forEach(src => {
                            // parse <src>[:<dest>]
                            const pos = src.indexOf(':');
                            let dest = src;
                            if (pos != -1) {
                                dest = src.substring(pos + 1);
                                src = src.substring(0, pos);
                            }
                            if (fs.existsSync(src)) {
                                // q&d full read of uploaded data as a ascii file (assuming not too large)
                                const fbuf = fs.readFileSync(src);
                                files.push({
                                    fileName: dest,
                                    origName: src,
                                    contents: fbuf.toString('base64')
                                });
                            }
                        });
                    }    
                }
                if (Array.isArray(argv.env)) {
                    argv.env.forEach(name => {
                        // parse name=value pairs
                        const pos = name.indexOf('=');
                        let val = '';
                        if (pos != -1) {
                            val = name.substring(pos + 1);
                            name = name.substring(0, pos);
                        }
                        if (name)
                            envars[name] = val;
                    });
                }

                socket.sendMessage({
                    id: ((new Date()).toISOString().slice(0,10).replace(/-/g,"") + '-' + shortid.generate()),
                    type: 'command',
                    name: 'run',
                    payload: {
                        script: compiledScript.code,
                        scriptName: path.basename(argv.script),
                        scriptPath: scriptPath,
                        vus: argv.vus,
                        duration: argv.duration,
                        iteration: argv.iteration,
                        envars: envars,
                        files: files
                    }
                }, function(err) {
                    if (err) {
                        cmdAck(err);
                    } else {
                        // pass socket object on next argument
                        cmdAck(undefined, socket);
                    }
                });
            } catch (ex) {
                cmdAck(ex);
            }
        }, exitHandler(argv, (data, done) => {
            // stop any server/swarm during interruption
            stopCommand(argv, done);
        }, (socket, cmdAck) => {
            let pending = true;
            // switch to listen mode afterwards
            socket.on('message', function(msg) {
                if (msg.type == 'ack') {
                    if (pending) {
                        pending = false;
                        socket.end();
                        // DONE w/run command
                        cmdAck(msg.error, msg.payload);
                    }
                } else if (msg.type === 'event') {
                    if (argv.verbose) {
                        console.info('msg:', msg);
                    } else {
                        // show logs
                        if (msg.name === 'log')
                            console.log(msg.payload.text);
                    }
                } else {
                    console.log('msg:', msg)
                    // should not go here
                    if (argv.verbose) console.error('Unhandled msg:', msg);
                }
            });
            socket.on('close', function(hadError) {
                if (pending) {
                    pending = false;
                    cmdAck(new Error('Socket closed w/o acknowledgement.'))
                }
            });
        }));
    },
    info: function(argv) {
        if (argv.verbose) console.info(`checking server info`);
        // start the server/coordinator (if any) and run command
        startCommand(argv, function(socket, cmdAck) {
            const infoId = ((new Date()).toISOString().slice(0,10).replace(/-/g,"") + '-' + shortid.generate());
            let pending = true;
            socket.sendMessage({
                id: infoId,
                type: 'command',
                name: 'info'
            }, function(err) {
                if (err) {
                    cmdAck(err);
                } else {
                    // check response/ack msg
                    socket.on('message', function(msg) {
                        if (pending) {
                            pending = false;
                            socket.end();
                            if (msg.type === 'ack' && msg.id === infoId) {
                                // TODO: display better server/swarm info
                                cmdAck(undefined, msg.payload);
                            } else {
                                if (argv.verbose) console.error('Unknown msg/ack:', msg);
                                cmdAck(new Error('Unknown msg acknowledgement.'))
                            }    
                        }
                    });
                    socket.on('close', function(hadError) {
                        if (pending) {
                            pending = false;
                            cmdAck(new Error('Socket closed w/o acknowledgement.'))
                        }
                    });
                }
            });
        }, exitHandler(argv, (data, done) => {
            // stop any server/swarm during interruption
            stopCommand(argv, done);
        }));
    }
};