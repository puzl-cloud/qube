# qube

qube is a GraphQL API provider for your Kubernetes cluster. It's working as a separate proxy above native Kubernetes API.

GraphQL schema is dynamically built from the openapi/swagger API specification exposed by the Kubernetes cluster. Demo 

## What GraphQL primitives are working now

* [x] Queries
* [x] Mutations
* [ ] Subscriptions

## Authorization

qube supports the `Bearer` token auth flow as Kubernetes API. Set `Authorization` header with your Kubernetes account token to pass the request.

## Running

### Requirements

node > 10

### Run

`npm start`

Navigate to http://localhost:49020/ in your browser - this will launch the GraphQL Playground which you can use to interact with API.

### Environment variables (settings)

`NODE_ENV` - `string`, set to `production` to mute stacktrace proxying to a client, see more [here](https://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production)

`IN_CLUSTER`- `bool`, set to `false` if you run outside of Kubernetes cluster

`KUBERNETES_HOST` - `string`, path to Kubernetes cluster API, use with `IN_CLUSTER=false`

`API_SCHEMA_FILE_PATH` - `string`, set path to `swagger.json`, if you run qube outside of Kubernetes cluster and do not want provide it with any `KUBE_SCHEMA_TOKEN`

`KUBE_SCHEMA_TOKEN` - `string`, a token from account, which will be used to request OpenAPI schema of Kubernetes cluster, use with `IN_CLUSTER=false` and without `API_SCHEMA_FILE_PATH`

`USE_JWT_AUTH` - `bool`, set to `false` if you do not want to proxify client `Authorization` header to Kubernetes

> **Notice:** In case of `USE_JWT_AUTH=false` default token (or `KUBE_SCHEMA_TOKEN`) will be used for all user requests, which can be unsecure.
