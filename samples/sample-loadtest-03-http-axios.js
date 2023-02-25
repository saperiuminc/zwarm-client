$options.steps = [{
    vus: ($options.vus * 2),
    duration: $options.duration,
    iteration: $options.iteration,
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