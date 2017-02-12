'use strict';

/* Setup --------------------------------------------------------------------*/
var http = require('http');

function request(meth, path, cb, data) {
    data = typeof data == "string" ? data : JSON.stringify(data)
    
    var options = {
        host: '127.0.0.1',
        port: '8080',
        path: path,
        method: meth,
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': (data||'').length
        }
    };

    // Set up the request
    let buffer=''
    let req = http.request(options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            buffer+=chunk;
        });
        res.on('end', function () {
            cb(buffer)
        });
    });

    if(data)req.write(data)
    req.end()
}

/* Tests --------------------------------------------------------------------*/

//Create list of tests using curry syntax to avoid deep callbacks
let tests=[
    next=>(ctx)=>{
        console.log("Testing empty notifications")
        request('GET', '/notifications', (data)=>{
            if( data != JSON.stringify( {ALERTS:[]} ) ) 
                console.error(`Test ${ctx.pass+1} failed`)
            ctx.pass++
            next(ctx)
        })
    },
    next=>(ctx)=>{
        console.log("Testing empty list")
        request('GET', '/tasks', (data)=>{
            if( data != JSON.stringify( {TASKS:[]} ) ) 
                console.error(`Test ${ctx.pass+1} failed`)
            ctx.pass++
            next(ctx)
        })
    },
    next=>(ctx)=>{
        console.log("Testing add task")
        request('POST', '/tasks', (data)=>{
            try {
                data=JSON.parse(data)
                let id=data.TASK.id
                let status=data.TASK.status

                if(data.TASK.name!=`test`)throw 1
                if(data.TASK.details_uri_get!=`/task/${id}`)throw 2
                if(data.TASK.remove_uri_delete!=`/task/${id}`)throw 3
                if(data.TASK.update_uri_post!=`/task/${id}`)throw 4
                if(data.TASK.alerts_uri_get!=`/task/${id}/alerts`)throw 5

                ctx.pass++
                ctx.task=id
                next(ctx)
            } catch (e) {
                console.error(`Test ${ctx.pass+1} failed on: ${e}`)
            }
        }, {"name":"test"})
    },
    next=>(ctx)=>{
        console.log("Testing update task")
        request('POST', `/task/${ctx.task}`, (data)=>{
            try {
                data=JSON.parse(data)
                let id=data.TASK.id
                let status=data.TASK.status

                if(data.TASK.name!=`test`)throw 1
                if(data.TASK.details_uri_get!=`/task/${id}`)throw 2
                if(data.TASK.remove_uri_delete!=`/task/${id}`)throw 3
                if(data.TASK.update_uri_post!=`/task/${id}`)throw 4
                if(data.TASK.alerts_uri_get!=`/task/${id}/alerts`)throw 5

                ctx.pass++
                next(ctx)
            } catch (e) {
                console.error(`Test ${ctx.pass+1} failed on: ${e}`)
            }
        }, {"name":"test","desc":"Updated"})
    },
    next=>(ctx)=>{
        console.log("Testing get task")
        request('GET', `/task/${ctx.task}`, (data)=>{
            try {
                data=JSON.parse(data)
                let id=data.TASK.id
                let status=data.TASK.status

                if(data.TASK.name!=`test`)throw 1
                if(data.TASK.desc!=`Updated`)throw 2
                if(data.TASK.details_uri_get!=`/task/${id}`)throw 3
                if(data.TASK.remove_uri_delete!=`/task/${id}`)throw 4
                if(data.TASK.update_uri_post!=`/task/${id}`)throw 5
                if(data.TASK.alerts_uri_get!=`/task/${id}/alerts`)throw 6

                ctx.pass++
                next(ctx)
            } catch (e) {
                console.error(`Test ${ctx.pass+1} failed on: ${e}`)
            }
        }, {"name":"test"})
    },
    (ctx)=>{
        console.log(`${ctx.pass} tests pass.`)
    }
]

//Generate test sequence from each curried test case
for(let i=tests.length-1;i>0;i--)
    tests[i-1]=tests[i-1](tests[i])

//Call test chain with an empty context
tests[0]({pass:0})