const mongoose = require("mongoose");


/* ========= CONNECT TO DATABASE ========= */

connectMongoose().catch(err => console.log(err));

async function connectMongoose() {
    const DATABASE_NAME = "todolistDB";
    mongoose.set("strictQuery", false);
    await mongoose.connect('mongodb://127.0.0.1:27017/' + DATABASE_NAME);
}


/* ======= CREATE MODELS AND SCHEMAS ======= */

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    email: String,
    rmDate: {
        type: Date,
        default: null
    }
});

const User = new mongoose.model('user', userSchema);


const listSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: Date,
    rmDate: {
        type: Date,
        default: null
    },
    user: {
        type: userSchema,
        required: true
    }
});

const List = new mongoose.model('List', listSchema);


const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    rmDate: {
        type: Date,
        default: null
    },
    list: {
        type: listSchema,
        required: true
    }
});

const Item = new mongoose.model('Item', itemSchema);



/* ================ CONSTRAINTS ================ */

const DTOStatus = {
    unmodified: 0,
    new: 1,
    modified: 2,
    removed: 3
}

exports.DTOStatus = DTOStatus;

const LogInStatus = {
    loggedin: 0,
    userNotFound: 1,
    error: 2
}

exports.LogInStatus = LogInStatus;


/* ==== CREATE DTO CONSTRUCTORS AND EXPORTS ==== */

class UserDTO {
    constructor(id, name, status) {
        this.id = String(id);
        this.name = String(name);
        this.status = status;
    }
}

class ListDTO {
    constructor(id, name, userId, date, items, status) {
        this.id = String(id);
        this.name = String(name);
        this.userId = String(userId);
        this.date = date;
        this.items = items;
        this.status = status;
    }
}

class ItemDTO {
    constructor(id, name, status) {
        this.id = String(id);
        this.name = String(name);
        this.status = status;
    }
}



// Export DTO constructors

function createListDTO(name, userId, date, items) {
    return new ListDTO('', name, userId, date, items, DTOStatus.new);
}

createItemDTO = function (name) {
    return new ItemDTO('', name, DTOStatus.new);
}



/* ===== EXPORT CRUD OPERATIONS ===== */

function getUser(name, password) {

    return new Promise((resolve, reject) => {

        User.findOne({ name: name, password: password, rmDate: null }, function (error, user) {

            if (error) {
                resolve(new UserDTO('', name, LogInStatus.error));

            } else if (user === null) {
                resolve(new UserDTO('', name, LogInStatus.userNotFound));

            } else {
                resolve(new UserDTO(user.id, user.name, LogInStatus.loggedin));

            }
        })
    });
}



function getAllUserLists (userDTO) {

    return new Promise((resolve, reject) => {
        
        User.findOne({_id: userDTO.id, rmDate: null}, function(userError, user){

            if (userError) {
                reject(userError);

            } else if (user === null) {
                reject ('user ' + userDTO.name + 'not found');

            } else {
                const listDTOs = [];

                List.find({ user: user, rmDate: null }, function (listError, lists) {
            
                    if (listError) {
                        reject(listError);
            
                    } else {
                        const itemPromises = [];
            
                        lists.forEach(list => {
                            
                            const itemDTOs = [];
            
                            itemPromises.push(new Promise((res, rej) => {
            
                                Item.find({ list: list, rmDate: null }, function (err, items) {
            
                                    if (err) {
                                        rej(err);
            
                                    } else {
                                        items.forEach(item => {
                                            itemDTOs.push(new ItemDTO(item.id, item.name, DTOStatus.unmodified));
                                        });
            
                                        listDTOs.push(new ListDTO(list.id, list.name, user.id, list.date, itemDTOs, DTOStatus.unmodified));
                                        res();
                                    }
            
                                });
            
                            }));
                        });
            
                        Promise.all(itemPromises).then(function () {
                            resolve(listDTOs);
                        });
                    }
            
                });
            }
        });
    });
}

getListByName = function (listName) {

    let listDTO;
    let itemsDTO = [];

    return new Promise((res, rej) => {

        List.find({ name: listName, rmDate: null }, function (err, lists) {

            if (err) {
                rej(err);

            } else if (lists.length === 0) {
                console.log("list " + listName + " not found");

                res(undefined);

            } else {
                let list = lists[0];

                Item.find({ list: list, rmDate: null }, function (error, items) {

                    if (error) {
                        rej(error);

                    } else {
                        items.forEach(item => {
                            itemsDTO.push(new ItemDTO(item.id, item.name,
                                DTOStatus.unmodified));
                        });

                        listDTO = new ListDTO(list.id, list.name, list.date,
                            itemsDTO, DTOStatus.unmodified);

                        res(listDTO);
                    }

                });

            }

        });

    });
}


saveList = function (listDTO) {

    if (listDTO.status === DTOStatus.new) {
        console.log('creating list');
        createList(listDTO);

    } else if (listDTO.status === DTOStatus.modified) {
        console.log('modifying list');
        modifyList(listDTO);

    } else if (listDTO.status === DTOStatus.removed) {
        console.log('removing list');
        removeList(listDTO);
    }

}

/* === SAVE LIST AUXILIARY OPERATIONS === */

function createList(listDTO) {

    return new Promise((resolve, reject) => {

        User.findOne({ _id: listDTO.userId, rmDate: null }, function (userError, user) {

            if (userError) {
                reject(userError);

            } else if (user === null) {
                reject('user not found: id ' + listDTO.userId);

            } else {
                const list = new List({ name: listDTO.name, date: listDTO.date, user: user });

                Promise.all([list.save()]).then(function () {

                    console.log('list created: ' + list.name);

                    listDTO.items.forEach(itemDTO => {
                        const item = new Item({ name: itemDTO.name, list: list });
                        item.save().then(function () {
                            console.log("Item created: " + item.name);
                        });
                    });

                    resolve('list created: ' + list.name);
                });

            }

        });
    })

}


function modifyList(listDTO) {

    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id, rmDate: null }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else {

                list.name = listDTO.name;
                list.date = listDTO.date;

                listDTO.items.forEach(itemDTO => {

                    if (itemDTO.status === DTOStatus.new) {

                        const item = new Item({
                            name: itemDTO.name,
                            ckecked: itemDTO.checked,
                            list: list
                        });

                        item.save();
                        console.log('Item created: ' + item.name);
                        resolve('Item created: ' + item.name);


                    } else if (itemDTO.status === DTOStatus.modified
                        || itemDTO.status === DTOStatus.removed) {

                        Item.findOne({ _id: itemDTO.id, rmDate: null }, function (err, item) {

                            if (err) {
                                reject(err);

                            } else if (item === null) {
                                reject('item ' + itemDTO.name + ' not found.');

                            } else {

                                if (itemDTO.status === DTOStatus.modified) {
                                    item.name = itemDTO.name;
                                    item.checked = itemDTO.checked;
                                    console.log("item modified: " + item.name);

                                } else if (itemDTO.status === DTOStatus.removed) {
                                    item.rmDate = new Date();
                                    console.log("item removed: " + item.name);

                                }

                                item.save();

                            }
                        });
                    }
                });
            }
        });
    })
}


function removeList(listDTO) {

    return new Promise((resolve, reject) => {

        List.findOne({ _id: listDTO.id, rmDate: null }, function (err, list) {

            if (err) {
                console.log(err);
                reject(err);

            } else if (list === null) {
                console.log('list not found');
                reject("list " + listDTO.name + " not found");

            } else {
                list.rmDate = new Date();
                console.log("list " + listDTO.name + " was removed");

                Promise.all([list.save()]).then(function (value) {
                    resolve("list " + listDTO.name + " was removed");
                })
            }
        });
    });

}


function getStringDate(date) {

    const options = {
        weekday: "long",
        day: "numeric",
        month: "long"
    };

    return date.toLocaleDateString("en-US", options);

};

exports.getStringDate = getStringDate;




/* INITIALIZE DATABASE */

// const testUser = new User({name: 'test', password: 'test'});
// testUser.save();

// const testUser = User.findOne({name: 'test'}, function(err, user){
//     // console.log(user);
//     const testList = new List({name: 'list1', date: new Date(), user: user});
//     testList.save();
// });

// List.findOne({name: 'list1'}, function(err, list){
// const testItem = new Item({name: 'testItem1', list: list});
// testItem.save();
// })




/* TEST TRANSACTIONS */

// let listDTOsample = getListByName("Wednesday, February 1");
// let listDTOsample = getListByName(getStringDate(new Date()));

// listDTOsample.then(function (value) {
// console.log(value);
// const itemDTO = new ItemDTO('', 'vanilla3', false);
// addItemToList(value, itemDTO);
// rm = removeItemFromList(value.items[value.items.length - 1]);
// rm.then(function (ret) {
// console.log(rm);
// })
// })

// const listDTO = new ListDTO("", getStringDate(today), today, 'test', items, DTOStatus.new);
// const listDTO = new ListDTO("", 'test', today, 'test', items);
// saveList(listDTO);


/*
const items = [
    createItemDTO('pear'),
    createItemDTO('banana'),
    createItemDTO('peach'),
    createItemDTO('apple')
]

// const newItem = createItemDTO('orange');
/* 
getListByName('fruits').then(function (list) {
    // list.items.push(newItem);
    list.status = DTOStatus.removed;
    // list.items[0].name = 'orange';
    // list.items[0].status = DTOStatus.removed; 

    // console.log(list);
    saveList(list);
});
 */

/* 
getListByName('fruits').then(function (list) {
    
   list.items.forEach(item => {
    console.log(item.name);
   }); 
});
 */
/* 
getAllLists().then(function (lists) {
    lists.forEach(list => {
        console.log(list.items);
    });
})

 */





/* 
getUser('test', 'test').then(function (userDTO) {
    if (userDTO.status === LogInStatus.loggedin) {
        // const listDTO = createListDTO('testList2', userDTO.id, new Date(), []);
        // saveList(listDTO);

        getAllUserLists(userDTO).then(function(listDTOs){
            console.log(listDTOs);
        });
    }
}); */