/**
 * Bulk request controller tests
 */

const RDataServer = require('../lib/server');
const JsonRpc = require('../lib/json-rpc');
const errors = JsonRpc.JsonRpcErrors;
const helper = require('./helper');
const WebSocket = require('ws');
const assert = require('assert');
const mocha = require('mocha');

const jsonRpcVersion = helper.jsonRpcVersion;
const dbUrl = helper.dbUrl;

describe('RDataBulkRequest', function() {
    it('should execute multiple requests from bulk request', function(done){

        // Since bulk request doesn't return any responses from the actual requests,
        // Let's use local variable in this test to check if all requests were successfully executed
        var testCounter = 0;
        var testMethod = function(client, params, callback) {
            testCounter++;
            callback(null, true);
        };

        var server = new RDataServer({ port: ++helper.port, dbUrl: dbUrl, exposed: {'test': testMethod }});
        var bulkRequestId = "GUIDBULKREQUEST123";
        var requests = [
            {
                "jsonrpc": jsonRpcVersion,
                "method": "test",
                "id": "GUID001",
                "params": {
                    "testParam": 1
                }
            },
            {
                "jsonrpc": jsonRpcVersion,
                "method": "test",
                "id": "GUID002",
                "params": {
                    "testParam": 2
                }
            }
        ];

        var testRequest = JSON.stringify({
            "jsonrpc": jsonRpcVersion,
            "method": "bulkRequest",
            "id": bulkRequestId,
            "params": {
                "requests": requests
            }
        });

        server.runServer(function(){
            helper.connectAndAuthenticate(function authenticated(error, ws) {
                if (error) {
                    done(error);
                    return;
                }
                ws.send(testRequest);

                ws.on('message', function message(data, flags) {
                    var answer = JSON.parse(data);
                    assert(answer.id == bulkRequestId);
                    assert(!answer.error);
                    assert.equal(answer.result, true);

                    // Since we have 2 actual requests in the bulk request, this variable should be incremented twice
                    assert.equal(testCounter, 2);

                    server.close(function (error) {
                        done(error);
                    });
                });
            });
        });
    });

    it('should return an error when at least one actual request in the bulk request is invalid', function(done){

        // Since bulk request doesn't return any responses from the actual requests,
        // Let's use local variable in this test to check if all requests were successfully executed
        var testCounter = 0;
        var testMethod = function(client, params, callback) {
            testCounter++;
            callback(null, true);
        };

        var server = new RDataServer({ port: ++helper.port, dbUrl: dbUrl, exposed: {'test': testMethod }});
        var bulkRequestId = "GUIDBULKREQUEST123";
        var requests = [
            {
                "jsonrpc": jsonRpcVersion,
                "method": "test",
                "id": "GUID001",
                "params": {
                }
            },
            {
                "jsonrpc": jsonRpcVersion,
                "method": "test",
                "id": {}, // Invalid request - id must be either string or number
                "params": {
                }
            }
        ];

        var testRequest = JSON.stringify({
            "jsonrpc": jsonRpcVersion,
            "method": "bulkRequest",
            "id": bulkRequestId,
            "params": {
                "requests": requests
            }
        });

        server.runServer(function(){
            helper.connectAndAuthenticate(function authenticated(error, ws) {
                if (error) {
                    done(error);
                    return;
                }
                ws.send(testRequest);

                ws.on('message', function message(data, flags) {
                    var answer = JSON.parse(data);
                    assert(answer.id == bulkRequestId);
                    assert(answer.error);
                    assert(answer.error.code == (new JsonRpc.JsonRpcErrors.InvalidRequest()).code);

                    // Only second method should succeed, first one should generate an error
                    assert.equal(testCounter, 1);

                    server.close(function (error) {
                        done(error);
                    });
                });
            });
        });
    });



});