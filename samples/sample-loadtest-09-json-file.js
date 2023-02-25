it('Test 1', async() => {
    const users = await $loadJson('users.json');
    return await $log(users);
});
