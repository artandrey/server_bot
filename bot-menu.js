const {Markup} = require('telegraf');


const autoreplyMenu = function () {
    return Markup.keyboard(['Включить autoreply', 'Выключить autoreply']).resize();
}

module.exports = {
    autoreplyMenu
}