# Scheduler
Example of a REST API

## Usage

To run standaline, use any one of the following

    node main.js
    npm run start

To run with docker, use any one of the following

    ./run.sh
    npm run docker

To run tests, use any one of the following

    ./run test
    npm run test

## API

### GET /tasks
List all tasks.

    curl -sX GET http://127.0.0.1:8080/tasks

### POST /tasks
Add a new task.

    curl -sX POST -H "Content-Type: application/json" -d '{"name":"test"}' http://127.0.0.1:8080/tasks

### GET /task/<id>
Show details for the given task.

    curl -sX GET http://127.0.0.1:8080/task/MyhenWZ5AgKq6Fhl

### POST /task/<id>
Update the given task.

    curl -sX POST -H "Content-Type: application/json" -d '{"name":"test"}' http://127.0.0.1:8080/task/9YFMLlkPrNk3Dvoe

### DELETE /task/<id>
Remove the given task and associated alerts.

    curl -sX DELETE http://127.0.0.1:8080/task/TSgyVgevNOPUj2np

### PUT /task/<id>/<status>
Set the status of the given task.

    curl -sX PUT http://127.0.0.1:8080/task/vMJS0xqZMtVWPJS6/active

### GET /task/<id>/alerts
List the alerts associated with a given task.

    curl -sX GET http://127.0.0.1:8080/task/AtFkamcAyiOxy8qb/alerts

### POST /task/<id>/alerts
Add an alert associated with a given task.

    curl -sX POST http://127.0.0.1:8080/task/gqi5IKyHkoa2xash/alerts

### GET /task/<id>/alert/<id>
Show details for the given alert associated with a given task.

    curl -sX GET http://127.0.0.1:8080/task/A63dgL6cArOSlYW5/alert/fugnLcqjXlyIZpN3

### POST /task/<id>/alert/<id>
Update the given alert associated with a given task.

    curl -sX POST http://127.0.0.1:8080/task/jJY4G4gEILmZRNoO/alert/mLuuoHV9lha695GZ

### DELETE /task/<id>/alert/<id>
Delete the given alert associated with a given task.

    curl -sX DELETE http://127.0.0.1:8080/task/VCTeXBJdvcMnrfAK/alert/CzHl5EPD3bI1WI66

### GET /notifications
List the reminder alerts which have transpired since last visit.

    curl -sX GET http://127.0.0.1:8080/notifications