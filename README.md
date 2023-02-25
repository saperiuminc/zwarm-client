# zwarm-client
Zombie Swarm e2e/load testing Client, inspired by [`k6`](https://k6.io/) and modelled after [`Mocha`](http://mochajs.org/). This load testing tool makes end-to-end performance testing easy and productive for development teams which uses [`Puppeteer`](https://pptr.dev/) for conducting headless browser manipulation.

## Installation
``` bash
$ npm install -g @saperiuminc/zwarm-client
```

## Usage
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
```
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
```
