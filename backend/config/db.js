const mongoose = require('mongoose');
const {setServers, resolveSrv, resolveTxt} = require('node:dns/promises');

const parseDnsServers = () => {
    const value = process.env.MONGO_DNS_SERVERS || '1.1.1.1,8.8.8.8';
    return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const applyDnsServers = async () => {
    const servers = parseDnsServers();
    if (!servers.length) return;
    setServers(servers);
    console.log(`Using DNS servers: ${servers.join(', ')}`);
};

const buildStandardUriFromSrv = async (srvUri) => {
    const parsed = new URL(srvUri);
    const serviceHost = `_mongodb._tcp.${parsed.hostname}`;

    const srvRecords = await resolveSrv(serviceHost);
    if (!srvRecords.length) {
        throw new Error(`No SRV records found for ${serviceHost}`);
    }

    const hosts = srvRecords.map((record) => `${record.name}:${record.port}`).join(',');
    const username = parsed.username ? encodeURIComponent(parsed.username) : '';
    const password = parsed.password ? encodeURIComponent(parsed.password) : '';
    const auth = username ? `${username}${password ? `:${password}` : ''}@` : '';
    const dbName = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.slice(1) : 'vehicle_management';

    const params = new URLSearchParams(parsed.search);

    try {
        const txtRecords = await resolveTxt(serviceHost);
        for (const recordSet of txtRecords) {
            const joined = recordSet.join('');
            for (const pair of joined.split('&')) {
                const [rawKey, rawValue] = pair.split('=');
                if (!rawKey) continue;
                if (!params.has(rawKey)) {
                    params.set(rawKey, rawValue || '');
                }
            }
        }
    } catch (error) {
        console.warn(`TXT lookup skipped: ${error.message}`);
    }

    if (!params.has('tls') && !params.has('ssl')) {
        params.set('tls', 'true');
    }

    const query = params.toString();
    return `mongodb://${auth}${hosts}/${dbName}${query ? `?${query}` : ''}`;
};

const connectWithUri = async (uri) => {
    return mongoose.connect(uri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
        family: 4 // Force IPv4 to avoid IPv6 issues on some networks
    });
};

const connectDB = async () => {
    const primaryUri = process.env.MONGO_URI || 'mongodb://localhost:27017/vehicle_management';

    try {
        const conn = await connectWithUri(primaryUri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        const isSrvDnsError = /querySrv|ENOTFOUND|ECONNREFUSED/i.test(error.message || '');
        const isSrvUri = primaryUri.startsWith('mongodb+srv://');

        if (!isSrvDnsError || !isSrvUri) {
            console.error(`❌ MongoDB connection failed: ${error.message}`);
            process.exit(1);
        }

        console.warn(`⚠️ SRV lookup failed (${error.message}). Retrying with DNS override...`);

        try {
            await applyDnsServers();
            const retryConn = await connectWithUri(primaryUri);
            console.log(`✅ MongoDB Connected after DNS override: ${retryConn.connection.host}`);
            return;
        } catch (dnsRetryError) {
            console.warn(`⚠️ SRV retry failed: ${dnsRetryError.message}`);
        }

        try {
            const fallbackUri = process.env.MONGO_URI_FALLBACK || await buildStandardUriFromSrv(primaryUri);
            const fallbackConn = await connectWithUri(fallbackUri);
            console.log(`✅ MongoDB Connected using fallback URI: ${fallbackConn.connection.host}`);
        } catch (fallbackError) {
            console.error(`❌ MongoDB fallback connection failed: ${fallbackError.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;