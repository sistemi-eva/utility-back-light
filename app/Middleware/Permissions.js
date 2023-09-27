'use strict'
const Token = use('App/Models/Token')
class Permissions {
 
  async handle ({request, response,params},  next, properties) {
    try {
      const key_code = request.header('Secret-Key')
      var results = await Token.query().where('token','=',key_code).fetch()
      results = results.toJSON()
      if(results[0].permissions && JSON.parse(results[0].permissions).includes(properties[0]) || results[0].permissions && JSON.parse(results[0].permissions).includes('admin')) await next()
      else return response.status(403).send({"status": "BAD_REQUEST","message": "Non hai i permessi necessari per effettuare la chiamata"})
    } catch (error) {
      return response.status(500).send({"status": "SYSTEM_ERROR","message": error.message})
    }
  }
}

module.exports = Permissions
