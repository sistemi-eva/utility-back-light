'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class DuegUtenti extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return '2g'
    }

    static get table() {
      return 'UTENTI'
    }

  
}
module.exports = DuegUtenti
