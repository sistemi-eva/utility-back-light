'use strict'

const moment = require('moment')
const Token = use('App/Models/Token')
const RoutePermission = use('App/Models/RoutePermission')
const Env = use('Env')
var Crypto = require('crypto')
const { authenticate } = require('ldap-authentication')
const bcrypt = require("bcrypt")

const Database = use('Database')

class AuthController {

   //Auth 
   async checkPermissions(member_of){
    try {
      let array = ['index']
      var rotte = await RoutePermission.query().fetch()
      rotte = rotte.toJSON()
      
      rotte.forEach(permesso => { 
        for(let i in member_of) {
          for(let k in permesso.member_of){
            if(permesso.member_of[k].username === member_of[i].username)array.push(permesso.name)
          }
        }
      })
      return array
    } catch (error) {
      console.log("error",error)
    }
  }
  
  async getTenants( {request, response }){
	  
	  var tenant = "all";
	  try {
		  const DB = Database.connection('rcu')
		var result = await DB.raw(`SELECT tenant FROM public.tenant WHERE tenant != ?`, [tenant])
			return response.send({"status": "success", "data": result.rows})
	  }
	  catch(e){
		  return response.send({"status": e.message, "data": []})
	  }
  }
  
  async getFirstTenant(){
	  var tenant = "all";
	  try {
		  const DB = Database.connection('rcu')
		var result = await DB.raw(`SELECT tenant FROM public.tenant WHERE tenant != ? limit 1`, [tenant])
			
			console.log(result.rows)
			tenant = result.rows[0].tenant
	  }
	  catch(e){
		  tenant = "non dato";
	  }
	  
	  return tenant
  }

  getNewMemberOf(member_of){
    let temp = []
    let tempUsername = []
    for(let i in member_of) {
        let username = member_of[i].substring(member_of[i].indexOf("CN=") + 3,member_of[i].indexOf(","))
        tempUsername.push(username)
        temp.push({username, path: member_of[i]})
    }
    return {all:temp,usernames:tempUsername}
  }
    //Login 
	
	
	
	async login ({ request,response }) {
	  
	  
    const { username, password } = request.all()
	
	const numSaltRounds = 1
	
	const mypassword = bcrypt.hashSync("prova123", numSaltRounds)
	
	
	const DB = Database.connection('rcu')
	

    try {
		var result = await DB.raw(`SELECT * FROM public.utenti WHERE username = ?`, [username])

		var pwd = result.rows[0].password;
		var permission = result.rows[0].ruolo;
		var nominativo = result.rows[0].nominativo
		var ruolo = result.rows[0].ruolo
		
		if(result.rows[0].ruolo != "superadmin"){
			var tenant = result.rows[0].tenant
			
		}
		else{
			var tenant = await this.getFirstTenant()
		}
		
		
		var logged = await bcrypt.compare(password, pwd);
		
		if( logged ){
			
			 var token =  await Crypto.randomBytes(48).toString('hex');
			 
			 
			 await Token.create({token,username,name: nominativo, member_of: JSON.stringify(ruolo), permissions: JSON.stringify(permission),expired: moment().add(1,'days'),ip_address:request.ip()})
			 
			 
			 return response.send({"status": "success","data": {token:token, tenant: tenant, permissions: JSON.stringify(permission)},"message": `${username} hai effettuato l'accesso correttamente`})
			 
			 
		}
		else{
			
			 return response.status(500).send({"status": "error","code": 500,"data": null,"message": 'LOGIN ERROR'})
		}
		
    } catch (error) {
      console.log(error)
	  
	   return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})

    }
  }
  
  
  
	
  async login_old ({ request,response }) {
	  
	  
    const { username, password } = request.all()
    console.log(username, password)
    const options = {
      ldapOpts: { url: Env.get('LDAP_CONNECTION'),starttls:true,tlsOptions: { rejectUnauthorized: false }},
      adminDn: Env.get('LDAP_ADMIN_USERNAME'),
      adminPassword: Env.get('LDAP_ADMIN_PASSWORD'),
      userPassword: password,
      userSearchBase: ' CN=Users,DC=ugmlocal,DC=com',
      username: username,
    }
    try {
      var user = await authenticate({...options, usernameAttribute: 'sAMAccountName'})
      console.log(user)
      var token =  await Crypto.randomBytes(48).toString('hex');
      if(!Array.isArray(user.memberOf)) user.memberOf = [user.memberOf]
      let members = this.getNewMemberOf(user.memberOf)
      user.memberOf = members.all
      await Token.create({token,username,name: user.cn, permissions: JSON.stringify(await this.checkPermissions(user.memberOf)),member_of:JSON.stringify(members.usernames), expired: moment().add(1,'days'),ip_address:request.ip()})
      return response.send({"status": "success","data": {token:token,name: user.cn,permissions: JSON.stringify(await this.checkPermissions(user.memberOf)),member_of:members.usernames},"message": `${user.name} hai effettuato l'accesso correttamente`})
    } catch (error) {
      console.log(error)
      try {
        var user =  await authenticate({...options, usernameAttribute: 'mail'})
        var token =  await Crypto.randomBytes(48).toString('hex');
        if(!Array.isArray(user.memberOf)) user.memberOf = [user.memberOf]
        let members = this.getNewMemberOf(user.memberOf)
        user.memberOf = members.all
        await Token.create({token,username,name: user.cn,permissions: JSON.stringify(await this.checkPermissions(user.memberOf)),member_of:JSON.stringify(members.usernames),expired: moment().add(1,'days'),ip_address:request.ip()})
        return response.send({"status": "success","data": {token:token,name: user.cn,permissions:await this.checkPermissions(user.memberOf),member_of:members.usernames},"message": `${user.name} hai effettuato l'accesso correttamente`})
      } catch (error) {
        return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
      }
    }
  }
  
  
  
  //Auth Permissions
  async getPermissions({request,response }){
    try {
      const key_code = request.header('Secret-Key')
      var results = await Token.query().where('token','=',key_code).fetch()
	 
	  
      results = results.toJSON()


	  
      return response.send({"status": "success","data": {permissions: JSON.parse(results[0].permissions),member_of: JSON.parse(results[0].member_of)},"message": "Questi sono i tuoi permessi all'interno di Utility"})
    } catch (error) {
      console.log("err",error)
      return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})
    }
  }
}

module.exports = AuthController
