'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TemplateContendibilita extends Model {

  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'contendibilita'
    }

    static get table() {
      return 'templates'
    }

  
}
module.exports = TemplateContendibilita
