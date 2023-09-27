'use strict'

const RoutePermission = use('App/Models/RoutePermission')
const Env = use('Env')
const ldap = require('ldapjs');

class AdminController {

  async statusAllCache({response,request}){
    try {
      let RedisController = use(`App/Controllers/Http/RedisRouteController`)
      const RedisClass = new RedisController()
      let final_value = await RedisClass.statusCache()
      return response.send({"status": "success","data": final_value,"message": ``})
      } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
  }

  async refreshAllCache({request,response}){
    try {
      let RedisController = use(`App/Controllers/Http/RedisRouteController`)
      const RedisClass = new RedisController()
      RedisClass.updateAllCacheImport()
      return response.send({"status": "success","data": "","message": `Cache in aggioramento  `})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }


  async deleteAllCache({request,response}){
    try {
      let RedisController = use(`App/Controllers/Http/RedisRouteController`)
      const RedisClass = new RedisController()
      await RedisClass.deleteAllCache()
      return response.send({"status": "success","data": "","message": `Cache Eliminata  `})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }
    //Route Permissions
  async findGroup(connection,search) {
    return new Promise(async (resolve,reject) => {
      const array = []
      var opts = {
          filter: '(objectClass=Group)',  //simple search
          scope: 'sub',
          attributes: ['mail','sAMAccountName','displayName','givenName','sn','memberOf','distinguishedName','isCriticalSystemObject']
      };
        connection.search('CN=Users,DC=ugmlocal,DC=com', opts, function (err, res) {
          if (err) {
              console.log("Error in search " + err)
          } else {
              res.on('searchEntry', function (entry) {array.push(entry.object)})
              res.on('error', function (err) {reject(err)})
              res.on('end', function () {
                var newArray = array.filter((el) => { if(!el.isCriticalSystemObject) return el})
                newArray = newArray.map((el) => { return {name:el.givenName,surname:el.sn,username: el.sAMAccountName,path:el.distinguishedName,isCriticalSystemObject:el.isCriticalSystemObject}})
                resolve(newArray)
              });
          }
      });
    })
  }

  async getAllLdapUsers({request,response}) {
    try {
      const connection = ldap.createClient({url: Env.get('LDAP_CONNECTION'),tlsOptions: { rejectUnauthorized: false }})  
      const search = request.input('search',null)
      const that = this
      const users = await new Promise(async (resolve,reject) => {
        await connection.bind(Env.get('LDAP_ADMIN_USERNAME'),Env.get('LDAP_ADMIN_PASSWORD'), async (err) => {
          if(err) reject(err)
          else resolve(await that.findGroup(connection,search))
        })
      })
      return response.send({"status": "success","data": users,"message": `Ritorno di tutti i gruppi su ldap escludendo quelli di sistema`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async updateRoutePermissions({request,response}){
    try {
      const { route } = request.all()
      const rotta = await RoutePermission.find(route.name)
      rotta.merge({member_of: JSON.stringify(route.member_of)})
      await rotta.save()
      return response.send({"status": "success","data": await RoutePermission.query().orderBy('created_at','desc').fetch(),"message": `Le Rotte sono state aggiornate`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }

  async getAllRoutePermissions({request,response}){
    try {
      var data = await RoutePermission.query().orderBy('created_at','desc').fetch()
      data = data.toJSON()
      return response.send({"status": "success","data": data,"message": `Ritorno di tutti le rotte con i relativi membri`})
    } catch (error) {
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }
}

module.exports = AdminController
