#Declarations
clean(){
    #Silently stop the container if it exists
    sleep 1
    docker kill Scheduler-App &>/dev/null
    sleep 1
    docker rm Scheduler-App &>/dev/null
}

#Clean up
clean
docker wait Scheduler-App &>/dev/null
sleep 5

#Start the app in a container
#Note sh -c allows ^C to kill
(docker run -i --rm --name Scheduler-App \
    -p 127.0.0.1:8080:8080 -e "PORT=8080" \
    -v "$PWD":/usr/src:Z -w /usr/src node:4 \
    sh -c "node main.js" )&

#Wait for container to listen on host:8080
echo "Waiting for app to start..."
active=0
for i in {1..10}
do
    sleep 3
    echo -n "."
    nc -z 127.0.0.1 8080
    if [ $? = 0 ]; then
        active=1; break
    fi
done

echo ""

if [ $active != 1 ]; then
    echo "Timed out pinging container"
    clean
    exit
fi

#Test if called with option
if [[ $1 = "test" ]]; then
    docker exec -i Scheduler-App node ./e2e.js
    clean
else 
    wait
fi 

#Done
clean
exit 0