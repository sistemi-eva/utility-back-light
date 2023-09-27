'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const moment = require("moment")

class LogContendibilita extends Model {

  static primaryKey = 'data'

  static boot () {
    super.boot()
    this.addTrait('NoTimestamp')
  }


  static get connection() {
    return 'contendibilita'
  }

  static get table() {
    return 'logs'
  }

  getData(data) {
    return moment(data).format('DD/MM/YYYY HH:mm')
  }
}
module.exports = LogContendibilita
