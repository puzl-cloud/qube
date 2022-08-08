const fs = require("fs").promises;
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const compression = require('compression');
const {createSchema} = require('./schema');
const {getSchemaFromFile} = require('./schema');
const {getSchemaFromAPI} = require('./schema');
const { printSchema } = require('graphql');
const logger = require('pino')({useLevelLabels: true});

main().catch(e => logger.error({error: e.stack}, "failed to start qube"));

async function main() {
    const inCluster = process.env.IN_CLUSTER !== 'false';
    logger.info({inCluster}, "cluster mode configured");
    const kubeApiUrl = inCluster ? 'https://kubernetes.default.svc' : process.env.KUBERNETES_HOST;
    const token = `Bearer ${inCluster ? await fs.readFile('/var/run/secrets/kubernetes.io/serviceaccount/token', 'utf8') : process.env.KUBE_SCHEMA_TOKEN}`;
    const LISTEN_PORT = process.env.LISTEN_PORT || 49020;

    let oas;
    if (process.env.API_SCHEMA_FILE_PATH) {
        oas = await getSchemaFromFile(process.env.API_SCHEMA_FILE_PATH);
    } else {
        oas = await getSchemaFromAPI(kubeApiUrl, token);
    }

    useJWTauth = process.env.USE_JWT_AUTH !== 'false';
    let schema = null;
    let server = null;
    if (useJWTauth) {
        logger.info("Generating GraphQL schema to use user JWT from context...")
        schema = await createSchema(oas, kubeApiUrl);
        server = new ApolloServer({
            schema,
            context: ({ req }) => {
                if(req.headers.authorization.length > 0) {
                    const strs = req.headers.authorization.split(' ');
                    var user = {};
                    user.token = strs[0];
                    return user;
                }
            }
        });
    } else {
        logger.warn("Generating GraphQL schema with default serviceaccount token... All GraphQL requests will be processed from this account!")
        schema = await createSchema(oas, kubeApiUrl, token);
        server = new ApolloServer({schema});
    } 

    const app = express();
    app.use(compression());
    app.get('/schema', (req, res) => {
        res.setHeader('content-type', 'text/plain');
        res.send(printSchema(schema))
    });
    app.get('/health', (req, res) => {
        res.setHeader('content-type', 'application/json');
        res.json({ healthy: true })
    });
    server.applyMiddleware({
        app,
        path: '/'
    });
    app.listen(LISTEN_PORT, () =>
        logger.info({url: `http://0.0.0.0:${LISTEN_PORT}${server.graphqlPath}`}, 'Server is up and running')
    );
}
