'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PiuenergieUtenti extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'piuenergie'
    }

    static get table() {
      return 'UTENTI'
    }

  
}
module.exports = PiuenergieUtenti
