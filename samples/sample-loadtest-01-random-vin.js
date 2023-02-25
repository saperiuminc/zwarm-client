it('Test 1', async() => {
    const page = await $browser.newPage();
    await page.goto('http://randomvin.com/getvin.php?type=real');
    const vin = await page.evaluate(() => document.body.innerText);
    await $log(`${$iteration}(${$VU}): ${vin}`);
    return await $sleep(1000);
});
