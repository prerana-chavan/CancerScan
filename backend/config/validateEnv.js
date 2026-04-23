const validateEnv = () => {
    const required = ['PORT', 'JWT_SECRET']
    const missing = required.filter(key => !process.env[key])

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:')
        missing.forEach(key => console.error(`   - ${key}`))
        console.error('Please fill in your .env file and restart.')
        process.exit(1)
    }

    if (process.env.JWT_SECRET.length < 32) {
        console.error('❌ JWT_SECRET must be at least 32 characters')
        console.error('Generate one: openssl rand -base64 32')
        process.exit(1)
    }

    console.log('✅ Environment variables validated')
}

module.exports = validateEnv
