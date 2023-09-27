'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TemplateMappingContendibilita extends Model {
  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'contendibilita'
    }

    static get table() {
      return 'template_mapping'
    }

  
}
module.exports = TemplateMappingContendibilita
