$options.steps = [{
    vus: $options.vus,
    duration: $options.duration,
    iteration: $options.iteration,
    stages: {
        randomvin: 1.0
    }
}, {
    vus: $options.vus,
    duration: $options.duration,
    iteration: $options.iteration,
    stages: {
        vpic: 1.0
    }
}];

describe('Multi step/stage demo', function() {
    it('Test random VIN', 'randomvin', async() => {
        const page = await $browser.newPage();
        await page.goto('http://randomvin.com/getvin.php?type=real');
        const vin = await page.evaluate(() => document.body.innerText);
        await $log(`VIN ${$iteration}(${$VU}): ${vin}`);
        return await $sleep(1000);
    });

    it('Test NHTSA VPIC', 'vpic', async() => {
        const page = await $browser.newPage();
        await page.goto('http://randomvin.com/getvin.php?type=real');
        const vin = await page.evaluate(() => document.body.innerHTML);
        await page.goto(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`);
        const vpicResult = JSON.parse(await page.evaluate(() => document.body.innerText));
        const vehicle = (vpicResult.Results.length > 0 ? vpicResult.Results[0] : {});
        await $log(`VPIC ${$iteration}(${$VU}): ${vehicle.ModelYear} ${vehicle.Make} ${vehicle.Model} ${vehicle.Trim ? (vehicle.Trim + ' ') : ''}- ${vin}`);
        return await $sleep(1000);
    });    
});