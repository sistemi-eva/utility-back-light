'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Tenant extends Model {
    static boot () {
        super.boot()
        this.addHook("beforeCreate", "GenerateuuidHook.uuid");
      }
    
      static get primaryKey() {
        return "uuid";
      }

      static get hidden() {
        return ['created_at', 'updated_at']
      }
       
}

module.exports = Tenant
