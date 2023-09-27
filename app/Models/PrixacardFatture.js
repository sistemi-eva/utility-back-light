'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class PrixacardFatture extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }

    static get connection() {
      return 'areaclienti'
    }
  
    static get table() {
      return 'prixacard_fatture'
    }

    static get hidden() {
      return ['created_at', 'updated_at']
    }
  
}
module.exports = PrixacardFatture
