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
	
		//const mypassword = bcrypt.hashSync("prova123", numSaltRounds)
	
		const DB = Database.connection('rcu')
	

		try {
			var result = await DB.raw(`SELECT * FROM public.utenti AS u LEFT JOIN public.tenant AS t ON u.tenant = t.tenant WHERE username = ?`, [username])

			var pwd = result.rows[0].password;
			var permission = result.rows[0].ruolo;
			var nominativo = result.rows[0].nominativo
			var ruolo = result.rows[0].ruolo
			var azienda = result.rows[0].tenant + " " + result.rows[0].descrizione
		
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
			 
			 
				return response.send({"status": "success","data": {token:token, azienda: azienda, tenant: tenant, permissions: JSON.stringify(permission)},"message": `${username} hai effettuato l'accesso correttamente`})
			 
			 
			}
			else{
			
				return response.status(500).send({"status": "error","code": 500,"data": null,"message": 'LOGIN ERROR'})
			}
		
		} catch (error) {
			console.log(error)
	  
			return response.status(500).send({"status": "error","code": 500,"data": null,"message": error.message})

		}
	}
  
  
	async userIsRuolo( username, ruolo ){
		const DB = Database.connection('rcu')
	  
		try{
			var result = await DB.raw(`SELECT ruolo FROM public.utenti WHERE username = ?`, [username])
		  
			if(result.rows[0] !== undefined && result.rows[0].ruolo == ruolo ){
				return true
			}
			else{
				return false 
			}
		}
		catch(e){
		  
			return false
		}
	 
	}
  
	async getUsernameFromToken(mytoken){  
	  
		var results = await Token.query().where('token','=',mytoken).fetch()
		results = results.toJSON()
		
		var username = results[0].username;
		
		return username
		
	}
  
	async getTenantFromUsername(username){
	  
		try{
			const DB = Database.connection('rcu')
			var result = await DB.raw(`SELECT tenant FROM public.utenti WHERE username = ?`, [username])
			var tenant = result.rows[0].tenant
		  
			return tenant
		  
		}
		catch(e){
			return false
		  
		}
	 
	}
  
	async getUsersFromTenant(tenant){
		try{
			const DB = Database.connection('rcu')
		  
			if( tenant != "all" ){
				var result = await DB.raw(`SELECT username, ruolo, tenant, nominativo FROM public.utenti WHERE tenant = ?`, [tenant])
			  
			}
			else{
				var result = await DB.raw(`SELECT username, ruolo, tenant, nominativo FROM public.utenti WHERE tenant <> ?`, [tenant])
			}
			var users = result.rows
		  
			return users
		  
		}
		catch(e){
			return []
		  
		}
	  
	}
  
  
	async getUsersFromAdmin ( {request, response} ) {
	  
		const key_code = request.header('Secret-Key')
	  
		try{
		  
			var username = await this.getUsernameFromToken(key_code)
		  
			if( ! await this.userIsRuolo(username, "admin") && ! await this.userIsRuolo(username, "superadmin") ){
			  
				return response.send({"status": "success","data": [],"message": 'utenti'})
			}
		  
			var tenant = await this.getTenantFromUsername(username)
		  
			var users = await this.getUsersFromTenant(tenant)
			
			return response.send({"status": "success","data": users, "message": `utenti`})
		}
		catch(e){
		  
		   return response.send({"status": "success","data": [],"message": e.message})
		}	
 	  
	}
  
	async getTenantsFromAdmin( { request, response } ){
	  
		const key_code = request.header('Secret-Key')
	  
		try{
		  
			var username = await this.getUsernameFromToken(key_code)
		  
			if( await this.userIsRuolo(username, "superadmin") ){
				const DB = Database.connection('rcu')
				var result = await DB.raw(`SELECT * FROM public.tenant WHERE tenant <> 'all' `)
				var tenant = result.rows
				return response.send({"status": "success","data": tenant,"message": 'tenant'})
			}
			else{
				  
				var tenant = await this.getTenantFromUsername(username)
				  
				return response.send({"status": "success","data": [{tenant:tenant}],"message": 'tenant'})
			}
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	}
  
  
	async creaUtente( { request, response } ){
		var { username, password, nominativo, ruolo, tenant } = request.all()
	  
		const mypassword = bcrypt.hashSync(password, 1)
	  
		try{
		  
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
			if( await this.userIsRuolo(myusername, "operatore") ){
				return response.status(200).send({"status": "error", "message": 'Errore creazione utente'})
			}
			else{
				const DB = Database.connection('rcu')
				
				
				var r = await DB.raw(`SELECT username FROM public.utenti WHERE username = ?`, [username]);
				
				
				var my_username = "";
				if( r.rows[0] !== undefined && r.rows[0].username !== undefined ) {
					my_username = r.rows[0].username;
				}
				
		
				
				if( my_username.toLowerCase() == username.toLowerCase() && _username != username ){
					return response.status(200).send({"status": "error", "message": 'Errore già esiste un utente con questo nome'})
				}
			  
			
			
			    var result = await Database.connection("rcu").table(`public.utenti`).insert({ username: username, password: mypassword, tenant: tenant, ruolo: ruolo, nominativo: nominativo})
			  
				return response.status(200).send({"status": "success","message": 'utente creato'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	  
	}
  
  
	async modificaUtente( { request, response } ){
		var { _username, username, password, nominativo, ruolo, tenant } = request.all()
	  
		const mypassword = bcrypt.hashSync(password, 1)
	  
		try{
		  
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
			if( await this.userIsRuolo(myusername, "operatore") ){
				return response.status(200).send({"status": "error", "message": 'Errore creazione utente'})
			}
			else{
				const DB = Database.connection('rcu')
				
				var r = await DB.raw(`SELECT username FROM public.utenti WHERE username = ?`, [username]);
				
				
				var my_username = "";
				if( r.rows[0] !== undefined && r.rows[0].username !== undefined ) {
					my_username = r.rows[0].username;
				}
				
		
				
				if( my_username.toLowerCase() == username.toLowerCase() && ( _username != username) ){
					return response.status(200).send({"status": "error", "message": 'Errore già esiste un utente con questo nome'})
				}
			 
				if( password == "" ){
					var result = await Database.connection("rcu").table(`public.utenti`).where("username", _username).update({ username: username, tenant: tenant, ruolo: ruolo, nominativo: nominativo})
					
				}
				else{
					var result = await Database.connection("rcu").table(`public.utenti`).where("username", _username).update({ username: username, password: mypassword, tenant: tenant, ruolo: ruolo, nominativo: nominativo})
				
				}
			  
				return response.status(200).send({"status": "success","message": 'utente creato'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	  
	}
  
  
  
  
	async eliminaUtente( { request, response } ){
		var { username } = request.all()
	  
		try{
		  
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
			if( await this.userIsRuolo(myusername, "operatore") ){
				return response.status(200).send({"status": "error", "message": 'Errore creazione utente'})
			}
			else{
				const DB = Database.connection('rcu')
			 
			    var result = await DB.raw(`DELETE FROM public.utenti WHERE username = ?` , [username] )
			  
				return response.status(200).send({"status": "success","message": 'utente eliminato'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	  
	}
  
  
  
	async creaTenant( { request, response } ){
		var { tenant, descrizione, udd, cc } = request.all()
	 
		try{
			if( tenant.toLowerCase() == "all" ){
				return response.status(200).send({"status": "error", "message": 'Errore creazione tenant. tenant non può essere all'})
			}
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
		  
			if( await this.userIsRuolo(myusername, "superadmin") ){
			  
				const DB = Database.connection('rcu')
			  
				var r = await DB.raw(`SELECT tenant FROM public.tenant WHERE tenant = ?`, [tenant]);
				
				
				var myTenant = "";
				if( r.rows[0] !== undefined && r.rows[0].tenant !== undefined ) {
					myTenant = r.rows[0].tenant;
				}
				
		
				
				if( myTenant.toLowerCase() == tenant.toLowerCase() && _tenant != tenant ){
					return response.status(200).send({"status": "error", "message": 'Errore già esiste un tenant con questo nome'})
				}
				
			    var result = await Database.connection("rcu").table(`public.tenant`).insert({ tenant: tenant, descrizione: descrizione, udd: udd, cc: cc})
								
				await this.createTablesForTenant(tenant);
										
			  
				return response.status(200).send({"status": "success","message": 'tenant creato'})
			}
			else{
	
				return response.status(200).send({"status": "error", "message": 'Errore creazione tenant'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	   
	}
  
  
  
	async eliminaTenant( { request, response } ){
		var { tenant } = request.all()
	  
		try{  
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
			if( !await this.userIsRuolo(myusername, "superadmin") ){
				return response.status(200).send({"status": "error", "message": 'Errore eliminazione tenant'})
			}
			else{
				const DB = Database.connection('rcu')
		  
				var result = await DB.raw(`DELETE FROM public.tenant WHERE tenant = ?` , [tenant] )
				
				result = await DB.raw(`DROP SCHEMA ${tenant} CASCADE;`)
			  
				return response.status(200).send({"status": "success","message": 'tenant eliminato'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
		}
	  
	}
  
  
	async modificaTenant( { request, response } ){
			
		var { _tenant, tenant, descrizione, udd, cc } = request.all()
	  
		try{
			if( tenant.toLowerCase() == "all" ){
				return response.status(200).send({"status": "error", "message": 'Errore creazione tenant. tenant non può essere all'})
			}
			const key_code = request.header('Secret-Key')
		  
			var myusername = await this.getUsernameFromToken(key_code);
		  
		  
			if( await this.userIsRuolo(myusername, "superadmin") ){
			  
				const DB = Database.connection('rcu')
			  
				var r = await DB.raw(`SELECT tenant FROM public.tenant WHERE tenant = ?`, [tenant]);
				
				
				var myTenant = "";
				if( r.rows[0] !== undefined && r.rows[0].tenant !== undefined ) {
					myTenant = r.rows[0].tenant;
				}
				
		
				
				if( myTenant.toLowerCase() == tenant.toLowerCase() && _tenant != tenant ){
					return response.status(200).send({"status": "error", "message": 'Errore già esiste un tenant con questo nome'})
				}
				
			    var result = await DB.raw(`UPDATE tenant SET tenant = ?, descrizione = ?, udd = ?, cc = ?  WHERE tenant = ?`, [tenant, descrizione, udd, cc, _tenant])
								
				result = await DB.raw(`ALTER SCHEMA ${_tenant} RENAME TO ${tenant};`)
										
			  
				return response.status(200).send({"status": "success","message": 'tenant modificato'})
			}
			else{
	
				return response.status(200).send({"status": "error", "message": 'Errore modifica tenant'})
			}
		  
		}
		catch(e){
			return response.send({"status": "success","data": [],"message": e.message})
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
  
  
  
	async createTablesForTenant(tenant){
	  
		const DB = Database.connection('rcu')
	  
		await DB.raw(`CREATE SCHEMA ${tenant} AUTHORIZATION postgres;`)
	  
		await DB.raw(`CREATE TABLE ${tenant}.ee_cc (
						id serial4 NOT NULL,
						"COD_POD" varchar(255) NULL,
						"AREA_RIF" varchar(255) NULL,
						"RAGIONE_SOCIALE_DISTR" varchar(255) NULL,
						"PIVA_DISTR" varchar(255) NULL,
						"DP" varchar(255) NULL,
						"RAGIONE_SOCIALE_UDD" varchar(255) NULL,
						"PIVA_UDD" varchar(255) NULL,
						"RAGIONE_SOCIALE_CC" varchar(255) NULL,
						"PIVA_CC" varchar(255) NULL,
						"TIPO_POD" varchar(255) NULL,
						"FINE_TIPO_POD" varchar(255) NULL,
						"DATA_INIZIO_FORNITURA" varchar(255) NULL,
						"DATA_FINE_FORNITURA" varchar(255) NULL,
						"DATA_INIZIO_DISPACCIAMENTO" varchar(255) NULL,
						"CF" varchar(255) NULL,
						"PIVA" varchar(255) NULL,
						"NOME" varchar(255) NULL,
						"COGNOME" varchar(255) NULL,
						"RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
						"RESIDENZA" varchar(255) NULL,
						"SERVIZIO_TUTELA" varchar(255) NULL,
						"TENSIONE" varchar(255) NULL,
						"DISALIMENTABILITA" varchar(255) NULL,
						"TARIFFA_DISTRIBUZIONE" varchar(255) NULL,
						"TIPO_MISURATORE" varchar(255) NULL,
						"POTCONTRIMP" varchar(255) NULL,
						"POTDISP" varchar(255) NULL,
						"CONSUMO_TOT" varchar(255) NULL DEFAULT '0'::character varying,
						"TRATTAMENTO" varchar(255) NULL,
						"TRATTAMENTO_SUCC" varchar(255) NULL,
						"REGIME_COMPENSAZIONE" varchar(255) NULL,
						"BF_DATA_INIZIO" varchar(255) NULL,
						"BF_DATA_FINE" varchar(255) NULL,
						"BF_DATA_RINNOVO" varchar(255) NULL,
						"BE_DATA_INIZIO" varchar(255) NULL,
						"BE_DATA_FINE" varchar(255) NULL,
						"BE_DATA_RINNOVO" varchar(255) NULL,
						"COMUNIC_BONUS" varchar(255) NULL,
						"K_TRASFOR_ATT" varchar(255) NULL,
						"MAT_MISURATORE_ATT" varchar(255) NULL,
						"PMA" varchar(255) NULL,
						"MESE" int4 NULL,
						"ANNO" int4 NULL,
						ee_cc_histories_id varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						"TIPO_MERCATO" varchar NULL,
						"DATA_DECORRENZA_RET" varchar NULL,
						"EMAIL_CLIENTE" varchar NULL,
						"TELEFONO_CLIENTE" varchar NULL,
						"COD_OFFERTA" varchar NULL,
						"AUTOCERTIFICAZIONE" varchar NULL,
						"DATA_MESSA_REGIME" varchar NULL,
						"MOTIVAZIONE" varchar NULL,
						"BE_ANNO_VALIDITA" varchar NULL,
						"BE_DATA_CESSAZIONE" varchar NULL,
						CONSTRAINT ee_cc_pkey PRIMARY KEY (id));`);
			
		
		await DB.raw(`CREATE TABLE ${tenant}.ee_cc_histories (
						id serial4 NOT NULL,
						mese int4 NULL,
						anno int4 NULL,
						importati int4 NULL,
						status varchar(255) NULL,
						note varchar(255) NOT NULL,
						"owner" varchar(255) NOT NULL,
						owner_ip varchar(255) NOT NULL,
						deleted bool NOT NULL DEFAULT false,
						delete_owner varchar(255) NULL,
						delete_owner_ip varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						CONSTRAINT ee_cc_histories_pkey PRIMARY KEY (id));`);
		
		
		await DB.raw(`CREATE TABLE ${tenant}.ee_udd (
						id serial4 NOT NULL,
						"COD_POD" varchar(255) NULL,
						"AREA_RIF" varchar(255) NULL,
						"RAGIONE_SOCIALE_DISTR" varchar(255) NULL,
						"PIVA_DISTR" varchar(255) NULL,
						"DP" varchar(255) NULL,
						"RAGIONE_SOCIALE_UDD" varchar(255) NULL,
						"PIVA_UDD" varchar(255) NULL,
						"RAGIONE_SOCIALE_CC" varchar(255) NULL,
						"PIVA_CC" varchar(255) NULL,
						"TIPO_POD" varchar(255) NULL,
						"FINE_TIPO_POD" varchar(255) NULL,
						"DATA_INIZIO_FORNITURA" varchar(255) NULL,
						"DATA_FINE_FORNITURA" varchar(255) NULL,
						"DATA_INIZIO_DISPACCIAMENTO" varchar(255) NULL,
						"CF" varchar(255) NULL,
						"PIVA" varchar(255) NULL,
						"NOME" varchar(255) NULL,
						"COGNOME" varchar(255) NULL,
						"RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
						"RESIDENZA" varchar(255) NULL,
						"SERVIZIO_TUTELA" varchar(255) NULL,
						"TENSIONE" varchar(255) NULL,
						"DISALIMENTABILITA" varchar(255) NULL,
						"TARIFFA_DISTRIBUZIONE" varchar(255) NULL,
						"TIPO_MISURATORE" varchar(255) NULL,
						"POTCONTRIMP" varchar(255) NULL,
						"POTDISP" varchar(255) NULL,
						"CONSUMO_TOT" varchar(255) NULL DEFAULT '0'::character varying,
						"TRATTAMENTO" varchar(255) NULL,
						"TRATTAMENTO_SUCC" varchar(255) NULL,
						"REGIME_COMPENSAZIONE" varchar(255) NULL,
						"BF_DATA_INIZIO" varchar(255) NULL,
						"BF_DATA_FINE" varchar(255) NULL,
						"BF_DATA_RINNOVO" varchar(255) NULL,
						"BE_DATA_INIZIO" varchar(255) NULL,
						"BE_DATA_FINE" varchar(255) NULL,
						"BE_DATA_RINNOVO" varchar(255) NULL,
						"COMUNIC_BONUS" varchar(255) NULL,
						"K_TRASFOR_ATT" varchar(255) NULL,
						"MAT_MISURATORE_ATT" varchar(255) NULL,
						"PMA" varchar(255) NULL,
						"MESE" int4 NULL,
						"ANNO" int4 NULL,
						ee_udd_histories_id varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						"TIPO_MERCATO" varchar NULL,
						"DATA_DECORRENZA_RET" varchar NULL,
						"EMAIL_CLIENTE" varchar NULL,
						"TELEFONO_CLIENTE" varchar NULL,
						"COD_OFFERTA" varchar NULL,
						"AUTOCERTIFICAZIONE" varchar NULL,
						"DATA_MESSA_REGIME" varchar NULL,
						"MOTIVAZIONE" varchar NULL,
						"BE_ANNO_VALIDITA" varchar NULL,
						"BE_DATA_CESSAZIONE" varchar NULL,
						CONSTRAINT ee_udd_pkey PRIMARY KEY (id));`);
	
	
		await DB.raw(`CREATE TABLE ${tenant}.ee_udd_histories (
						id serial4 NOT NULL,
						mese int4 NULL,
						anno int4 NULL,
						importati int4 NULL,
						status varchar(255) NULL,
						note varchar(255) NOT NULL,
						"owner" varchar(255) NOT NULL,
						owner_ip varchar(255) NOT NULL,
						deleted bool NOT NULL DEFAULT false,
						delete_owner varchar(255) NULL,
						delete_owner_ip varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						CONSTRAINT ee_udd_histories_pkey PRIMARY KEY (id));`);
				
				
				
		await DB.raw(`CREATE TABLE ${tenant}.gas_cc (
					id serial4 NOT NULL,
					"COD_PDR" varchar(255) NULL,
					"COD_REMI" varchar(255) NULL,
					"DISALIMENTABILITA" varchar(255) NULL,
					"DATA_INIZIO_FOR" varchar(255) NULL,
					"DATA_FINE_FOR" varchar(255) NULL,
					"RAGIONE_SOCIALE_UDD" varchar(255) NULL,
					"PIVA_UDD" varchar(255) NULL,
					"RAGIONE_SOCIALE_DD" varchar(255) NULL,
					"PIVA_DD" varchar(255) NULL,
					"CF" varchar(255) NULL,
					"PIVA" varchar(255) NULL,
					"NOME" varchar(255) NULL,
					"COGNOME" varchar(255) NULL,
					"RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
					"RESIDENZA" varchar(255) NULL,
					"ALIQUOTA_IVA" varchar(255) NULL,
					"ALIQUOTA_ACCISE" varchar(255) NULL,
					"ADDIZ_REGIONALE" varchar(255) NULL,
					"SETT_MERCEOLOGICO" varchar(255) NULL,
					"TRATTAMENTO" varchar(255) NULL,
					"PREL_ANNUO_PREV" varchar(255) NULL,
					"COD_PROF_PREL_STD" varchar(255) NULL,
					"MATR_MIS" varchar(255) NULL,
					"CLASSE_GRUPPO_MIS" varchar(255) NULL,
					"TELEGESTIONE" varchar(255) NULL,
					"PRE_CONV" varchar(255) NULL,
					"MATR_CONV" varchar(255) NULL,
					"N_CIFRE_CONV" varchar(255) NULL,
					"COEFF_CORR" varchar(255) NULL,
					"BONUS" varchar(255) NULL,
					"BS_DATA_INIZIO" varchar(255) NULL,
					"BS_DATA_FINE" varchar(255) NULL,
					"BS_DATA_RINNOVO" varchar(255) NULL,
					"MESE" int4 NULL,
					"ANNO" int4 NULL,
					gas_cc_histories_id varchar(255) NULL,
					created_at timestamptz(6) NULL,
					updated_at timestamptz(6) NULL,
					CONSTRAINT gas_cc_pkey PRIMARY KEY (id));`);
		
		await DB.raw(`CREATE TABLE ${tenant}.gas_cc_histories (
						id serial4 NOT NULL,
						mese int4 NULL,
						anno int4 NULL,
						importati int4 NULL,
						status varchar(255) NULL,
						note varchar(255) NOT NULL,
						"owner" varchar(255) NOT NULL,
						owner_ip varchar(255) NOT NULL,
						deleted bool NOT NULL DEFAULT false,
						delete_owner varchar(255) NULL,
						delete_owner_ip varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						CONSTRAINT gas_cc_histories_pkey PRIMARY KEY (id));`);
		
					
					
					
				await DB.raw(`CREATE TABLE ${tenant}.gas_udd (
				id serial4 NOT NULL,
				"COD_PDR" varchar(255) NULL,
				"COD_REMI" varchar(255) NULL,
				"DISALIMENTABILITA" varchar(255) NULL,
				"DATA_INIZIO_FOR" varchar(255) NULL,
				"DATA_FINE_FOR" varchar(255) NULL,
				"RAGIONE_SOCIALE_UDD" varchar(255) NULL,
				"PIVA_UDD" varchar(255) NULL,
				"RAGIONE_SOCIALE_DD" varchar(255) NULL,
				"PIVA_DD" varchar(255) NULL,
				"CF" varchar(255) NULL,
				"PIVA" varchar(255) NULL,
				"NOME" varchar(255) NULL,
				"COGNOME" varchar(255) NULL,
				"RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
				"RESIDENZA" varchar(255) NULL,
				"ALIQUOTA_IVA" varchar(255) NULL,
				"ALIQUOTA_ACCISE" varchar(255) NULL,
				"ADDIZ_REGIONALE" varchar(255) NULL,
				"SETT_MERCEOLOGICO" varchar(255) NULL,
				"TRATTAMENTO" varchar(255) NULL,
				"PREL_ANNUO_PREV" varchar(255) NULL,
				"COD_PROF_PREL_STD" varchar(255) NULL,
				"MATR_MIS" varchar(255) NULL,
				"CLASSE_GRUPPO_MIS" varchar(255) NULL,
				"TELEGESTIONE" varchar(255) NULL,
				"PRE_CONV" varchar(255) NULL,
				"MATR_CONV" varchar(255) NULL,
				"N_CIFRE_CONV" varchar(255) NULL,
				"COEFF_CORR" varchar(255) NULL,
				"BONUS" varchar(255) NULL,
				"BS_DATA_INIZIO" varchar(255) NULL,
				"BS_DATA_FINE" varchar(255) NULL,
				"BS_DATA_RINNOVO" varchar(255) NULL,
				"MESE" int4 NULL,
				"ANNO" int4 NULL,
				gas_udd_histories_id varchar(255) NULL,
				created_at timestamptz(6) NULL,
				updated_at timestamptz(6) NULL,
				"STATO_PDR" varchar(255) NULL,
				"TIPO_SOSP" varchar(255) NULL,
				"DATA_INIZIO_SOSP" varchar(255) NULL,
				"DATA_FINE_SOSP" varchar(255) NULL,
				"DATA_DECORRENZA_RET" varchar(255) NULL,
				"DATA_INIZIO_MAND" varchar(255) NULL,
				"DATA_FINE_MAND" varchar(255) NULL,
				"CF_STRANIERO" varchar(255) NULL,
				"EMAIL" varchar(255) NULL,
				"TELEFONO" varchar(255) NULL,
				"REFERENTE" varchar(255) NULL,
				"REF_NOME" varchar(255) NULL,
				"REF_COGNOME" varchar(255) NULL,
				"REF_EMAIL" varchar(255) NULL,
				"REF_TELEFONO" varchar(255) NULL,
				"DATA_VAL_RES" varchar(255) NULL,
				"AF_CF" varchar(255) NULL,
				"AF_PIVA" varchar(255) NULL,
				"AF_CF_STRANIERO" varchar(255) NULL,
				"AF_NOME" varchar(255) NULL,
				"AF_COGNOME" varchar(255) NULL,
				"AF_RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
				"ALTRE_INFORMAZIONI" varchar(255) NULL,
				"ACCESSO_UI" varchar(255) NULL,
				"TIPO_FORNITURA" varchar(255) NULL,
				"CODICE_CONTRATTO" varchar(255) NULL,
				"CODICE_UFFICIO" varchar(255) NULL,
				"PAGAMENTO_IVA" varchar(255) NULL,
				"CAT_USO" varchar(255) NULL,
				"ZONA_CLIMATICA" varchar(255) NULL,
				"CLASSE_PRELIEVO" varchar(255) NULL,
				"PRESENZA_DS" varchar(255) NULL,
				"ANNO_TERMICO" varchar(255) NULL,
				"TIPO_MIS" varchar(255) NULL,
				"ANNO_FABB_CONV" varchar(255) NULL,
				"DATA_INST_CONV" varchar(255) NULL,
				"PRESS_MISURA" varchar(255) NULL,
				"ACC_MIS" varchar(255) NULL,
				"N_CIFRE_MIS" varchar(255) NULL,
				"ANNO_FABB_MIS" varchar(255) NULL,
				"DATA_INST_MIS" varchar(255) NULL,
				"GRUPPO_MIS_INT" varchar(255) NULL,
				"POT_MAX_RIC" varchar(255) NULL,
				"POT_TOT_INST" varchar(255) NULL,
				"MAX_PRELIEVO_ORA" varchar(255) NULL,
				"BS_DATA_CESSAZIONE_BONUS" varchar(255) NULL,
				"BS_ANNO_VALIDITA" varchar(255) NULL,
				"BS_REGIME_COMPENSAZIONE" varchar(255) NULL,
				"EROG_SERVIZIO_ENERG" varchar(255) NULL,
				"SE_PIVA" varchar(255) NULL,
				"SE_CF" varchar(255) NULL,
				"SE_RAGIONE_SOCIALE_DENOMINAZIONE" varchar(255) NULL,
				"SE_TELEFONO" varchar(255) NULL,
				"SE_EMAIL" varchar(255) NULL,
				CONSTRAINT gas_udd_pkey PRIMARY KEY (id));`);
					
					
					
					
					
					
					
					
					
					
		
		await DB.raw(`CREATE TABLE ${tenant}.gas_udd_histories (
						id serial4 NOT NULL,
						mese int4 NULL,
						anno int4 NULL,
						importati int4 NULL,
						status varchar(255) NULL,
						note varchar(255) NOT NULL,
						"owner" varchar(255) NOT NULL,
						owner_ip varchar(255) NOT NULL,
						deleted bool NOT NULL DEFAULT false,
						delete_owner varchar(255) NULL,
						delete_owner_ip varchar(255) NULL,
						created_at timestamptz(6) NULL,
						updated_at timestamptz(6) NULL,
						CONSTRAINT gas_udd_histories_pkey PRIMARY KEY (id));`);
						
						
						
						
		await DB.raw(`CREATE TABLE ${tenant}.cont_energia_edistribuzione (
				pod varchar NULL,
				eneltel varchar NULL,
				stato varchar(50) NULL,
				tensione varchar NULL,
				potenza varchar NULL,
				potenza_disponibile varchar NULL,
				misuratore varchar(50) NULL,
				misuratore_elettronico varchar(45) NULL,
				toponimo varchar(50) NULL,
				indirizzo varchar(300) NULL,
				civico varchar(20) NULL,
				provincia varchar(100) NULL,
				cap varchar NULL,
				distributore varchar(100) NULL,
				localita varchar(150) NULL,
				pivot varchar(150) NOT NULL DEFAULT ''::character varying);`);
				
		await DB.raw(`CREATE TABLE ${tenant}.cont_gas_2iretegas (
				pdr varchar(14) NULL,
				misuratore varchar(30) NULL,
				classe varchar(10) NULL,
				potenza varchar(10) NULL,
				stato varchar(30) NULL,
				localita varchar(150) NULL,
				toponimo varchar(30) NULL,
				indirizzo varchar(300) NULL,
				civico varchar(10) NULL,
				provincia varchar(100) NULL,
				cap varchar(10) NULL,
				attivazione varchar(2) NULL,
				distributore varchar(100) NULL,
				pivot varchar(150) NOT NULL DEFAULT ''::character varying);`);
				
		await DB.raw(`CREATE TABLE ${tenant}.cont_gas_italgas (
			pdr varchar(14) NULL,
			misuratore varchar(200) NULL,
			classe varchar(10) NULL,
			potenza varchar(10) NULL,
			stato varchar(100) NULL,
			localita varchar(150) NULL,
			toponimo varchar(100) NULL,
			indirizzo varchar(300) NULL,
			civico varchar(10) NULL,
			provincia varchar(100) NULL,
			cap varchar(10) NULL,
			attivazione varchar(2) NULL,
			distributore varchar(100) NULL,
			pivot varchar(150) NOT NULL DEFAULT ''::character varying);`);
			
			
			await DB.raw(`CREATE TABLE ${tenant}.cont_imports (
				id SERIAL,
				"data" timestamp NULL DEFAULT now(),
				stato varchar(50) NULL DEFAULT 'aperto'::character varying,
				distributore varchar(50) NULL,
				righe_importate int8 NULL,
				template_id int4 NULL,
				filename varchar(300) NULL,
				commodity varchar(20) NULL,
				pivot varchar(100) NULL,
				righe_file int8 NULL);`);
				
			await DB.raw(`CREATE TABLE ${tenant}.cont_logs (
			"data" timestamp NULL DEFAULT now(),
			operazione varchar(50) NULL,
			parametri text NULL,
			profilo varchar NULL,
			username varchar(150) NULL);`);
										
						
						
			
			await DB.raw(`CREATE TABLE ${tenant}.cont_template_mapping (
							template_id int4 NULL,
				indice_campo_file int2 NULL,
				colonna_db varchar(50) NULL,
				etichetta varchar(100) NULL,
				formato_campo varchar(150) NULL,
				etichetta_campo_file varchar(200) NULL,
				pivot bool NOT NULL DEFAULT false);`);			
						
						
			await DB.raw(`CREATE TABLE ${tenant}.cont_templates (
					id serial4 NOT NULL,
			nome varchar(100) NOT NULL,
			commodity varchar(10) NOT NULL,
			distributore varchar(200) NOT NULL,
			CONSTRAINT templates_pkey PRIMARY KEY (id));`);
			
			
			
			
			
			await DB.raw(`INSERT INTO ${tenant}.cont_template_mapping (template_id,indice_campo_file,colonna_db,etichetta,formato_campo,etichetta_campo_file,pivot) VALUES
	 (2,0,'pdr','PDR','string','PDR',false),
	 (2,1,'misuratore','Misuratore','string','MISURATORE',false),
	 (2,12,'indirizzo','Indirizzo','string','INDIRIZZO',false),
	 (2,15,'attivazione','Attivazione','string','IN ATTESA DI ATTIVAZIONE',false),
	 (2,13,'civico','Civico','string','CIVICO',false),
	 (1,0,'pdr','PDR','string','Punto di Riconsegna Distributore (PDR)',false),
	 (1,2,'classe','Classe','string','Classe contatore',false),
	 (1,1,'misuratore','Misuratore','string','Misuratore',false),
	 (1,5,'toponimo','Toponimo','string','Toponimo',false),
	 (1,6,'indirizzo','Indirizzo','string','Indirizzo',false);`);
	 
	 
	 
	 await DB.raw(`INSERT INTO ${tenant}.cont_template_mapping (template_id,indice_campo_file,colonna_db,etichetta,formato_campo,etichetta_campo_file,pivot) VALUES
	 (1,7,'civico','Civico','string','Civico',false),
	 (1,14,'provincia','Provincia','string','Provincia',false),
	 (1,11,'cap','Cap','string','CAP',false),
	 (3,2,'pod','Pod','string','COD_POD',false),
	 (3,4,'eneltel','Eneltel','string','ENELTEL',false),
	 (3,5,'stato','Stato','string','STATO_POD',false),
	 (3,6,'tensione','Tensione','string','TENSIONE_FASE',false),
	 (3,7,'potenza','Potenza','string','POT_FRANCHIGIA',false),
	 (3,7,'potenza','Potenza','string','POT_FRANCHIGIA',false),
	 (3,8,'potenza_disponibile','Potenza Disponibile','string','ULTIMA_POTENZA_DISPONIBILE',false);`);
	 
	 
	 
	await DB.raw(`INSERT INTO ${tenant}.cont_template_mapping (template_id,indice_campo_file,colonna_db,etichetta,formato_campo,etichetta_campo_file,pivot) VALUES
	 (3,9,'misuratore_elettronico','Misuratore Elettronico','string','MISURATORE_ELETTRONICO',false),
	 (3,10,'misuratore','Misuratore','string','MATR_MIS_ATTIVA',false),
	 (3,14,'toponimo','Toponimo','string','TOPONIMO',false),
	 (3,15,'indirizzo','Indirizzo','string','VIA',false),
	 (3,16,'civico','Civico','string','CIV',false),
	 (3,17,'cap','CAP','string','CAP',false),
	 (3,18,'localita','Localita','string','LOCALITA',false),
	 (2,8,'localita','Localita','string','DESCRIZIONE CONCESSIONE',true),
	 (1,12,'localita','Localita','string','Comune',true),
	 (3,19,'provincia','Provincia','string','PROV',true);`);
	 
	 
	 
	 
	 await DB.raw(`INSERT INTO ${tenant}.cont_template_mapping (template_id,indice_campo_file,colonna_db,etichetta,formato_campo,etichetta_campo_file,pivot) VALUES
	 (4,0,'pdr','PDR','string','PDR',false),
	 (4,1,'misuratore','Misuratore','string','MISURATORE',false),
	 (4,8,'localita','Localita','string','DESCRIZIONE CONCESSIONE',true),
	 (4,12,'indirizzo','Indirizzo','string','INDIRIZZO',false),
	 (4,15,'attivazione','Attivazione','string','IN ATTESA DI ATTIVAZIONE',false),
	 (4,13,'civico','Civico','string','CIVICO',false),
	 (2,2,'stato','Stato','string','STATO FORNITURA',false),
	 (2,7,'attivazione','Attivazione','string','IN ATTESA ATTIVAZIONE',false),
	 (1,3,'potenza','Poternza','string','Potenzialita',false),
	 (1,NULL,'stato','Stato','string','Stato',false);`);
 
	
	
	await DB.raw(`INSERT INTO ${tenant}.cont_templates (nome,commodity,distributore) VALUES
	 	 ('ITALGAS STANDARD','gas','italgas'),
	 ('2IRETEGAS STANDARD','gas','2iretegas'),
	 ('ENERGIA STANDARD','energia','edistribuzione'),
	 ('2IRETEGAS STANDARD','gas','2iretegas_demo');`);


						
	
						
			
	}
  
}

module.exports = AuthController
