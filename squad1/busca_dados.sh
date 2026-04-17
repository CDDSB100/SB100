#!/bin/bash
volumes=("3981f78406480f966e40e2692634cb30ee35a48f224c18e56a8abc981e7b8eab" "8913cbe63111af9274fcfcd9fa2ee32972d654c1b9b678e091e13be47cc337a1" "8938d3ee87439f23fc0ec36abd2f8d96f5cf6b1c5598d4b7b6edd196a16fd8da" "squad1_mongodb_data" "squad1_mongodb_data_prod")

for vol in "${volumes[@]}"; do
  echo "--- ANALISANDO VOLUME: $vol ---"
  sudo docker run --rm -v "$vol":/data/db mongo:4.4 bash -c "
    mongod --fork --logpath /tmp/mongo.log --repair > /dev/null 2>&1
    mongod --fork --logpath /tmp/mongo.log --quiet > /dev/null 2>&1
    sleep 3
    mongo --quiet --eval '
      db.getMongo().getDBNames().forEach(function(d){
        var currDb = db.getSisterDB(d);
        currDb.getCollectionNames().forEach(function(c){
          var count = currDb.getCollection(c).count();
          print(\"  ✅ [\" + d + \"] \" + c + \": \" + count + \" docs\");
        });
      });
    '
    mongod --shutdown > /dev/null 2>&1
  " 2>/dev/null
done
