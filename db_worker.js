const MongoClient = require('mongodb').MongoClient;


const url = 'mongodb://localhost:27017';
const dbName = 'crypto_db';


// const client = new MongoClient(url);

let db;

MongoClient.connect(url, function(err, client) {
    console.log('Connected successfully to server');
  
    db = client.db(dbName);
    // removeKey('123').then(() => {
    //     createKey('123').catch(console.error);
    // }).catch();
    // setUsed('123', '321').catch();
    // getKeyData('hello_world').then(console.log).catch();
    checkKey("kjnfsa").then(console.log);
    
});


const checkKey = function(key) {
    const promise = new Promise((res, rej) => {
        isKeyExist(key).then(isExist => {
            if (!isExist) {
                res ({isExist: false, isUsed: false});
            }
            else {
                getKeyData(key).then(res);
            }
        });
    });
    return promise;
}

const isKeyExist = function (key) {

    const collection = db.collection('passwords');
    const promise = new Promise((res, rej) => {
        collection.find({key}).toArray((err, data) => {
            if (data.length === 0) {
                res(false);
            }
            else {
                res(true);
            }
        }); 

    });
    return promise;

} 
const createKey = function(key) {
    const collection = db.collection('passwords');
    const promise = new Promise((res, rej) => {
        isKeyExist(key).then(isExists => {

            if (isExists) {
                rej('already exists');
            }
            else {
                collection.insertOne({key, isUsed: false, userId: null, messages: []});
                res(true);
            }
        }).catch (console.error); 

    });
    return promise;
}


const removeKey = function(key) {
    const collection = db.collection('passwords');
    const promise = new Promise((res, rej) => {
        collection.deleteOne({key}, (err, result) => {
            err && rej(err);
            result && res(true);
        });
    });
    return promise;
}


const setUsed = function(key, id) {
    const collection = db.collection('passwords');
    const promise = new Promise((res, rej) => {
        collection.updateOne({key}, {$set: {isUsed: true, userId: id}}, (err, result) => {
            err && rej(err);
            result && res(true);
        });
    });
    return promise;
}

const getKeyData = function (key) {
    const collection = db.collection('passwords');
    const promise = new Promise((res, rej) => {
        collection.findOne(({key}, (err, data) => {
            if (!data) {
                res({});
            }
            else {
                res(data);
            }
        })); 

    });
    return promise;

}


const loginById = function (key, id) {
    const promise = new Promise((res, rej) => {
        findInDb('passwords', {key}, (err, data) => {
            console.log(data);
            if (!data) {
                rej(false);
                return;
            }
            if (data.key === key && +data.userId === id) {
                res(true);
            }
            else {
                res(false);
            }
        });
         

    });
    return promise;
}


const writeToDb = function (collectionName, data, callback) {
    const collection = db.collection(collectionName);
    if (!Array.isArray(data)) {
        collection.insertOne(data);
    }
    else {
        collection.insertMany(data);
    }
    callback();
}
const findInDb = function(collectionName, findBy, callback) {
    const collection = db.collection(collectionName);
    collection.findOne(findBy, callback);
}
const updateDbField = function(collectionName, findBy, data, callback) {
    const collection = db.collection(collectionName);
    collection.updateOne(findBy, {$set: {data}}, callback);
}
const removeFromDb = function(collectionName, findBy, callback) {
    const collection = db.collection(collectionName);
    db.delete(findBy, callback);
}
const getDb = () => db;
module.exports = {
    getDb,
    checkKey,
    isKeyExist,
    createKey,
    removeKey,
    setUsed,
    getKeyData,
    loginById,
    writeToDb,
    findInDb,
    updateDbField,
    removeFromDb
}