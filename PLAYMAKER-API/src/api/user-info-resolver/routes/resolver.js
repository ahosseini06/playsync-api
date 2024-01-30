module.exports = {
    routes: [
        {
            method: 'GET',
            path: '/is-username-available',
            handler: 'user-info-resolver.isUsernameAvailable',
            config: {
                auth: false,
            }
        },
        {
            method: 'GET',
            path: '/is-email-available',
            handler: 'user-info-resolver.isEmailAvailable',
            config: {
                auth: false,
            }
        }
    ]   
}