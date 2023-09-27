"use strict";
const Helpers = use("Helpers");
const fs = require("fs").promises;
const fsExtra = require("fs");
const moment = require("moment");
const Flow = use("App/Models/Flow");
const FlowDetails = use("App/Models/FlowDetails");
const Env = use("Env");
const Mail = use("Mail");
const Redis = use("Redis");

class PdfCreatorController {
  //PDF Route
  async getPermissionRoute({ response, request }) {
    return response.send({
      status: "success",
      data: { key_code: request.header("Secret-Key") },
      message: "Accesso effettuato correttamente"
    });
  }

  async getItemFolders({ response, request }) {
    try {
      var basePath = Env.get("PDF_PATH_XML");
      var { path, showAll } = request.all();
      if (!showAll) showAll = "false";
      if (!path) path = "";
      if (path) basePath = basePath + path;
      var xmlFolderZip = await fs.readdir(basePath, { withFileTypes: true });
      var finalResponse = [];
      xmlFolderZip.forEach(file => {
        var size = fsExtra.statSync(basePath + "/" + file.name).size;
        if (size != 0) {
          let i = Math.floor(Math.log(size) / Math.log(1024));
          size =
            (size / Math.pow(1024, i)).toFixed(2) * 1 +
            " " +
            ["B", "KB", "MB", "GB", "TB"][i];
        } else size = null;
        const date = moment(
          fsExtra.statSync(basePath + "/" + file.name).mtime.getTime()
        ).format("DD/MM/YYYY HH:mm");
        const timestamp_date = fsExtra
          .statSync(basePath + "/" + file.name)
          .mtime.getTime();
        const finalObject = {
          name: file.name,
          path,
          size,
          date,
          timestamp_date,
          isDirectory: file.isDirectory()
        };
        if (file.isDirectory()) finalResponse.push(finalObject);
        else if (showAll && showAll == "false" && file.name.endsWith(".zip"))
          finalResponse.push(finalObject);
        else if (showAll && showAll == "true") finalResponse.push(finalObject);
      });
      finalResponse = finalResponse.sort((a, b) => {
        return moment.utc(b.timestamp_date).diff(moment.utc(a.timestamp_date));
      });
      return response.send({
        status: "success",
        data: finalResponse,
        message: null
      });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async getFlowsHistory({ response, request }) {
    const page = request.input("page", 1);
    const rowsPerPage = request.input("perPage", 99999999);
    const sortBy = request.input("sortBy", "flows.created_at");
    const order = request.input("order", "desc");
    const search = request.input("search", ""); 
    try {
      var flows = Flow.query()
      .orderBy(sortBy, order)
        .with("files")
        .with("logs",(inner)=>{
          inner.where('type' === 'error')
        })
        .with("details",(inner) =>{
          inner.select(['tenant_code','flow_code']).groupBy('tenant_code','flow_code')
        })
        if(search) {
          flows.where('code','ilike',`%${search}%`)
          flows.orWhereHas('details',(inner)=>{
            inner.where('tenant_code','ilike',`%${search}%`)
          })
          flows.orWhereHas('files',(inner)=>{
            inner.where('file_name','ilike',`%${search}%`)
          })
        }
        flows = await flows.paginate(page, rowsPerPage);
        flows = flows.toJSON();
      return response.send({ status: "success", data: flows, message: null });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async getFlowDetail({ response, params }) {
    try {
      var flows = await Flow.query()
        .where("code", params.code)
        .orderBy("created_at", "desc")
        .with("files")
        .with("logs")
        .with("details",(inner) =>{
          inner.orderBy('created_at','asc')
        })
        .first();
      flows = flows.toJSON();
      flows.logs_in_error = false;
      flows.logs.forEach(element => {
        if (element.type === "error") flows.logs_in_error = true;
      });
      return response.send({ status: "success", data: flows, message: null });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async getDetailFlow({ response, params }) {
    try {
      var flows = await FlowDetails.query()
        .where("flow_code", params.code)
        .orderBy("created_at", "desc")
        .first();
      flows = flows.toJSON();
      flows.logs_in_error = false;
      flows.logs.forEach(element => {
        if (element.type === "error") flows.logs_in_error = true;
      });
      return response.send({ status: "success", data: flows, message: null });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async statusEmail({ response, params }) {
    try {
      const stato_email = await Redis.get("flow_status_email");
      if (stato_email) {
        return JSON.parse(stato_email);
      } else return {};
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async converterBack(str){
   let res = '';
   for(let i = 0; i < str.length; i++){
      if(str[i] !== '\\'){
        res += str[i];
        continue;
    };
    res += '/'
   };
   return res;
  }

  async sendEmail({ response, request }) {
    try {
      const id = request.input("id", null);
      const email = request.input("email", null);
      const flow_code = request.input("flow_code");
      const tenant = request.input("tenant");
      var query = FlowDetails.query()
        .with("Tenant")
        .where("flow_code", flow_code)
        .where("tenant_code", tenant);
      if (id) {
        query.where("id", id)
        .whereNotNull("email")
        .where(inner => {
          inner.where(inside => {
            inside.where("modalita_invio_id",'<>', 1).where("invio_email", false);
          });
          inner.orWhereNotNull("errore_email");
        });
        
        query = await query.first();
      } else {
        query
          .where("modalita_invio_id",'<>', 1)
          .where("invio_email", false)
          .whereNull("errore_email")
          .whereNotNull("email");
        query = await query.fetch();
      }
      query = query.toJSON();
      if (id) {
        const item = await FlowDetails.find(query.id);
        try {
          query.data_emissione = moment(query.data_emissione).format(
            "DD/MM/YYYY"

          );
          var fromEmail = query.Tenant.mittente_email
          const nome_file = Env.get("TERRANOVA_FATTURE") +await this.converterBack(query.pdf_folder) + query.pdf_name
          await Mail.send("fatture", { ...query },async message => {
            message
              .to(email)
              .from(fromEmail)
              .subject(
                "La tua bolletta N. " + query.numero_bolletta + " è disponibile"
              )
              .embed(
                Helpers.publicPath("/loghi/" + query.tenant_code + "/logo.png"),
                "logo"
              )
              .attach(
                nome_file,
                {
                  filename: query.numero_bolletta + ".pdf"
                }
              );
          });
          item.merge({ invio_email: true, errore_email: null, email: email });
          await item.save();
        } catch (error) {
          item.merge({
            errore_email:
              error && error.response
                ? error.response
                : "Errore durante l'invio"
          });
          await item.save();
          throw error;
        }
      } else {
        await Redis.set(
          "flow_status_email",
          JSON.stringify({ tenant, flow_code })
        );
        for (let i in query) {
          const item = await FlowDetails.find(query[i].id);
          query[i].data_emissione = moment(query[i].data_emissione).format(
            "DD/MM/YYYY"
          );
          try {
            var fromEmail = query[i].Tenant.mittente_email
            const nome_file = Env.get("TERRANOVA_FATTURE") +await this.converterBack(query[i].pdf_folder) + query[i].pdf_name
            await Mail.send("fatture", { ...query[i] }, async message => {
              message
                .to(query[i].email)
                .from(fromEmail)
                .subject(
                  "La tua bolletta N. " +
                    query[i].numero_bolletta +
                    " è disponibile"
                )
                .embed(
                  Helpers.publicPath(
                    "/loghi/" + query[i].tenant_code + "/logo.png"
                  ),
                  "logo"
                )
                .attach(
                  nome_file,
                    {
                      filename: query[i].numero_bolletta + ".pdf"
                    }
                );
            });
            item.merge({ invio_email: true, errore_email: null });
            await item.save();
          } catch (error) {
            item.merge({
              errore_email:
                error && error.response
                  ? error.response
                  : "Errore durante l'invio"
            });
            await item.save();
            console.log("err", error);
          }
        }
        await Redis.set("flow_status_email", JSON.stringify({}));
      }
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async getFlowsStatus({ response, request }) {
    try {
      const flows = await Flow.query()
        .where("status", "=", "in lavorazione")
        .with("files")
        .fetch();
      if (flows.toJSON().length > 0)
        return response.send({
          status: "success",
          data: { status: "in lavorazione" },
          message: null
        });
      else
        return response.send({
          status: "success",
          data: { status: "completato" },
          message: null
        });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }

  async getLogFlow({ request, response }) {
    try {
      const code = request.input("code", null);
      if (code) {
        var logs = fsExtra
          .readFileSync(
            Env.get("PDF_PATH_HISTORY") + "/" + "flusso_" + code + ".log"
          )
          .toString()
          .split("\n");
        return response.send({
          status: "success",
          data: logs,
          message: `Ritorno log flusso`
        });
      } else
        return response
          .status(400)
          .send({
            status: "BAD_REQUEST",
            message: "La richiesta non è completa"
          });
    } catch (error) {
      return response
        .status(500)
        .send({
          status: "error",
          code: 500,
          data: null,
          message: error.message
        });
    }
  }
}

module.exports = PdfCreatorController;
