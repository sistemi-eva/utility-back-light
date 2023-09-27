'use strict'

const XLSX = require('xlsx');
const Excel = require('exceljs');
const Token = use('App/Models/Token')

const Database = use('Database')
const moment = require("moment")
const nodemailer = require('nodemailer');
const fs = require('fs');
const Env = use('Env')

class InvioMassivoEmailController {
    async parseXlsFile({ request, response }){
      const xlsx_file = await request.file('xlsx_file')
	  
	  const fileData = await this.my_xlsToJson(xlsx_file.tmpPath)

	 if(fileData.length == 0) {
        return response.status(200).send({
          status: 'noData',
          message: 'Nessun dato da valutare',
          data: fileData,
        })
      }
	  
	  return response.status(200).send({
          status: 'noData',
          message: 'Destinatari caricati correttamente',
          data: fileData,
        })
	  
    
	
	}
	
	async invia({ request, response }){
		
		const key_code = request.header('Secret-Key')
		var results = await Token.query().where('token','=',key_code).fetch()
		results = results.toJSON()
		
		var username = results[0].username;
	
		var { oggetto, messaggio, destinatari, attach, template_id, filename_dest, variabili } = request.all()
		
	
		attach = JSON.parse(attach)

		destinatari = JSON.parse(destinatari)
		variabili = JSON.parse(variabili);

		
		
		var attachments = []
		
		for(var i in attach){
			var a =  attach[i];
			
			var path = request.file(attach[i]).tmpPath;

			
			var last = path.substring(path.lastIndexOf("\\") + 1, path.length);
			
			
			var newpath = path.replace(last, request.file(attach[i]).clientName);
			
			await this.myrenameFile(path, newpath);
			

			var obj = {"fileName": a, "path": newpath, "filename"  : request.file(attach[i]).clientName };
			attachments.push( obj )
		}
		
		
		
		var emailSentStatus = []
		
		var dest_length = destinatari.length;
		
		const DB = Database.connection('emailmassivo')
			
			
			var result = await DB.raw(`SELECT id_invio FROM mail_inviate ORDER BY id DESC LIMIT 1`)
			
			if( result[0][0] !== undefined ){
				var last_id = parseInt(result[0][0].id_invio) + 1 ;
			}
			else{
				var last_id = 1;
			}
			
			
		
		if(template_id !== undefined ){
			await DB.raw(`INSERT INTO mail_log (id_invio, template_id, filename, username, totale_mail, mail_lette, oggetto, data) VALUES ( ${last_id}, '${template_id}', '${filename_dest}', '${username}', '${dest_length}', 0, '${oggetto}', now())`)
		}
		else{
			await DB.raw(`INSERT INTO mail_log (id_invio, filename, username, totale_mail, mail_lette, body, oggetto, data) VALUES ( ${last_id}, '${filename_dest}', '${username}', '${dest_length}', 0, '${messaggio}', '${oggetto}', now())`)
		}
			
		for(var i in destinatari){
			var dest = destinatari[i];
			
			var my_message = messaggio;
			
			for(var i in variabili){
				var variabile = variabili[i];
				var varname = variabile;
				varname = varname.replace("{{", "");
				varname = varname.replace("}}", "");
				
				my_message = my_message.replace(variabile, dest[varname])
				
			}
		
			
			await DB.raw(`INSERT INTO mail_inviate (id_invio, mail, letto) VALUES ( '${last_id}', '${dest.email}', 0)`)
			
			
			var usr_email_tracker = "<img src='https://checkmail.evaenergyservice.it/?id=" + last_id + "&email=" + dest.email + "' />";
			
			//var usr_email_tracker = "<style>@font-face { font-family: myFirstFont; src: url(http://localhost/img_track_email/?id=" + last_id + "&email=" + dest.email + ");}</style>";
			
			var mailOptions = {
			  from: 'no-reply@evaenergyservice.it',
			  to: dest.email,
			  subject: oggetto,
			  html: my_message + usr_email_tracker,
			  attachments: attachments
			};

	
			var stato = await this.wrapedSendMail(mailOptions);
			emailSentStatus.push(stato);
			
			await this.sleep(2000)

	
					
		}
		
		return response.status(200).send({
          status: 'noData',
          message: 'Email processate correttamente',
          data: emailSentStatus
        })
		
	}
	
	
	async getLogs({ request, response }){
		
		const DB = Database.connection('emailmassivo')
		
		
		try{
			
			var result = await DB.raw(`SELECT *, DATE_FORMAT(data, "%d-%m-%Y %H:%i:%S") as data FROM mail_log as L LEFT JOIN mail_template as M ON L.template_id = M.template_id ORDER BY id DESC`)
				return response.status(200).send({
				  message: 'Logs',
				  data: result[0]
				})
			  
		

		} catch(e){
			return response.status(200).send({
			  status: 'noData',
			  message: e.message,
			  data: []
			})
		}
		
		
	}
	
	
	async getLogDetails({ request, response }){
		var { id_invio } = request.all()
		const DB = Database.connection('emailmassivo')
		
		
		try{
			
			var result = await DB.raw(`SELECT * FROM mail_inviate WHERE id_invio = '${id_invio}' `)
				return response.status(200).send({
				  message: 'Logs',
				  data: result[0]
				})
			  
		

		} catch(e){
			return response.status(200).send({
			  status: 'noData',
			  message: e.message,
			  data: []
			})
		}
		
		
	}
	
	
	async wrapedSendMail(mailOptions){
		

		return new Promise((resolve,reject)=>{
			let transporter = nodemailer.createTransport({//settings});
			 host: Env.get('EMAILMASSIVO_HOST'),
			  port: Env.get('EMAILMASSIVO_PORT'),
			  secure: false, // upgrade later with STARTTLS
			
			})

			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					console.log("error is "+error);
				   resolve("ko"); // or use rejcet(false) but then you will have to handle errors
				} 
			   else {
				   console.log('Email sent: ' + info.response);
				   resolve("ok");
				}
			  
	   
			})
			
			 
			
		})
	}
	
	
	async getTemplates({request, response}){
		const DB = Database.connection('emailmassivo')
		
		try{
			
			var result = await DB.raw(`SELECT * FROM mail_template`)
				return response.status(200).send({
				  message: 'Templates',
				  data: result[0]
				})
			  
		

		} catch(e){
			return response.status(200).send({
			  status: 'noData',
			  message: e.message,
			  data: []
			})
		}
	}
	
	
	async salvaModello({request, response}){
		
		var { nome, messaggio, id } = request.all()
		const DB = Database.connection('emailmassivo')
		messaggio = messaggio.replace(/'/g, "''");
		
		try{
			if( id === undefined ){
				var result = await DB.raw(`INSERT INTO mail_template (template_name, template_html) values ('${nome}', '${messaggio}') `)
				return response.status(200).send({
				  message: 'Salvataggio completato',
				})
				
			}
			else{
				var result = await DB.raw(`UPDATE mail_template SET template_name = '${nome}', template_html = '${messaggio}' WHERE template_id = '${id}' `)
				return response.status(200).send({
				  message: 'Salvataggio completato',
				})
				
				
			}
		
			  
		

		} catch(e){
			return response.status(200).send({
			  status: 'noData',
			  message: e.message,
			})
		}
	}
	
	
	async eliminaModello({request, response}){
		
		var { id } = request.all()
		const DB = Database.connection('emailmassivo')
		
		try{

		
			var result = await DB.raw(`DELETE FROM mail_template WHERE template_id = '${id}'`)
			return response.status(200).send({
			  message: 'Salvataggio completato',
			})
			
				
		
		
			  
		

		} catch(e){
			return response.status(200).send({
			  status: 'noData',
			  message: e.message,
			})
		}
	}
	
	
	
	async myrenameFile(path1, path2){
		return new Promise((resolve,reject)=>{
			
			fs.rename( path1, path2, () => {
			  
			  resolve(path2);
			
			});
		})
	}
	
	
	async _xlsToJson(filePath){
      var data = [];
      try {
        var workbook = await XLSX.readFile(filePath);
        var sheet_name_list = workbook.SheetNames;
        sheet_name_list.forEach(function(y) {
          var worksheet = workbook.Sheets[y];
          var headers = {};
          var index = 0;
          for(let z in worksheet) {
              if(z[0] === '!') continue;
              //parse out the column, row, and value
              var col = z.replace(/[0-9]/g, '')
              var row = parseInt(z.replace(/\D/g,''))
              var value = worksheet[z].v;
              //store header names
              if(row == 1) {
                  headers[col] = value;
                  continue;
              }
              if(!data[row]) data[row]={};
              data[row][headers[col]] = value;
          }
          //drop those first two rows which are empty
          data.shift();
          data.shift();
        });
      } catch (error) {
        console.log(error)
        return []
      }
      return data;
  }
  
  
  async my_xlsToJson(filePath){
		var data = []
		try{
			var workbook = new Excel.Workbook();
			
			
		
			  await workbook.xlsx.readFile(filePath).then( async function(){
				var workSheet = await workbook.getWorksheet(1); 
					
				var headers = {}
				for (var i = 1; i <= workSheet.actualRowCount; i++) {
					var row = [];
					for (var j = 1; j <= workSheet.actualColumnCount; j++) {
					  var value = workSheet.getRow(i).getCell(j).toString();
						if(i == 1) {
						  headers[j] = value;
						}
						else{
							if(!data[i]) data[i]={};
							data[i][headers[j]] = value;
						}
					}
					
				}
			

			})
			//drop those first two rows which are empty
			data.shift();
			data.shift();
			return data
	
		}
		catch (error) {
        console.log(error)
        return []
		}
	   return data
	  
			
	}
	
	async sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

}

module.exports = InvioMassivoEmailController
