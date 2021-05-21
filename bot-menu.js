const {Markup} = require('telegraf');


const autoreplyMenu = function () {
    return Markup.keyboard(['Включить autoreply', 'Выключить autoreply', 'Create key', 'Вывод с binance']).resize();
}

module.exports = {
    autoreplyMenu
}