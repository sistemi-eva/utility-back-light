'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class AurahUtenti extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'aurah'
    }

    static get table() {
      return 'UTENTI'
    }

  
}
module.exports = AurahUtenti
