'use strict';
/* Config -------------------------------------------------------------------*/

const PORT = process.env.PORT||8080;
const nMinsBetweenAlertChecks = 1;
const nMINS = 1000*60*nMinsBetweenAlertChecks;

console.log(`NOTE: API running with check frequency of ${nMinsBetweenAlertChecks} mins
Longer time between checks will improve performance, 
but you will not be able to safely add alerts before ${nMinsBetweenAlertChecks*2} mins in the future.`);

/* Requires & Init ----------------------------------------------------------*/

//NeDB In-memory datastore
let Datastore = require('nedb')
  , db = {};
db.Alerts = new Datastore();
db.Tasks = new Datastore();

let PENDING_ALERTS = [];

//Server
let express = require('express')
  , bodyParser = require('body-parser')
  , app=express();

// configure app to use bodyParser()
app.use(bodyParser.json());

app.listen(PORT,function(){
    console.log(`Listening on http://127.0.0.1:${PORT}/`);
})

/* API Authentication & Middleware ------------------------------------------*/

app.use(function (req, res, next){
    /* Authentication */
    //path = require('path')
    //res.status(403).send(path.join(__dirname,"403.json")
    /* Authenticated */
    next();
})

app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).send('Something broke!');
})

function ErrorHandler(cond, code, msg, req, res, log){
    cond=cond?true:false;
    msg=msg||"Internal error, try again later";

    if(cond){
        res.status(code);
        typeof msg == 'string' ? res.send(msg) : res.json(msg);

        if(log){
            console.error(`${log} in ${req.url}`);
            console.trace(Date.now());
        };
    };

    return cond;
}


/* Helper functions ---------------------------------------------------------*/

function ValidateTask(task){
    //Ensure task is named
    if(!task.name)
        return {err:(res)=>{res.status(400).json({error:"Task requires name"})}};
    
    task.status=task.status||"active";

    //Filter the fields
    return {
        name:task.name,
        desc:task.desc,
        status:task.status,
        id:task.id
    };
}

function ValidateStatus(status,res){
    let valid = ["active","inactive"];
    if(valid.indexOf(status)+1) return status;

    return {err:(res)=>{res.status(400).json({error:"Invalid status",valid})}};
}

function FormatTask(task){
    //Add fields
    task.id=task.id||task._id;
    delete task._id;

    task.details_uri_get = `/task/${task.id}`;
    task.remove_uri_delete = `/task/${task.id}`;
    task.update_uri_post = `/task/${task.id}`;
    task.alerts_uri_get = `/task/${task.id}/alerts`;

    //Return
    return task;
}

function FormatTaskList(tasks){
    //Format fields
    tasks=tasks.map((v,i,a)=>{
        return {
            name:v.name,
            status:v.status,
            id:v.id||v._id
        };
    });

    //Return
    return tasks;
}

function ValidateAlert(alert){
    //Check that related task exists
    if( !alert.task_id )
        return {err:(res)=>{res.status(400).json({error:"Alert requires valid task_id"})}};

    //Check that time is valid and in future
    if( !alert.time )
        return {err:(res)=>{res.status(400).json({error:"Alert requires valid time"})}};
    if( alert.time < Date.now() )
        return {err:(res)=>{res.status(400).json({error:"Alert requires time after "+Date.now()+2*nMINS})}};

    return alert;
}

function FormatAlert(alert){
    alert.id=alert.id||alert._id;
    delete alert._id;
    alert.details_uri_get = `/task/${alert.task_id}/alert/${alert.id}`;
    alert.update_uri_post = `/task/${alert.task_id}/alert/${alert.id}`;
    alert.remove_uri_delete = `/task/${alert.task_id}/alert/${alert.id}`;
    return alert;
}

function FormatAlertList(alerts){
    //Format fields
    alerts=alerts.map((v,i,a)=>{
        return {
            time:v.status,
            id:v.id||v._id
        };
    });

    //Return
    return alerts;
}

/* API Endpoints ------------------------------------------------------------*/

//GET:/tasks
//List the tasks in the DB
//Expects no args
//Returns list of all tasks
app.get('/tasks',function (req, res, next){
    db.Tasks.find({}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
        if(err) return

        //Format matching tasks
        let tasks=FormatTaskList(docs)

        //Send JSON reply
        res.status(200).json({TASKS:tasks})
    });
});

//POST:/tasks
//Enter a single task into the DB
//Expects a valid task object
//Returns the task
app.post('/tasks',function (req, res, next){
    //Business logic
    let task = ValidateTask(req.body)
    if(task.err)    return task.err(res)

    db.Tasks.insert(task, function (err, newDoc) {
        //Handle DB Errors
        err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
        if(err) return

        //Format the task, send JSON reply
        task.id=newDoc._id;
        task=FormatTask(task)

        res.status(200).json({TASK:task})
    });
});


//GET:/task/:id
//Get details about a task
//Expects a task ID
//Returns task details
app.get('/task/:id',function (req, res, next){
    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        let task=FormatTask(docs[0])

        //Send JSON reply
        res.status(200).send({TASK:task})
    });
});

//POST:/task/:id
//Update a single task in the DB
//Expects a valid task object
//Returns the task
app.post('/task/:id',function (req, res, next){
    //Business logic
    let task = ValidateTask(req.body)
    if(task.err)    return task.err(res)

    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        db.Tasks.update({_id:req.params.id}, task, {}, function (err, numReplaced) {
            //Handle DB Errors
            err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
            if(err) return

            task=FormatTask(task)

            //Send JSON reply
            res.status(200).send({TASK:task})
        });
    });
});

//DELETE:/task/:id
//Remove a task
//Expects a task ID
//Returns success or error
app.delete('/task/:id',function (req, res, next){
    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        //Business logic, user permissions, etc

        db.Tasks.remove({ _id:req.params.id}, {}, function (err, numRemoved) {
            //Handle DB Errors
            err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
            if(err) return

            //Send JSON reply
            res.status(200).send({message:"done"})
        });
    });
});

//PUT:/task/:id/:status
//Set the status of a task
//Expects a task ID and valid status
//Returns success or error
app.put('/task/:id/:status',function (req, res, next){
    //Business logic
    let status = ValidateStatus(req.params.status, res)
    if(status.err) return status.err(res)

    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        let task = docs[0]
        task.status = status

        db.Tasks.update({_id:req.params.id}, task, {}, function (err, numReplaced) {
            //Handle DB Errors
            err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
            if(err) return

            task=FormatTask(task)

            //Send JSON reply
            res.status(200).send({TASK:task})
        });
    });
});

//GET:/task/:id/alerts
//Get list of alerts for a task
//Expects a task ID
//Returns list of alerts
app.get('/task/:id/alerts',function (req, res, next){
    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        db.Alerts.find({task_id:req.params.id}, function (err, docs){
            //Handle DB Errors
            err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
            if(err) return

            let alerts=FormatAlertList(docs)

            //Send JSON reply
            res.status(200).send({ALERTS:alerts})
        });
    });
});

//POST:/task/:id/alerts
//Add an alert to a task
//Expects a task ID
//Returns the alert
app.post('/task/:id/alerts',function (req, res, next){

    //Business logic
    let alert = req.body
    alert.task_id = req.params.id
    alert = ValidateAlert(alert)
    if(alert.err) return alert.err(res)

    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        db.Alerts.insert(alert, function (err, newDoc) {
            //Handle DB Errors
            err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
            if(err) return

            //Format the task, send JSON reply
            alert.id=newDoc._id;
            alert=FormatAlert(alert)

            res.status(200).json({ALERT:alert})
        });
    });
});


//GET:/task/:id/alert/:aid
//Get details of an alert for a task
//Expects a task ID and alert ID
//Returns the alert
app.get('/task/:id/alert/:aid',function (req, res, next){
    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        db.Alerts.find({_id:req.params.aid, task_id:req.params.id}, function (err, docs){
            //Handle DB Errors
            err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
            err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
            err|=ErrorHandler(docs.length<1, 404, {error:"No such Alert"}, req, res)
            if(err) return

            let alert=FormatAlert(docs[0])

            //Send JSON reply
            res.status(200).send({ALERT:alert})
        });
    });
});


//POST:/task/:id/alert/:aid
//Update an alert to a task
//Expects a task ID, alert ID and valid alert
//Returns the alert
app.post('/task/:id/alert/:aid',function (req, res, next){

    //Business logic
    let alert = req.body
    alert.task_id = req.params.id
    alert = ValidateAlert(alert)
    if(alert.err) return alert.err(res)

    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        //Ensure correct foreign key
        alert.task_id = req.params.id

        db.Alerts.find({task_id:req.params.id, _id:req.params.aid}, function (err, docs){
            //Handle DB Errors
            err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
            err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
            err|=ErrorHandler(docs.length<1, 404, {error:"No such Alert"}, req, res)
            if(err) return

            db.Alerts.update({task_id:req.params.id, _id:req.params.aid}, alert, {}, function (err, numReplaced) {
                //Handle DB Errors
                err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
                if(err) return

                alert=FormatAlert(alert)

                //Send JSON reply
                res.status(200).send({ALERT:alert})
            });
        });
    });
});

//DELETE:/task/:id/alert/:aid
//Remove an alert from a task
//Expects a task ID and alert ID
//Returns success or error
app.delete('/task/:id/alert/:aid',function (req, res, next){
    db.Tasks.find({_id:req.params.id}, function (err, docs){
        //Handle DB Errors
        err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
        err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
        err|=ErrorHandler(docs.length<1, 404, {error:"No such Task"}, req, res)
        if(err) return

        //Business logic, user permissions, etc

        db.Alerts.find({task_id:req.params.id, _id:req.params.aid}, function (err, docs){
            //Handle DB Errors
            err=ErrorHandler(err,            500, null, req, res, `DBError ${err}`)
            err|=ErrorHandler(docs.length>1, 500, null, req, res, `DataError >1`)
            err|=ErrorHandler(docs.length<1, 404, {error:"No such Alert"}, req, res)
            if(err) return

            db.Alerts.remove({task_id:req.params.id, _id:req.params.aid}, {}, function (err, numRemoved) {
                //Handle DB Errors
                err=ErrorHandler(err, 500, null, req, res, `DBError ${err}`)
                if(err) return

                //Send JSON reply
                res.status(200).send({message:"done"})
            });
        });
    });
});

//GET:/notifications
//List alerts for expired schedules
//Expects no args
//Returns list of alerts
app.get('/notifications',function (req, res, next){
    //Send JSON reply
    res.status(200).json({ALERTS:PENDING_ALERTS})
    PENDING_ALERTS=[]
});

/* Scheduled alerts ---------------------------------------------------------*/

//Every 1 minutes, queue up all the upcoming alerts
queue();
setInterval(queue,nMINS);

function queue(){
    let now = Date.now()
    let soon= Date.now()+nMINS

    db.Alerts.find({ time: { $exists: true, $gte: now, $lte: soon } }, function (err, docs) {
        //Handle DB Errors
        err=ErrorHandler(err, 0, null, null, null, `DBError ${err}`)
        if(err) return

        //Set the schedules to alert
        for(var i in docs){
            db.Tasks.find({_id:docs[i].task_id}, function (err, docs) {
                err=ErrorHandler(err, 0, null, null, null, `DBError ${err}`)
                err=ErrorHandler(docs.length>1, 0, null, null, null, `DataError >1`)
                err=ErrorHandler(docs.length<1, 0, null, null, null, `DataError <1`)
                if(err) return

                if(docs[0].status=='active') setTimeout(schedule_alert, now-docs[i].time, docs[i])
            });
        };
    });
}

function schedule_alert(doc){
    let alert=`SCHEDULED ALERT
    Name: ${doc.name}
    ${doc.desc||'No description.'}
    Details: /task/${doc.id||doc._id}`

    db.Alerts.remove(doc, {}, function (err, numRemoved) {
        //Handle DB Errors
        err=ErrorHandler(err, 0, null, null, null, `DBError ${err}`)
        if(err) return
    });

    console.log(alert)
    PENDING_ALERTS.push(alert)
}