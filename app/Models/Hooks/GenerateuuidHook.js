'use strict'

const uuidv4 = require("uuid/v4");

const GenerateuuidHook = exports = module.exports = {}

GenerateuuidHook.uuid  = async value => {
    value.uuid = uuidv4();
}
