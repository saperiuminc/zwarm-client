# zwarm-client
Zombie Swarm e2e/load testing Client for [`zwarm`](https://www.npmjs.com/package/@saperiuminc/zwarm), inspired by [`k6`](https://k6.io/) and modelled after [`Mocha`](https://mochajs.org/). This load testing tool makes end-to-end performance testing easy and productive for development teams which uses [`Puppeteer`](https://pptr.dev/) to simulate "virtual users" via headless browser manipulation.

## Installation
``` bash
$ npm install -g @saperiuminc/zwarm-client
```

## Running zwarm-client
``` js
// example-vin-decoder.js
it('Test 1', async() => {
    const page = await $browser.newPage();
    await page.goto('http://randomvin.com/getvin.php?type=real');
    const vin = await page.evaluate(() => document.body.innerText);
    await $log(`${$iteration}(${$VU}): ${vin}`);
    return await $sleep(1000);
});
```

Running the above sample will produce a json-formatted output similar below:
``` bash
# Run a test
$ zwarm-client run example-vin-decoder.js some-zwarm-server.com:3030
1(1): 1FAHP3F27CL221337
{
  pass: true,
  swarms: 1,
  walkers: 1,
  steps: 1,
  durationIn: { millis: 1527, seconds: 1.53, minutes: 0.03 },
  iterations: { min: 1, max: 1, avg: 1 },
  stats: {
    default: {
      tests: {
        'Test 1': {
          runs: 1,
          stats: { avg: 1406, _avgInc: 1, min: 1406, max: 1406 }
        }
      },
      errors: []
    }
  },
  timings: {
    'Test 1': {
      count: 1,
      min: 1406,
      max: 1406,
      mean: 1406,
      median: 1406,
      p90: 1406,
      p95: 1406,
      rates: { min: null, max: null, mean: null }
    }
  },
  checks: {}
}

# Add virtual users
$ zwarm-client run example-vin-decoder.js some-zwarm-server.com:3030 --iteration 2 --vus 2
1(1): JM1BJ227430649560
1(2): 1GYEE63A540146652
2(1): 2T1BU4EE3CC780594
2(2): KMHWF25V2YA162674
{
  pass: true,
  swarms: 1,
  walkers: 2,
  steps: 1,
  durationIn: { millis: 3027, seconds: 3.03, minutes: 0.05 },
  iterations: { min: 2, max: 2, avg: 2 },
  stats: {
    default: {
      tests: {
        'Test 1': {
          runs: 4,
          stats: { avg: 1351.25, _avgInc: 2, min: 1245, max: 1429 }
        }
      },
      errors: []
    }
  },
  timings: {
    'Test 1': {
      count: 4,
      min: 1245,
      max: 1429,
      mean: 1351.25,
      median: 1365.5,
      p90: 1429,
      p95: 1429,
      rates: { min: 2, max: 2, mean: 2 }
    }
  },
  checks: {}
}

# Increase the test duration
$ zwarm-client run example-vin-decoder.js some-zwarm-server.com:3030 --duration 5
1(1): 1G1AL55FX67787179
2(1): 2T3DK4DV5AW035669
3(1): 1C4SDJETXCC202739
4(1): 1J4GW48N23C615618
{
  pass: true,
  swarms: 1,
  walkers: 1,
  steps: 1,
  durationIn: { millis: 5551, seconds: 5.55, minutes: 0.09 },
  iterations: { min: 4, max: 4, avg: 4 },
  stats: {
    default: {
      tests: {
        'Test 1': {
          runs: 4,
          stats: { avg: 1302.5, _avgInc: 1, min: 1215, max: 1488 }
        }
      },
      errors: []
    }
  },
  timings: {
    'Test 1': {
      count: 4,
      min: 1215,
      max: 1488,
      mean: 1302.5,
      median: 1253.5,
      p90: 1488,
      p95: 1488,
      rates: { min: 1, max: 1, mean: 1 }
    }
  },
  checks: {}
}
```

Zwarm works with the concept of "virtual users (**VUs**)", which run the loadtest scripts. **VUs** are essentially parallel process and/or machines while scripts are written in Javascript and can be broken into smaller pieces or make reusable pieces.

### Using Steps options
Instead of typing *--vus 2* or *--duration 5* each time to run the script, another option is to add a **"steps/stage"** option in the Javascript file:

``` js
// example-http-decoder.js
$options.steps = [{
    vus: ($options.vus * 2),
    duration: $options.duration,
    iteration: 2,
    stages: {
        randomvin: 0.5,
        vpic: 0.5
    }
}];

describe('Multi stage/http demo', function() {
    it('Test random VIN', 'randomvin', async() => {
        const response = await $http.get('http://randomvin.com/getvin.php?type=real');
        const vin = response.data;
        await $log(`VIN ${$iteration}(${$VU}): ${vin}`);
        return await $sleep(500);
    });

    it('Test NHTSA VPIC', 'vpic', async() => {
        let response = await $http.get('http://randomvin.com/getvin.php?type=real');
        const vin = response.data;
        response = await $http.get(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
        const vpicResult = response.data;
        const vehicle = (vpicResult.Results.length > 0 ? vpicResult.Results[0] : {});
        await $log(`VPIC ${$iteration}(${$VU}): ${vehicle.ModelYear} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim ? (vehicle.Trim + ' ') : ''}- ${vin}`);
        return await $sleep(500);
    }); 
});
```

Then, run the script without those command-line options:
``` bash
$ zwarm-client run example-http-decoder.js some-zwarm-server.com:3030
VIN 1(1): 19XFB2F56CE034717
VPIC 1(2): 2015 JEEP Grand Cherokee Limited - 1C4RJFBG8FC699161
VIN 2(1): KM8SNDHF5EU057574
VPIC 2(2): 2007 HONDA Accord HYBRID NAVI - JHMCN36567C003754
{
  pass: true,
  swarms: 1,
  walkers: 2,
  steps: 1,
  durationIn: { millis: 2412, seconds: 2.41, minutes: 0.04 },
  iterations: { min: 2, max: 2, avg: 2 },
  stats: {
    'Multi stage/http demo': {
      tests: {
        'Test NHTSA VPIC': {
          runs: 2,
          stats: { avg: 1092, _avgInc: 1, min: 1073, max: 1111 }
        },
        'Test random VIN': {
          runs: 2,
          stats: { avg: 841, _avgInc: 1, min: 813, max: 869 }
        }
      },
      errors: []
    }
  },
  timings: {
    'Test random VIN': {
      count: 2,
      min: 813,
      max: 869,
      mean: 841,
      median: 841,
      p90: 869,
      p95: 869,
      rates: { min: 2, max: 2, mean: 2 }
    },
    'Test NHTSA VPIC': {
      count: 2,
      min: 1073,
      max: 1111,
      mean: 1092,
      median: 1092,
      p90: 1111,
      p95: 1111,
      rates: { min: 1, max: 1, mean: 1 }
    }
  },
  checks: {}
}
```

### See [Samples](samples/) folder for more advanced usage

## Command-Line
Like most command-line application, help command just display information about zwarm-client basic commands and options:
``` bash
$ zwarm-client --help
Usage: zwarm-client <command> [options]

Commands:
  zwarm-client run <script> <address>  run e2e/loadtest script
  zwarm-client info <address>          returns server info

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
  -v, --verbose  Run with verbose logging                              [boolean]

Zombie Swarm e2e/loadtest Client- copyright 2023
```

### `run` command
Runs the loadtest script on a particular server/address. See [`Load Test scripts`](#load-test-scripts) for further reference.
``` bash
$ zwarm-client run --help
zwarm-client run <script> <address>

run e2e/loadtest script

Positionals:
  script   e2e/loadtest script                                        [required]
  address  zombie swarm URL/address                                   [required]

Options:
      --help       Show help                                           [boolean]
      --version    Show version number                                 [boolean]
  -v, --verbose    Run with verbose logging                            [boolean]
      --vus        no. of virtual zombies to rise          [number] [default: 1]
      --duration   how long the zombies will attack (in seconds)
                                                          [number] [default: 30]
      --iteration  how many zombies will attack                         [number]
  -e, --env        environment name=value variables to pass on zwarm     [array]
  -f, --file       upload and/or map files to swarm server <src>[:<dest>][array]
```

### `info` command
Returns the nos. of swarms/zombies available, including current attacks/walkers.
| Name | Description |
| --- | --- |
| swarms | No. of virtual machines registered on the zwarm server/coordinator |
| zombies | Available no. of "virtual users (`VUs`)" that attack |
| attacks | Current no. of "running" loadtest scripts |
| walkers | Current no. of zombies or "virtual users (`VUs`)" attacking |

``` bash
$ zwarm-client info --help
zwarm-client info <address>

returns server info

Positionals:
  address  zombie swarm URL/address                                   [required]

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
  -v, --verbose  Run with verbose logging                              [boolean]
```

## Load Test scripts
The basic construct of zwarm loadtest scripts are similar to [`Mocha tests`](https://mochajs.org/#getting-started) supporting the following testing api:
 * Can have 0 or N suites (or **describe** calls)
 * Support 1 or N tests (or **it** calls)
 * Can have optional **before/after** and **beforeEach/afterEach** calls
 * Support for callback-based approach and/or promises/async/await style of operations

 Limitations:
 * No multi-level or hierarchical suites
 * Only support built-in modules or objects (no require support)
 * No assertion modules

### Built-in modules:
All built-in objects and functions are prefixed with **$** character to differentiate zwarm system vs. script variables.
``` js
it('Test 1', async() => {
    const page = await $browser.newPage();
    await page.goto('http://randomvin.com/getvin.php?type=real');
    const vin = await page.evaluate(() => document.body.innerText);
    await $log(`${$iteration}(${$VU}): ${vin}`);
    return await $sleep(1000);
});
```
On this example, $browser, $iteration and $VU are built-in objects while $log and $sleep are built-in functions.

| Name | Description | Default |
| --- | --- | ---: |
| $options.vus | Target count of zombies/walkers that will attack | 1 |
| $options.duration | Duration (in seconds) for how long the attack will last | 30 |
| $options.iteration | Target count of how many times a test will be run (NOTE: duration is prioritized over iteration) | optional |
| $options.steps | Series of ramp up/down stages containing target VUs, duration or iteration | optional |
| $options.thresholds | Series of acceptable timing thresholds | optional |
| $browser | An instance of Puppeteer browser object | [`Browser class`](https://pptr.dev/api/puppeteer.browser) |
| $http | An instance of HTTP client for browser | [`axios`](https://www.npmjs.com/package/axios) |
| $socketio | A subscribe-able client instance of an in-page socket.io parser | [`socket.io-parser`](https://www.npmjs.com/package/socket.io-parser) |
| $ws | A websocket object listener using event emitters | [`CDP Session`](https://pptr.dev/api/puppeteer.cdpsession) |
| $VU | Assigned unique no. for a "virtual user (VU)" | 1..*N* |
| $VUmeta | A hash key/value pair that can be set and retrieve between suites/tests | hash object |
| $iteration | Current iteration of a test in the suite | 1..*N* |
| $step | Current step for a multi-stage run | 0..*N* |
| $nop() | A simple do nothing async operation | () |
| $log(...) | Log and store events up to the server/coordinator | (text) |
| $timing(...) | Add an e2e timing for a particular stat/value | (stat, value) |
| $check(...) | Conduct threshold check/verification for a particular condition | (key, condition) |
| $setVUmeta(...) | Set a "virtual user (VU)" key/value pair | (VU, key, value) |
| $loadJson(...) | Special JSON file loader (returns a JSON object) | (filePath) => object |

## TODO:
- [ ] Advanced samples/documentation
- [ ] Experimental features using socket.io protocol between server/coordinator and swarm/zombies

## License
[MIT](LICENSE)