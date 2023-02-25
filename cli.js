#!/usr/bin/env node
const zwarm = require('./lib/zwarm');

const argv = require('yargs')   // eslint-disable-line
    .usage('Usage: $0 <command> [options]')
    .command('run <script> <address>', 'run e2e/loadtest script', (yargs) => {
        yargs
            .positional('script', {
                describe: 'e2e/loadtest script'
            })
            .positional('address', {
                describe: 'zombie swarm URL/address'
            })
            .option('vus', {
                type: 'number',
                description: 'no. of virtual zombies to rise',
                default: 1
            })
            .option('duration', {
                type: 'number',
                description: 'how long the zombies will attack (in seconds)',
                default: 30
            })
            .option('iteration', {
                type: 'number',
                description: 'how many zombies will attack'
            })
            .option('env', {
                alias: 'e',
                type: 'array',
                description: 'environment name=value variables to pass on zwarm'
            })
            .option('file', {
                alias: 'f',
                type: 'array',
                description: 'upload and/or map files to swarm server <src>[:<dest>]'
            })
    }, (argv) => {
        zwarm.run(argv);
    })
    .command('info <address>', 'returns server info', (yargs) => {
        yargs
            .positional('address', {
                describe: 'zombie swarm URL/address'
            })
    }, (argv) => {
        zwarm.info(argv);
    })
    .option('verbose', {
        alias: 'v',
        type: 'boolean',
        description: 'Run with verbose logging'
    })
    .demandCommand()
    .epilog('Zombie Swarm e2e/loadtest Client- copyright 2023')
    .strict()
    .argv;
// NOTE: program execution continue within the command executed