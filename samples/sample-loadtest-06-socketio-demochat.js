describe('socket.io chat demo', function() {
    let _sioSub = undefined;

    before(async() => {
        $socketio.on('connect', (sid) => {
            console.log('connect:', sid);
        });
        $socketio.on('disconnect', (sid) => {
            console.log('disconnect:', sid);
        });
        $socketio.on('login', (data, sid) => {
            console.log('login:', data, sid);
        });
        $socketio.on('new message', (data, sid) => {
            console.log('new message:', data, sid);
        });
        /*
        // NOTE: * listen to all events
        $socketio.on('*', (event, data, sid) => {
            console.log('EVENT:', event, data, sid);
        });
        */
        _sioSub = $socketio.subscribe();
    });
    after(async() => {
        // $socketio.unsubscribe();
        if (_sioSub)
            _sioSub.unsubscribe();
    });

    it('login test', async() => {
        const page = await $browser.newPage();
        await page.goto('https://socketio-chat-h9jt.herokuapp.com/', { waitUntil: 'networkidle2' });
        await page.waitForSelector('input.usernameInput', { visible: true });
        await page.click('input.usernameInput', { clickCount: 3 });
        await page.keyboard.type('zwarm');
        await page.keyboard.press('Enter');
        await $sleep(10000);
        await page.close();
        return await $sleep(1000);
    });
});