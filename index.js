const fs = require('fs');
const http2 = require('http2');
const tls = require('tls');
const freefare = require('freefare');
const path = require('path');
const Timeout = require('await-timeout');

const Credentials = tls.createSecureContext({
    key: fs.readFileSync(path.join(__dirname, 'raspberrypi2_home.client.key')),
    cert: fs.readFileSync(path.join(__dirname, 'raspberrypi2_home.client.crt')),
    minVersion: 'TLSv1.2'
});

function Post(Url, Path) {
    const Client = http2.connect(Url, {
        secureContext: Credentials
    });

    const Request = Client.request({
        ':scheme': 'https',
        ':method': 'POST',
        ':path': Path,
        'Content-Length': 0,
        'referer': 'https://lan.doorlock.party'
    });

    Request.setEncoding('utf8');
    const Data = [];
    Request.on('data', Chunk => Data.push(Chunk));

    return new Promise(Resolve => {
        Request.on('end', () => {
            Client.close();
            Resolve(Data.join(''))
        });
    });
}

async function Poll(Device) {
    const Tags = await Timeout.wrap(Device.listTags(), 2000,
        `${Device.name} timed out after 2000 ms`);

    for (const Tag of Tags) {
        console.log('Found tag', Tag.getType(), Tag.getFriendlyName(), Tag.getUID());

        const Response = await Post('https://lan.doorlock.party', '/api/v1/tag/' + Tag.getUID());
        console.log('Sent tag', Tag.getUID(), Response);
    }

    setTimeout(Poll, 500, Device);
}


(async () => {
    const Freefare = new freefare();
    const Devices = await Freefare.listDevices();

    for (const Device of Devices) {
        console.log('Found device', Device.name);

        await Device.open();
        Poll(Device);
    }
})();
