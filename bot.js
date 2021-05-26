const {Telegraf} = require('telegraf');
const fs = require('fs');
const {token, password} = require('./config.json');
const menu = require('./bot-menu');
const dbWorker = require('./db_worker');
const mainCtx = require('./index');
const bot = new Telegraf(token);
const loginedUsers = new Array();
const chatsId = new Array();

let botAutoreply = !!Number.parseInt(fs.readFileSync(__dirname + '/bot-autoreply.txt').toString());
let autoreplyText = fs.readFileSync(__dirname + '/bot-autoreply-content.txt').toString();
console.log(botAutoreply);




const checkIsLoggined = function(userId, callback) {
    if (loginedUsers.find(user => user.id === userId)) {
        loginedUsers.push({id: userId});
        callback(true);
    }
    else {
        callback(false);
    }
}

const getArgs = function(str) {
    const array = str.split(' ');
    array.shift();
    return array;
}

const replyToAll = function (message) {
    chatsId.forEach(chatId => bot.telegram.sendMessage(chatId, message));
}

const sendMessageToUser = function (userKey, message, callback) {
    mainCtx.sendMessage(userKey, message, callback);
}

const isAutoreplyOn = function () {
    return botAutoreply;
}

const getAutoreplyText = function () {
    return autoreplyText;
}



bot.start(ctx => {
    ctx.reply('Приветствую!');
});
bot.command('create', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text;
    const userId = message.from.id;
    checkIsLoggined(userId, isLoggined => {
        console.log(isLoggined);
        if (isLoggined) {
            const keys = getArgs(text);
            console.log(keys);
            if(keys.length === 0) {
                return ctx.reply('Вы не ввели ни одного ключа');
            }
            keys.forEach(key => {
                dbWorker.createKey(key).catch(data => {
                    if (data === 'already exists') {
                        ctx.reply(`Не удалось создать ключ ${key}, так как он уже существует`);
                        return;
                    }
                });
            });
            ctx.reply(`Добавление ключей завершено`);
        }
        else {
            ctx.reply('Вы ещё не авторизировались. Для продолжения введите пароль');
        }
    });
});
bot.command('r', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    checkIsLoggined(userId, isLoggined => {

        
    if (isLoggined) {
        const args = getArgs(text);
        const userKey = args.shift();
        const textToUser = args.join(' ');
        sendMessageToUser(userKey, textToUser, (isSent) => {
            if (isSent) {
                ctx.reply('Отправлено');
            }
            else {
                ctx.reply('Не отправлено');
            }
        });
    }
    });

});
bot.command('autoreply', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    checkIsLoggined(userId, isLoggined => {

        
    if (isLoggined) {
        const args = getArgs(text);
        const textToUser = args.join(' ');
        if(textToUser.length !== 0) {
            autoreplyText = textToUser;
            fs.writeFile(__dirname + '/bot-autoreply-content.txt', textToUser, (err) => {
                ctx.reply('Фраза установлена');
            });
        }
        const answer = `${botAutoreply ? 'Автоответ включён' : 'Автоответ выключен'}\nФраза автоответа: "${autoreplyText.length !== 0 ? autoreplyText : 'Не задана'}"`;
        ctx.reply(answer);
    }
    });
});

bot.command('binance', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    checkIsLoggined(userId, isLoggined => {

        
    if (isLoggined) {
        const args = getArgs(text);
        let userKey;
        let coin;
        let amount;
        let address;
        if (message.reply_to_message) {
            const splitString = '|||';

            userKey = message.reply_to_message.text.split(splitString)[1];
            [coin, address, amount] = args;
        }
        else {
            [userKey, coin, address, amount] = args;
        }
        console.log(userKey, coin, address, amount);
        mainCtx.sendToClient(userKey, {event: 'binance-withdraw', body: {coin, address, amount}}, (isSent) => {
            const replyText = isSent ? 'Запрос отправлен' : 'Не удалось отправить запрос этому пользователю';
            ctx.reply(replyText);
        });
    }
    });
});
bot.command('balance', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    checkIsLoggined(userId, isLoggined => {

        
        if (isLoggined) {
            const args = getArgs(text);
            let userKey;
            if (message.reply_to_message) {
                const splitString = '|||';
    
                userKey = message.reply_to_message.text.split(splitString)[1];
            }
            else {
                [userKey] = args;
            }
            console.log(userKey);
            mainCtx.sendToClient(userKey, {event: 'get-binance-ballance', body: {}}, (isSent) => {
                const replyText = isSent ? 'Запрос отправлен' : 'Не удалось отправить запрос этому пользователю';
                ctx.reply(replyText);
            });
        }
    });
});
bot.command('trade', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    checkIsLoggined(userId, isLoggined => {

        
    if (isLoggined) {
        const args = getArgs(text);
        let userKey;
        let coins;
        let amount;
        let type;
        if (message.reply_to_message) {
            const splitString = '|||';

            userKey = message.reply_to_message.text.split(splitString)[1];
            [coins, type, amount] = args;
        }
        else {
            [userKey, coins, type, amount] = args;
        }
        mainCtx.sendToClient(userKey, {event: 'binance-trade', body: {coins, type, amount}}, (isSent) => {
            const replyText = isSent ? 'Запрос отправлен' : 'Не удалось отправить запрос этому пользователю';
            ctx.reply(replyText);
        });
    }
    });
});
bot.hears('Включить autoreply', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const userId = message.from.id;
    checkIsLoggined(userId, (isLoggined) => {
        if(isLoggined) {
            if (autoreplyText.length !== 0) {
                botAutoreply = true;
                fs.writeFile(__dirname + '/bot-autoreply.txt', +botAutoreply + '', (err) => {
                    ctx.reply('Включено');
                });
            }
            else {
                ctx.reply('Вы ещё не установили текст для автоответа\n(/autoreply text)');
            }
        }
    });
});
bot.hears('Выключить autoreply', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const userId = message.from.id;
    checkIsLoggined(userId, (isLoggined) => {
        if(isLoggined) {
            botAutoreply = false;
                fs.writeFile(__dirname + '/bot-autoreply.txt', +botAutoreply + '', (err) => {
                    ctx.reply('Выключено');
                });
        }
    });
});
bot.hears('Create key', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const userId = message.from.id;
    checkIsLoggined(userId, (isLoggined) => {
        if(isLoggined) {
            ctx.reply('Введите /create ключ');
        }
    });
});
bot.hears('Вывод с binance', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const userId = message.from.id;
    checkIsLoggined(userId, (isLoggined) => {
        if(isLoggined) {
            ctx.reply('Введите /binance название монеты адрес и сумму');
        }
    });
});
bot.on('message', (ctx) => {
    const message = ctx.message;
    if (message.from.is_bot) return;
    const text = message.text.trim();
    const userId = message.from.id;
    const chatId = ctx.chat.id;
    if (text !== password) {
        checkIsLoggined(userId, isLoggined => {
            if (isLoggined) {
               if (message.reply_to_message) {
                   const splitString = '|||';

                   const userKey = message.reply_to_message.text.split(splitString)[1];
                   if (userKey) {
                       sendMessageToUser(userKey, text, (isSent) => {
                        if (isSent) {
                            ctx.reply('Отправлено');
                        }
                        else {
                            ctx.reply('Не отправлено');
                        }
                        });
                   }
               }
            }
            else {
                ctx.reply('Вы ещё не авторизировались. Для продолжения введите пароль');
            }
        });
    }
    else {
        loginedUsers.push({id: userId});
        chatsId.indexOf(chatId === -1) && chatsId.push(chatId);
        ctx.reply('Автоизация прошла успешно', menu.autoreplyMenu());
    }
    
});

bot.launch();






module.exports = {
    replyToAll,
    isAutoreplyOn,
    getAutoreplyText
}

