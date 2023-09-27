'use strict'

/** @type {typeof import('@adonisjs/lucid/src/Lucid/Model')} */
const Model = use('Model')

class Layout extends Model {
  static boot () {
    super.boot()
    
  }
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
  
  Structures() {
    return this.hasMany('App/Models/LayoutStructure','id', 'layout_id')
  }
  Tenant(){
    return this.hasOne('App/Models/Tenant','tenant_code','code')
  }
}
module.exports = Layout
