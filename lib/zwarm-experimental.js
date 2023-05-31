const axios = require('axios');
const fs = require('fs');
const ndjson = require('ndjson');

const ExtendedError = require('./helpers/extended-error');

function getBaseUrl(argv) {
    const scheme = (argv.secured ? 'https' : 'http');
    const [host, port] = argv.address.split(':');
    const baseUrl = `${scheme}://${host}:${port}`;
    return baseUrl;
}

function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}

// setup target functions for global zwarm object
global.zwarm = {
    saveFile: function ({ file, encoding, data }) {
        try {
            fs.writeFileSync(file, data, { encoding: encoding });
        } catch (ex) {
            console.error(ex.message);
        }
    }
}

module.exports = {
    info: function (argv) {
        const infoUrl = `${getBaseUrl(argv)}/info`;

        axios.get(infoUrl).then((res) => {
            console.log(res.data);
        }).catch((ex) => {
            console.error(ex);
        });
    },
    run: function (argv) {
        const script = fs.readFileSync(argv.script, 'utf8');
        const envars = {};
        const files = [];

        // init/prep environment variables and supplementary files
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

        const runUrl = `${getBaseUrl(argv)}/run`;
        axios.post(runUrl, {
            script: script,
            secret: argv.secret,
            showCost: argv.showCost,
            vus: argv.vus,
            duration: argv.duration,
            iteration: argv.iteration,
            envars: envars,
            files: files
        }, {
            responseType: 'stream'
        }).then((res) => {
            // connect response stream to NDJSON
            const stream = res.data.pipe(ndjson.parse());

            stream.on('data', (obj) => {
                // grab funcName context
                const funcName = Object.keys(obj)[0];
                const raFuncName = funcName.split('.');
                const globalObject = global[raFuncName[0]];
                const funcTarget = (globalObject ? (raFuncName.length > 1 ? globalObject[raFuncName[1]] : undefined) : undefined);

                // console.log('FUNC:', funcName, funcTarget);
                if (funcTarget) {
                    let funcParams = obj[funcName];

                    // q&d: error object has to be deserialize to cross NDJSON streaming
                    if (typeof (funcParams) === 'object' && funcParams.errorType === ExtendedError.name)
                        funcParams = Object.assign(new ExtendedError(), JSON.parse(funcParams.errorMessage));

                    // should contain key/value pair containing command and params to run
                    if (Array.isArray(funcParams))
                        funcTarget.apply(this, funcParams);
                    else
                        funcTarget.call(this, funcParams);
                } else {
                    console.error('Unhandled object/function:', obj);
                }
            });
            stream.on('error', (err) => {
                console.error(err.message);
            });
            stream.on('end', () => {
                // NOTE: handle cleanups here
                // console.log('END.');
            });
        }).catch((ex) => {
            if (ex.response && ex.response.data) {
                // extract Error object from stream
                streamToString(ex.response.data).then((str) => {
                    const err = Object.assign(new Error(), JSON.parse(str));
                    console.error(err.message);
                }).catch(() => {
                    // display the original error message
                    console.error(ex.message);
                });
            } else {
                console.error(ex.message);
            }
        });
    }
}