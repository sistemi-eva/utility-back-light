'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class SempliceUtenti extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'semplice'
    }

    static get table() {
      return 'UTENTI'
    }

  
}
module.exports = SempliceUtenti
