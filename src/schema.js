const {createGraphQLSchema} = require('openapi-to-graphql');
const path = require("path");
const fs = require("fs").promises;
const got = require('got');
const promiseAny = require('promise-any');
const logger = require('pino')({useLevelLabels: true});


exports.createSchema = async (oas, kubeApiUrl, token) => {
    return await oasToGraphQlSchema(oas, kubeApiUrl, token)
};

exports.getSchemaFromFile = async (filePath) => {
    if (!filePath) {
        filePath = "swagger.json";
    }
    let openAPISchema = await readFile(path.resolve(filePath));
    openAPISchema = fixConsumes(openAPISchema);
    return openAPISchema;
}

exports.getSchemaFromAPI = async (kubeAPIUrl, token) => {
    const openAPISchema = await getOpenAPISpecFromURL(kubeAPIUrl, token);
    return fixConsumes(openAPISchema);
}

async function oasToGraphQlSchema(oas, kubeApiUrl, token) {
    if (token) {
        const {schema} = await createGraphQLSchema(oas, {
            baseUrl: kubeApiUrl,
            viewer: false,
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
        });
        return schema;
    }
    else {
        const {schema} = await createGraphQLSchema(oas, {
            baseUrl: kubeApiUrl,
            viewer: false,
            tokenJSONpath: "$.token"
        });
        return schema;
    }
}

async function readFile(path) {
    if (/json$/.test(path)) {
      return JSON.parse(await fs.readFile(path, 'utf8'))
    } else {
      throw new Error(
        `Failed to parse JSON. Ensure file '${path}' has the correct extension ('.json').`
      )
    }
  }

// Open API spec may have ambiguous `consumes` types, we better to remove them at all
function fixConsumes(openAPISchema) {
    Object.keys(openAPISchema).forEach(function (key) {
        if (typeof openAPISchema[key] === 'object') {
            if (key === "consumes" && Array.isArray(openAPISchema[key]) && !openAPISchema[key].includes("application/json")) {
              delete openAPISchema[key];
            } else {
              return fixConsumes(openAPISchema[key]);
            }
        }
    });
    return openAPISchema;
}

// Execute parallel requests to possible open api endpoints and return first success
async function getOpenAPISpecFromURL(url, token) {
    const openApiPaths = ['/openapi/v2', '/swagger.json'];
    let gotProms = [];
    for (let p of openApiPaths) {
        const gotProm = got(p, {
            baseUrl: url,
            json: true,
            timeout: 5 * 1000,
            headers: {Authorization: `Bearer ${token}`},
        }).then(r => {
            logger.info({url, path: p}, "successfully retrieved open api spec from this path")
            return r.body
        }).catch(err => {
            logger.info({cause: err.message, url, path: p}, "failed to retrieve open api spec from this path - will try another")
            throw err
        });
        gotProms.push(gotProm)
    }
    return promiseAny(gotProms);
};
