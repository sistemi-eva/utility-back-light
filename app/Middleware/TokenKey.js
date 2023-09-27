'use strict'
const Token = use('App/Models/Token')
class TokenKey {
  async handle ({ request, response}, next) {
    try {
      const key_code = request.header('Secret-Key')
      if(key_code) {
        var results = await Token.query().where('token','=',key_code).fetch()
        results = results.toJSON()
        if(results.length > 0) {
		console.log('BACK',results[0].ip_address,request.ip())
          if(true || (results[0].ip_address == request.ip())) {
            await next()
            if(Date.now() < results[0].expired) await next()
            else return response.status(401).send({"status": "BAD_REQUEST","message": "Il Token inserito è scaduto"})
          }
          else return response.status(401).send({"status": "CODE_EXPIRED","message": "Il Token non è associato allo stesso indirizzo ip"})
        }else {
          return response.status(401).send({"status": "BAD_REQUEST","message": "Il Token inserito non è valido"})
        }
      }else {
        return response.status(401).send({"status": "BAD_REQUEST","message": "Il Token non è stato inserito"})
      }
    } catch (error) {
      return response.status(500).send({"status": "SYSTEM_ERROR","message": error.message})
    }
  }
}

module.exports = TokenKey
