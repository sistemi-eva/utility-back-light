'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PrixacardCard extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')

    }
 
    static get connection() {
      return 'areaclienti'
    }

    static get table() {
      return 'prixacard_card'
    }

  
}
module.exports = PrixacardCard
