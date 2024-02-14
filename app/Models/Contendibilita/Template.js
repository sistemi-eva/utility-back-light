'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class TemplateContendibilita extends Model {

  static boot () {
      super.boot()
      this.addTrait('NoTimestamp')
    }
 
    static get connection() {
      return 'rcu'
    }

    static get table() {
	  return `${this.myschema}.cont_templates`
	  
    }

  
}
module.exports = TemplateContendibilita
