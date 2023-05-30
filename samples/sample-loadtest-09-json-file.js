const userFile = (process.env.USERS_FILE || 'users.json');
it('Test 1', async() => {
    const users = await $loadJson(userFile);
    return await $log(users);
});
