'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')
const moment = require("moment")

class ImportContendibilita extends Model {

  static boot () {
    super.boot()
    this.addTrait('NoTimestamp')
  }

  static get connection() {
    return 'rcu'
  }

  static get table() {
    return `${this.myschema}.cont_imports`
  }

  getData(data) {
    return moment(data).format('DD/MM/YYYY HH:mm')
  }

  template(){
    return this.hasOne('App/Models/Contendibilita/Template','template_id', 'id')
    // .orderBy('created_at','asc')
  }

  
}
module.exports = ImportContendibilita
