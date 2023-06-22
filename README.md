https://stateful.com/blog/oauth-refresh-token-best-practices
https://www.bezkoder.com/jwt-refresh-token-node-js/

TODO https://stackoverflow.com/questions/27726066/jwt-refresh-token-flow
--> https://github.com/bezkoder/node-js-jwt-authentication-postgresql

RULE OF THUMB:
if queries that use fastify.pg.connect are stuck (pending), then probably because
some queries did not release their connection, therefore the pool being stuck at max
